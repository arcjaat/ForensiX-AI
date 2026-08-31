"""
Validation utilities for file uploads and request payloads.
"""
from pathlib import Path
from fastapi import UploadFile, HTTPException

from app.core.config import settings


def validate_upload(file: UploadFile) -> None:
    """
    Validates uploaded file MIME type against allowed image content types.
    Raises HTTP 415 if unsupported.
    """
    if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported content type '{file.content_type}'. "
                f"Allowed: {list(settings.ALLOWED_CONTENT_TYPES)}"
            ),
        )


def safe_file_suffix(filename: str | None, default: str = ".jpg") -> str:
    """
    Safely extract file suffix from uploaded filename, falling back to default.
    """
    if not filename:
        return default
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else default
