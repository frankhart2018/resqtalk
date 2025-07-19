from service.utils.prompt_store import SystemPromptStore
from service.utils.constants import MEMORY_AGENT_SYS_PROMPT_KEY


# MEMORY_EXTRACTION_PROMPT = """Extract important information from the user's message that should be remembered.

# Look for any factual information, preferences, names, or details that would be useful to remember in future conversations.

# Here are examples of what to extract:

# Input: "Hi! Remember: my name is Bob"
# Output: {"name": "Bob"}

# Input: "My favorite color is blue"
# Output: {"favorite_color": "blue"}

# Input: "I work at Google as a software engineer"
# Output: {"employer": "Google", "job": "software engineer"}

# Input: "The server IP is 192.168.1.100"
# Output: {"server_ip": "192.168.1.100"}

# Input: "What's the weather like?"
# Output: {}

# Input: "How are you?"
# Output: {}

# Now extract information from this message. Return only valid JSON with no extra text:"""


def get_prompt():
    return SystemPromptStore().get_prompt(key=MEMORY_AGENT_SYS_PROMPT_KEY)
