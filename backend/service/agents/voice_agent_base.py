from service.model import HuggingFaceGemma3nClient
from service.utils.wav_utils import load_audio_from_file


class VoiceAgentBase:
    def __init__(self):
        self.model = HuggingFaceGemma3nClient()

    def construct_model_messages(self, audio_path: str, system_msg: str):
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "audio",
                        "audio": load_audio_from_file(file_path=audio_path),
                    },
                ],
            },
            {
                "role": "system",
                "content": [{"type": "text", "text": system_msg}],
            },
        ]
