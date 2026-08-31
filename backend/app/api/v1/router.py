from fastapi import APIRouter

from app.api.v1.endpoints import screen, preprocess, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(preprocess.router, prefix="/preprocess", tags=["preprocessing"])
api_router.include_router(screen.router, prefix="/screen", tags=["screening"])
