from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.utils.dependencies import require_user_id, verify_api_key
from app.services.ai_service import ai_service
import app.utils.data_loader as dl
from app.utils.database import DBNote
import tempfile
import os


router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(verify_api_key)])


class SummarizeRequest(BaseModel):
    note_id: str


class SummarizeResponse(BaseModel):
    summary: str


class RewriteRequest(BaseModel):
    note_id: str
    theme: str


class RewriteResponse(BaseModel):
    rewritten_content: str


class ThemesResponse(BaseModel):
    themes: dict


class ApplyResponse(BaseModel):
    note: dict
    message: str


def _get_note_or_404(note_id: str, user_id: str):
    note = dl.get_record(DBNote, note_id=note_id, user_id=user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_note(request: SummarizeRequest, user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")

    note = _get_note_or_404(request.note_id, user_id)
    summary = await ai_service.summarize_note(note.note_title, note.note_body)
    return SummarizeResponse(summary=summary)


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_note(request: RewriteRequest, user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")

    note = _get_note_or_404(request.note_id, user_id)
    
    try:
        rewritten = await ai_service.rewrite_note(note.note_title, note.note_body, request.theme)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return RewriteResponse(rewritten_content=rewritten)


@router.get("/themes", response_model=ThemesResponse)
async def get_rewrite_themes(user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")
    return ThemesResponse(themes=ai_service.get_rewrite_themes())


@router.post("/summarize-and-apply", response_model=ApplyResponse)
async def summarize_and_apply(request: SummarizeRequest, user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")

    note = _get_note_or_404(request.note_id, user_id)
    summary = await ai_service.summarize_note(note.note_title, note.note_body)
    
    new_body = f"{note.note_body}\n\n---\n**Summary:**\n{summary}" if note.note_body else f"**Summary:**\n{summary}"
    if len(new_body) > 1000:
        new_body = new_body[:997] + "..."
    
    updated = dl.update_record(
        DBNote,
        filter_kwargs={"note_id": note.note_id, "user_id": user_id},
        update_kwargs={"note_body": new_body},
        raise_if_missing=True,
        missing_detail="Note not found"
    )
    return ApplyResponse(note=updated.model_dump(), message="Summary applied to note")


@router.post("/rewrite-and-apply", response_model=ApplyResponse)
async def rewrite_and_apply(request: RewriteRequest, user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")

    note = _get_note_or_404(request.note_id, user_id)
    
    try:
        rewritten = await ai_service.rewrite_note(note.note_title, note.note_body, request.theme)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    updated = dl.update_record(
        DBNote,
        filter_kwargs={"note_id": note.note_id, "user_id": user_id},
        update_kwargs={"note_body": rewritten},
        raise_if_missing=True,
        missing_detail="Note not found"
    )
    return ApplyResponse(note=updated.model_dump(), message="Note rewritten successfully")


class TranscribeResponse(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...), user_id: str = Depends(require_user_id)):
    if not ai_service.is_available():
        raise HTTPException(status_code=503, detail="AI service not configured")

    content_type = file.content_type or ""
    filename = file.filename or ""
    ext = filename.split('.')[-1].lower() if '.' in filename else 'webm'

    is_valid_audio = (
        content_type.startswith("audio/")
        or content_type in {"video/webm", "video/mp4", "video/mpeg", "application/octet-stream"}
        or ext in {"webm", "mp3", "wav", "m4a", "ogg", "flac", "mp4", "mpeg", "mpga"}
    )

    if not is_valid_audio:
        raise HTTPException(status_code=400, detail="File must be a supported audio/video file")
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = await ai_service.transcribe_audio(tmp_path)
        return TranscribeResponse(text=text)
    finally:
        os.unlink(tmp_path)