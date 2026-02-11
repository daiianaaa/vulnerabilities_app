import os
from groq import Groq
import logging

logger = logging.getLogger(__name__)

class CyberMentor:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.error("No API Key provided for Groq")
        self.client = Groq(api_key=self.api_key)

    def get_help(self, user_question, lab_type):
        """
        Context for AI Model.
        """
        system_prompt = f"""
        You are a cybersecurity expert and a pacient mentor for students.
        Actual context: The student is working at a laboratory of type: '{lab_type}'.
        
        REGULI:
        1. Answer short and on point(max 2-3 phrases)
        2. Do not ofer the direct solution.
        3. Give theoretical hints or logical steps which will be followed by the student.
        4. If the student asks something irelevant (cooking, weather, etc) politely refuse its request and comeback at security.
        5. Use Markdown (bold, code blocks) where it's needed.
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_question}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.5,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq Error: {e}")
            return "I'm unavailable for the moment, try again later."