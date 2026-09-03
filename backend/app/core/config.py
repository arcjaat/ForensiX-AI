"""
Central app configuration. All fusion weights and thresholds live here so the
risk engine is tunable via environment variables without touching code.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "development"
    PROJECT_NAME: str = "ForensiX AI - Forged Document Detection"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg2://sih_admin:changeme_in_env@db:5432/doc_forgery_db"

    MAX_UPLOAD_MB: int = 10
    ALLOWED_CONTENT_TYPES: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")

    UPLOAD_DIR: str = "app/static/uploads"
    ELA_OUTPUT_DIR: str = "app/static/ela_outputs"

    # Baseline Calibration & Non-Linear Risk Fusion Parameters
    FACE_MATCH_THRESHOLD: float = 0.60
    ELA_NOISE_BASELINE: float = 0.25

    # Verdict thresholds on the final 0-100 trust score
    THRESHOLD_GENUINE: int = 80      # score >= this -> "Genuine"
    THRESHOLD_SUSPICIOUS: int = 40   # score >= this (and < genuine) -> "Suspicious"; below -> "Fake"

    # ELA (Error Level Analysis) tunables — see app/services/ela_detector.py
    # for what each one controls. Exposed here so they can be re-tuned against
    # real sample data without a rebuild.
    ELA_JPEG_QUALITY: int = 90
    ELA_SCORE_LOW_BOUND: float = 4.0
    ELA_SCORE_HIGH_BOUND: float = 55.0
    ELA_COMPRESSION_WARNING_QUANT_MEAN_THRESHOLD: float = 15.0


settings = Settings()
