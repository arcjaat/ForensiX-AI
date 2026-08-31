"""
Response/request contracts for the document screening pipeline.
Kept separate from ORM models so the API contract is stable even if
persistence changes.
"""
from typing import Literal
from pydantic import BaseModel, Field


class OCRField(BaseModel):
    value: str
    confidence: float = Field(ge=0.0, le=1.0)


class OCRResult(BaseModel):
    fields: dict[str, OCRField]
    mean_confidence: float = Field(ge=0.0, le=1.0)
    # Sensitive numeric IDs are never populated with realistic digits in this
    # codebase's sample/test payloads — see OCR module docstring.


class ELAResult(BaseModel):
    tamper_score: float = Field(ge=0.0, le=1.0, description="0 = no evidence of splicing, 1 = strong evidence")
    heatmap_path: str
    compression_warning: bool = Field(
        default=False,
        description="True if background noise floor suggests heavy/repeated JPEG re-compression "
                    "(e.g. messaging-app forwards), which can inflate tamper_score independent of forgery.",
    )
    forensic_notes: str = Field(
        default="",
        description="Human-readable caveat for the officer UI, populated when compression_warning is True.",
    )
    suspicious_regions: list[dict] = Field(default_factory=list)


class FaceMatchResult(BaseModel):
    similarity_score: float = Field(ge=0.0, le=1.0)
    face_detected_on_id: bool
    face_detected_on_selfie: bool


class ScreeningVerdict(BaseModel):
    trust_score: int = Field(ge=0, le=100)
    verdict: Literal["Genuine", "Suspicious", "Fake"]
    explanation: list[str] = Field(default_factory=list, description="Human-readable reasons behind the verdict")


class ScreeningResponse(BaseModel):
    document_id: str
    ocr: OCRResult
    ela: ELAResult
    face_match: FaceMatchResult
    result: ScreeningVerdict
