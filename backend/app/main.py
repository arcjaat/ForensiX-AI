"""
Main FastAPI application entry point for SIH26188 (AI-Based Fake Identity & Document Screening System).
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.router import api_router
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "ela_outputs").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables for %s...", settings.PROJECT_NAME)
    init_db()
    logger.info("Application startup completed successfully.")
    yield
    logger.info("Application shutdown.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="ForensiX AI — Explainable AI pipeline for forged identity document detection.",
    lifespan=lifespan,
)

# CORS configuration for frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Static file serving for ELA outputs and preprocessed uploads
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "running",
        "docs": "/docs",
        "version": "0.1.0",
    }
