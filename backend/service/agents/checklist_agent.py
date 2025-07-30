from typing import TypedDict, Annotated, List
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph
from langchain_core.messages import AIMessage
from langfuse.langchain import CallbackHandler
from pydantic import BaseModel
from enum import Enum
import json
import logging
import asyncio
from ddgs import DDGS

from service.data_models.onboarding import (
    PrimaryMember,
    DependentMember,
    Disaster,
    OnboardingRequest,
    Phase,
)
from service.model.ollama_client import LangchainOllamaGemmaClient
from service.utils.checklist_store import ChecklistStore
from service.utils.prompt_store import SystemPromptStore
from service.utils.constants import CHECKLIST_AGENT_SYS_PROMPT_KEY


logger = logging.getLogger(__name__)


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

    async def __orchestrator_node(
        self, state: ChecklistAgentState
    ) -> ChecklistAgentState:
        phase = state["phase"]
        user_info = state["user_info"]
        disaster = state["disaster"]
        search_queries = state["search_queries"]
        search_results = state["search_results"]

        stage_info = ""
        if phase == Phase.PRE:
            stage_info = "They are preparing for an approaching "
        else:
            stage_info = "They have been struck by "

        system_prompt = (
            SystemPromptStore()
            .get_prompt(CHECKLIST_AGENT_SYS_PROMPT_KEY)
            .format(
                user_info_json=user_info.model_dump_json(),
                stage_info=stage_info,
                disaster=disaster,
                search_queries=search_queries,
                search_results=search_results,
            )
        )

        messages = state["messages"] + [{"role": "system", "content": system_prompt}]

        response = await self.llm.ainvoke(messages)

        messages.append(AIMessage(content=response.content))

        return {**state, "messages": messages}

    async def __search_node(self, state: ChecklistAgentState) -> ChecklistAgentState:
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

                    search_results = await self._perform_web_search_async(query)

                    search_results_formatted = "\n".join(
                        [
                            f"Title:{result.get('title', '')}\nSnippet:{result.get('body', '')}\nLink:{result.get('href', '')}\n"
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

    async def _perform_web_search_async(self, query: str) -> list:
        def _sync_search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=5))

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_search)

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

    def __parse_checklist_from_model_output(self, message: str):
        start = message.find("{")
        end = message.rfind("}")

        only_json_message = message[start : end + 1]

        try:
            operation = json.loads(only_json_message)
            del operation["action"]
            return list(list(operation.values())[-1])
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON: {only_json_message}")
            return []

    async def __final_checklist_node(
        self, state: ChecklistAgentState
    ) -> ChecklistAgentState:
        messages = state["messages"]
        last_message = state["messages"][-1].content

        final_checklist = []
        if "action" in last_message and "final_answer" in last_message:
            logger.info("Found a final checklist generated.")

            if "{" in last_message and "}" in last_message:
                checklist_parsed = self.__parse_checklist_from_model_output(
                    last_message
                )
                if checklist_parsed:
                    final_checklist.extend(checklist_parsed)
        else:
            logger.error(f"Failed to build checklist in {self.max_iterations} tries!")
            logger.info("Forcing model to generate checklist")

            system_prompt = """
            Given all the information, now YOU HAVE TO generate the checklist.

            To generate checklist, all you have to do is create a list of items based on the information above that the person needs to have in the situation.

            ALWAYS return the checklist in this format:
            {{
                "action": "final_answer",
                "checklist": ["thing 1 that you think is useful to have based on all information", "other thing 2 based on all information"]
            }}

            Only return above JSON, and NOTHING else.
            """

            messages = messages + [{"role": "system", "content": system_prompt}]
            response = await self.llm.ainvoke(messages)
            messages.append(AIMessage(content=response.content))

            last_message = response.content
            checklist_parsed = self.__parse_checklist_from_model_output(last_message)
            if checklist_parsed:
                final_checklist.extend(checklist_parsed)

        return {**state, "final_checklist": final_checklist, "messages": messages}

    async def build_checklist(
        self,
        user_details: OnboardingRequest,
        phase: str,
        disaster: Disaster,
        save_to_db: bool = True,
    ):
        user_info = UserInfo(
            primary_user=user_details.primaryUserDetails,
            dependents=user_details.dependentUserDetails,
        )

        phase_enumed = Phase.PRE if phase == "pre" else Phase.POST

        initial_state = {
            "messages": [],
            "user_info": user_info,
            "phase": phase_enumed,
            "disaster": disaster,
            "search_queries": [],
            "search_results": [],
            "iterations": 0,
            "max_iterations": self.max_iterations,
            "final_checklist": [],
        }

        langfuse_handler = CallbackHandler()

        final_state = await self.graph.ainvoke(
            initial_state, config={"callbacks": [langfuse_handler]}
        )

        final_checklist = final_state["final_checklist"]
        if final_checklist and save_to_db:
            await self._save_checklist_async(disaster.value, phase, final_checklist)

        return final_checklist

    async def _save_checklist_async(
        self, disaster_type: str, phase: str, checklist: list
    ):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self.checklist_store.save_checklist,
            disaster_type,
            phase,
            checklist,
        )
