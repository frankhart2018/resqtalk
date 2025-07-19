from service.utils.prompt_store import SystemPromptStore
from service.utils.constants import COMM_AGENT_SYS_PROMPT_KEY


# COMMUNICATION_AGENT_PROMPT = """You are a helpful assistant who is an expert in disaster management.
#             Here are some details about the user you are talking to: {info}.
#             Please give the user an appropriate reply"""
dynamic_portion = """
Also here are the details about the user you are talking to:
{info}
""".strip()


def get_prompt():
    return (
        SystemPromptStore().get_prompt(key=COMM_AGENT_SYS_PROMPT_KEY) + dynamic_portion
    )
