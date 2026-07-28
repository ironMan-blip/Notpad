from typing import Optional
from uuid import UUID
from urllib.parse import urlparse
import os

from pydantic import BaseModel, field_validator


class Voice(BaseModel):
    voice_id: str
    note_id: str
    user_id: str
    voice_url: str
    index: int
    transcript: Optional[str] = None

    @field_validator("voice_id", "note_id", "user_id")
    @classmethod
    def validate_uuid(cls, value: str) -> str:
        UUID(value)
        return value

    @field_validator("voice_url")
    @classmethod
    def validate_voice_extension(cls, value: str) -> str:
        if ".ufs.sh/f/" in value or "utfs.io/f/" in value:
            return value
        allowed = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".amr", ".webm"}
        path = urlparse(value).path
        _, ext = os.path.splitext(path)
        if ext.lower() not in allowed:
            raise ValueError("voice_url must have a valid audio extension")
        return value


class Picture(BaseModel):
    picture_id: str
    note_id: str
    user_id: str
    picture_url: str
    index: int
    file_hash: Optional[str] = None

    @field_validator("picture_id", "note_id", "user_id")
    @classmethod
    def validate_uuid(cls, value: str) -> str:
        UUID(value)
        return value

    @field_validator("picture_url")
    @classmethod
    def validate_picture_extension(cls, value: str) -> str:
        if ".ufs.sh/f/" in value or "utfs.io/f/" in value:
            return value
        allowed = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}
        path = urlparse(value).path
        _, ext = os.path.splitext(path)
        if ext.lower() not in allowed:
            raise ValueError("picture_url must have a valid image extension")
        return value

