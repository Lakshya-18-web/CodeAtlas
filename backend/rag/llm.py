import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

MODEL_NAME = "gemini-3.6-flash"


class GeminiLLM:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")

        self.client = genai.Client(api_key=api_key)
        self.model = MODEL_NAME

    def generate(self, prompt):
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )

        # Get only the actual answer text.
        # Gemini 3 can return thinking parts separately.
        answer_parts = []

        if response.candidates:
            candidate = response.candidates[0]

            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if getattr(part, "thought", False):
                        continue

                    if getattr(part, "text", None):
                        answer_parts.append(part.text)

        answer = "\n".join(answer_parts).strip()

        # Fallback to the SDK's normal text property
        if not answer:
            answer = (response.text or "").strip()

        if not answer:
            print("Gemini returned no visible answer.")
            print("Finish reason:", response.candidates[0].finish_reason if response.candidates else "NO_CANDIDATE")
            print("Raw response:", response)

        return answer


def get_llm():
    return GeminiLLM()