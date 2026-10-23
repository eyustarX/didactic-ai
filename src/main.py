import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from src.api.routes import router
from src.core.config import settings
from src.db.models import Base
from src.db.session import engine
from src.services.engine_adapter import ai_engine

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)  # creates the table in Neon if it is missing
    yield


app = FastAPI(title="Didactic AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
Instrumentator().instrument(app).expose(app)  # adds GET /metrics for Prometheus


@app.get("/", tags=["General"])
def root():
    try:
        provider = ai_engine().provider.__class__.__name__
    except Exception:
        provider = "unavailable"
    return {
        "name": "Didactic AI API",
        "version": "1.0.0",
        "status": "running",
        "docs_url": "/docs",
        "active_provider": provider,
    }