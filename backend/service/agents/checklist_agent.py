from typing import TypedDict, Annotated, List
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph
from langchain_core.messages import AIMessage
from langfuse.langchain import CallbackHandler
from pydantic import BaseModel
from enum import Enum
import json
import logging
from ddgs import DDGS

from service.data_models.onboarding import (
    PrimaryMember,
    DependentMember,
    Disaster,
    Gender,
    OnboardingRequest,
)
from service.model.ollama_client import LangchainOllamaGemmaClient
from service.utils.checklist_store import ChecklistStore


logger = logging.getLogger(__name__)


class Phase(Enum):
    PRE = "pre"
    POST = "post"


class UserInfo(BaseModel):
    primary_user: PrimaryMember
    dependents: list[DependentMember]


class ChecklistAgentState(TypedDict):
    messages: Annotated[List, add_messages]
    user_info: UserInfo
    phase: Phase
    disaster: Disaster
    search_queries: list[str]
    search_results: list[str]
    iterations: int
    max_iterations: int
    final_checklist: list[str]


class ChecklistBuilderAgent:
    def __init__(self):
        self.max_iterations = 3

        self.llm = LangchainOllamaGemmaClient().model
        self.checklist_store = ChecklistStore()

        self.graph = self.__create_graph()

    def __create_graph(self):
        builder = StateGraph(ChecklistAgentState)

        builder.add_node("orchestrator", self.__orchestrator_node)
        builder.add_node("search", self.__search_node)
        builder.add_node("final_checklist", self.__final_checklist_node)

        builder.set_entry_point("orchestrator")
        builder.add_edge("orchestrator", "search")
        builder.add_conditional_edges(
            "search",
            self.__should_continue,
            {"continue": "orchestrator", "finish": "final_checklist"},
        )
        builder.set_finish_point("final_checklist")

        return builder.compile()

    def __orchestrator_node(self, state: ChecklistAgentState) -> ChecklistAgentState:
        stage_info = ""
        if state["phase"] == Phase.PRE:
            stage_info = "They are preparing for an approaching "
        else:
            stage_info = "They have been struck by "

        system_prompt = f"""
        You are a disaster relief agent who specializes in building disaster preparedness or post disaster checklists.
        A checklist is just a list of strings containing important things to keep. To prepare this checklist, you are given user information:
        {state['user_info'].model_dump_json()}

        {stage_info}{state['disaster']}.

        You NEED to use the information about the user and their dependents (if any) and perform web search to get information specific to their case.
        You also NEED to foucs on the disaster and ONLY find relevant information to that.

        In order to perform a web search you NEED to return:
        {{
            "action": "search",
            "query": "Your specific query using keywords you extracted from user info or previous search results"
        }}

        If you think you have enough information you need to return a final answer with checklist:
        {{
            "action": "final_answer",
            "checklist": ["thing 1 that you think is useful to have based on all information", "other thing 2 based on all information"]
        }}

        You MUST stick to the JSON format specified above, the action MUST be the same, the only thing you need to change is query and checklist.

        These are your previous search queries: {state['search_queries']}
        These are the results for those queries: {state['search_results']}

        If you are doing web search for the first time, you NEED to use the user info. For subsequent web searches you also NEED to use the previous search results, adding anything important that you might have found in those.
        
        The ONLY thing you are allowed to return are either of the two action JSONs. There should be NO extra character in your result. And the keys SHOULD match EXACTLY as given above.
        Another IMPORTANT point is that, you should not return a comma separated string, but return individual items as strings inside a list.
        """

        messages = state["messages"] + [{"role": "system", "content": system_prompt}]

        response = self.llm.invoke(messages)

        messages.append(AIMessage(content=response.content))

        return {**state, "messages": messages}

    def __search_node(self, state: ChecklistAgentState) -> ChecklistAgentState:
        last_message = state["messages"][-1].content

        if "{" in last_message and "}" in last_message:
            start = last_message.find("{")
            end = last_message.rfind("}")

            only_json_message = last_message[start : end + 1]

            try:
                operation = json.loads(only_json_message)
                action = operation.get("action", None)
                query = operation.get("query", None)
                checklist = operation.get("checklist", None)
                if action is not None and query is not None:
                    logger.info(
                        f"Found search action, performing web search for query: '{query}'"
                    )
                    with DDGS() as ddgs:
                        search_results = list(ddgs.text(query, max_results=5))

                    search_results_formatted = "\n".join(
                        [
                            f"Title:{result.get("title", "")}\nSnippet:{result.get("body", "")}\nLink:{result.get("href", "")}\n"
                            for result in search_results
                        ]
                    )

                    search_queries = state["search_queries"]
                    search_queries.append(query)

                    search_results = state["search_results"]
                    search_results.append(search_results_formatted)

                    return {
                        **state,
                        "search_queries": search_queries,
                        "search_results": search_results,
                        "iterations": state.get("iterations", 0) + 1,
                    }
                elif action is not None and checklist is not None:
                    return {**state, "final_checklist": checklist}
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON: {only_json_message}")

        return {**state, "iterations": state.get("iterations", 0) + 1}

    def __should_continue(self, state: ChecklistAgentState) -> str:
        if state["iterations"] >= state["max_iterations"]:
            logger.info(
                f"Exhausted all {state['max_iterations']} iterations, wrapping up."
            )
            return "finish"

        last_message = state["messages"][-1].content
        if "action" in last_message and "search" in last_message:
            return "continue"
        else:
            return "finish"

    def __final_checklist_node(self, state: ChecklistAgentState) -> ChecklistAgentState:
        last_message = state["messages"][-1].content

        final_checklist = []
        if "action" in last_message and "final_answer" in last_message:
            logger.info("Found a final checklist generated.")

            if "{" in last_message and "}" in last_message:
                start = last_message.find("{")
                end = last_message.rfind("}")

                only_json_message = last_message[start : end + 1]

                try:
                    operation = json.loads(only_json_message)
                    del operation["action"]
                    final_checklist.extend(list(operation.values())[-1])
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON: {only_json_message}")

        return {**state, "final_checklist": final_checklist}

    def build_checklist(self, user_details: OnboardingRequest, phase: str):
        user_info = UserInfo(
            primary_user=user_details.primaryUserDetails,
            dependents=user_details.dependentUserDetails,
        )

        phase_enumed = Phase.PRE if phase == "pre" else Phase.POST

        initial_state = {
            "messages": [],
            "user_info": user_info,
            "phase": phase_enumed,
            "disaster": user_details.selectedDisasters[0],
            "search_queries": [],
            "search_results": [],
            "iterations": 0,
            "max_iterations": self.max_iterations,
            "final_checklist": [],
        }

        langfuse_handler = CallbackHandler()

        final_state = self.graph.invoke(
            initial_state, config={"callbacks": [langfuse_handler]}
        )

        final_checklist = final_state["final_checklist"]
        if final_checklist:
            self.checklist_store.save_checklist(
                disaster_type=user_details.selectedDisasters[0].value,
                phase=phase,
                checklist=final_checklist,
            )

        return final_checklist
