import logging
import json


logger = logging.getLogger(__name__)


def extract_memory_json(raw_memory_string: str) -> dict:
    try:
        if not raw_memory_string or raw_memory_string.strip() == "":
            logging.error("Empty memory content received")
            return

        cleaned_content = raw_memory_string.strip()

        if cleaned_content.startswith("Output:"):
            cleaned_content = cleaned_content.replace("Output:", "").strip()

        # Handle JSON wrapped in markdown code blocks
        if "```json" in cleaned_content:
            start = cleaned_content.find("```json") + 7
            end = cleaned_content.find("```", start)
            if end != -1:
                cleaned_content = cleaned_content[start:end].strip()
        elif "```" in cleaned_content:
            start = cleaned_content.find("```") + 3
            end = cleaned_content.find("```", start)
            if end != -1:
                cleaned_content = cleaned_content[start:end].strip()

        store_memory_msg = json.loads(cleaned_content)
        return store_memory_msg
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.error(f"Raw content was: '{raw_memory_string}'")
        return {}
