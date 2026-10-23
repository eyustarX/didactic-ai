"""
FastAPI application entry point for Didactic AI.
Configures CORS, middleware, root index, and mounts versioned API routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router as api_router
from src.ai.engine import get_engine

app = FastAPI(
    title="Didactic AI API",
    version="1.0.0",
    description="AI-powered academic curriculum analysis, rubric generation, and automated exam grading.",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes
app.include_router(api_router)


@app.get("/", tags=["General"])
async def root():
    engine = get_engine()
    return {
        "name": "Didactic AI API",
        "version": "1.0.0",
        "status": "running",
        "docs_url": "/docs",
        "active_provider": engine.provider.__class__.__name__,
    }
