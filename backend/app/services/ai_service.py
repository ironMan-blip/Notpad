from groq import AsyncGroq
from app.core.config import settings


REWRITE_THEMES = {
    "professional": {
        "label": "Professional",
        "description": "Formal, polished tone",
        "prompt": "Rewrite this note in a professional, formal tone. Make it polished and suitable for business or academic contexts.",
    },
    "concise": {
        "label": "Concise",
        "description": "Short, to the point",
        "prompt": "Rewrite this note concisely. Keep only the essential information, remove fluff, and make it brief and to the point.",
    },
    "bullet-points": {
        "label": "Bullet Points",
        "description": "Structured list format",
        "prompt": "Rewrite this note as structured bullet points. Organize the content into clear, scannable lists with key points and sub-points.",
    },
    "simplified": {
        "label": "Simplified",
        "description": "Easy to understand",
        "prompt": "Rewrite this note in simple, easy-to-understand language. Avoid jargon, use shorter sentences, and make it accessible to a general audience.",
    },
    "action-items": {
        "label": "Action Items",
        "description": "Extract tasks & next steps",
        "prompt": "Rewrite this note to extract action items and next steps. Format as a clear list of tasks with any relevant context or deadlines.",
    },
    "creative": {
        "label": "Creative",
        "description": "Engaging, narrative style",
        "prompt": "Rewrite this note in a creative, engaging narrative style. Make it more storytelling-oriented while preserving the key information.",
    },
    "pirate": {
        "label": "🏴‍☠️ Pirate",
        "description": "Arrr, matey!",
        "prompt": "Rewrite this note in pirate speak. Use pirate slang like 'arrr', 'matey', 'ahoy', 'ye', 'me', 'booty', 'treasure', etc. Make it sound like a pirate wrote it.",
    },
    "shakespeare": {
        "label": "🎭 Shakespearean",
        "description": "Thee, thou, wherefore",
        "prompt": "Rewrite this note in Shakespearean English. Use Early Modern English with thee/thou, hast/hath, dost/doth, and poetic language. Make it sound like a play.",
    },
    "gen-z": {
        "label": "😎 Gen Z",
        "description": "No cap, slay, bussin",
        "prompt": "Rewrite this note in Gen Z slang. Use terms like 'no cap', 'slay', 'bussin', 'fire', 'GOAT', 'bet', 'sus', 'rizz', 'skrrt', 'periodt', 'fr', 'ong', etc. Make it sound like a TikTok caption.",
    },
    "yoda": {
        "label": "🧙 Yoda",
        "description": "Speak like, you must",
        "prompt": "Rewrite this note in Yoda-speak. Use inverted sentence structure (object-subject-verb), speak in riddles, use 'hmm', 'yes', 'strong with the Force'. Make it sound like Yoda from Star Wars.",
    },
    "corporate": {
        "label": "💼 Corporate BS",
        "description": "Circle back, synergy",
        "prompt": "Rewrite this note in corporate buzzword speak. Use terms like 'circle back', 'synergy', 'bandwidth', 'low-hanging fruit', 'deep dive', 'move the needle', 'actionable insights', 'leverage', 'paradigm shift', 'holistic approach', 'touch base', 'ping', 'deck', 'deliverables'. Make it sound like a LinkedIn thought-leader post.",
    },
    "poet": {
        "label": "📜 Poetic",
        "description": "Verse and rhyme",
        "prompt": "Rewrite this note as a poem. Use rhyme, meter, and poetic devices. Make it lyrical and beautiful while preserving the meaning.",
    },
    "drill-sergeant": {
        "label": "🎖️ Drill Sergeant",
        "description": "Drop and give me 20!",
        "prompt": "Rewrite this note as a drill sergeant barking orders. Use ALL CAPS, intense language, military terminology, 'MAGGOT', 'MOVE IT', 'NOW', 'DISMISSED', 'HOOAH'. Make it aggressive and commanding.",
    },
    "therapist": {
        "label": "🛋️ Therapist",
        "description": "And how does that make you feel?",
        "prompt": "Rewrite this note as a supportive therapist. Use empathetic language, validation, gentle probing questions, 'I hear you', 'it sounds like', 'what I'm hearing is', 'let's explore that', 'that must be difficult'. Make it warm and therapeutic.",
    },
}


class AIService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self.model = "llama-3.3-70b-versatile"

    def is_available(self) -> bool:
        return self.client is not None

    def get_rewrite_themes(self) -> dict:
        return {key: {"label": v["label"], "description": v["description"]} for key, v in REWRITE_THEMES.items()}

    def get_rewrite_prompt(self, theme_key: str) -> str:
        theme = REWRITE_THEMES.get(theme_key)
        if not theme:
            raise ValueError(f"Unknown rewrite theme: {theme_key}")
        return theme["prompt"]

    async def summarize_note(self, note_title: str, note_body: str) -> str:
        if not self.client:
            raise ValueError("Groq API key not configured")

        prompt = f"""Summarize the following note in 2-3 sentences. Focus on the key points and main ideas.

Title: {note_title}
Content: {note_body}

Summary:"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.3,
        )

        return response.choices[0].message.content.strip()

    async def rewrite_note(self, note_title: str, note_body: str, theme_key: str) -> str:
        if not self.client:
            raise ValueError("Groq API key not configured")

        prompt = self.get_rewrite_prompt(theme_key)

        full_prompt = f"""Rewrite the following note based on the instruction below. Return only the rewritten note content.

Title: {note_title}
Current Content: {note_body}
Instruction: {prompt}

Rewritten Content:"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": full_prompt}],
            max_tokens=2000,
            temperature=0.5,
        )

        return response.choices[0].message.content.strip()

    async def transcribe_audio(self, audio_file_path: str) -> str:
        if not self.client:
            raise ValueError("Groq API key not configured")

        with open(audio_file_path, "rb") as f:
            transcription = await self.client.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3",
                response_format="text",
                language="en",
            )

        return transcription.strip()


ai_service = AIService()