"""
Document pre-processing endpoint: auto-crop, deskew, contrast enhance.

Wraps the OpenCV pipeline in app/services/preprocessor.py (Feature #1).
"""
import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import settings
from app.core.validators import validate_upload, safe_file_suffix
from app.services.preprocessor import run_preprocessing

router = APIRouter()


@router.post("")
async def preprocess_document(file: UploadFile = File(...)):
    """
    Accepts a raw ID photo, returns a cropped/deskewed/contrast-enhanced
    version plus metadata on which crop strategy was used, so the officer
    UI (and the officer) knows whether to trust the auto-crop or expect to
    crop manually.
    """
    validate_upload(file)

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    document_id = str(uuid.uuid4())
    suffix = safe_file_suffix(file.filename)
    raw_path = upload_dir / f"{document_id}_raw{suffix}"
    
    file_bytes = await file.read()
    raw_path.write_bytes(file_bytes)

    try:
        result = await asyncio.to_thread(
            run_preprocessing,
            str(raw_path),
            output_dir=str(upload_dir),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "document_id": document_id,
        "processed_image_path": result["output_path"],
        "crop_method": result["crop_method"],
        "corners_detected": result["corners_detected"],
    }
