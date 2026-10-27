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

# Compatibility patch for prometheus-fastapi-instrumentator with newer FastAPI router structures
try:
    import prometheus_fastapi_instrumentator.routing as _pfi_routing
    from starlette.routing import Match, Mount

    def _safe_get_route_name(scope, routes, route_name=None):
        for route in routes:
            match, child_scope = route.matches(scope)
            if match == Match.FULL:
                route_name = getattr(route, "path", None)
                child_scope = {**scope, **child_scope}
                if isinstance(route, Mount) and getattr(route, "routes", None):
                    child_route_name = _safe_get_route_name(child_scope, route.routes, route_name)
                    if child_route_name is None:
                        route_name = None
                    else:
                        route_name += child_route_name
                elif hasattr(route, "original_router") and hasattr(route.original_router, "routes"):
                    child_route_name = _safe_get_route_name(child_scope, route.original_router.routes, route_name)
                    if child_route_name:
                        route_name = child_route_name
                return route_name or getattr(route, "path", "") or ""
            elif match == Match.PARTIAL and route_name is None:
                route_name = getattr(route, "path", None)
        return None

    _pfi_routing._get_route_name = _safe_get_route_name
except Exception:
    pass


logging.basicConfig(level=logging.INFO)



def ensure_schema_compatibility(db_engine):
    """
    Safely adds missing columns to existing SQLite / PostgreSQL database tables
    without breaking existing data.
    """
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(db_engine)
        tables = inspector.get_table_names()

        columns_to_check = {
            "assessments": [
                ("course_name", "VARCHAR(150) DEFAULT 'General Course'"),
                ("section", "VARCHAR(50) DEFAULT 'Section A'"),
                ("academic_year", "VARCHAR(50) DEFAULT '2026'"),
                ("assessment_category", "VARCHAR(50) DEFAULT 'midterm'"),
                ("weight_pct", "FLOAT DEFAULT 25.0"),
            ],
            "students": [
                ("section", "VARCHAR(50) DEFAULT 'Section A'"),
                ("academic_year", "VARCHAR(50) DEFAULT '2026'"),
                ("course_name", "VARCHAR(150) DEFAULT 'General Course'"),
            ],
            "submissions": [
                ("section", "VARCHAR(50) DEFAULT 'Section A'"),
                ("academic_year", "VARCHAR(50) DEFAULT '2026'"),
                ("course_name", "VARCHAR(150) DEFAULT 'General Course'"),
                ("assessment_category", "VARCHAR(50) DEFAULT 'midterm'"),
            ],
        }

        with db_engine.begin() as conn:
            for table, cols in columns_to_check.items():
                if table in tables:
                    existing_cols = {c["name"] for c in inspector.get_columns(table)}
                    for col_name, col_type in cols:
                        if col_name not in existing_cols:
                            try:
                                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                            except Exception:
                                pass
    except Exception:
        pass


def migrate_legacy_data(db_engine):
    """
    Safely migrates legacy 'default_lecturer' records and historical sessions
    to the primary lecturer account 'usr_byz6ij'.
    """
    from sqlalchemy import text
    try:
        with db_engine.begin() as conn:
            conn.execute(text("UPDATE chat_sessions SET lecturer_id = 'usr_byz6ij' WHERE lecturer_id IN ('default_lecturer', 'usr_wtpiub') OR lecturer_id IS NULL"))
            conn.execute(text("UPDATE lecture_notes SET lecturer_id = 'usr_byz6ij' WHERE lecturer_id = 'default_lecturer' OR lecturer_id IS NULL"))
            conn.execute(text("UPDATE assessments SET lecturer_id = 'usr_byz6ij' WHERE lecturer_id = 'default_lecturer' OR lecturer_id IS NULL"))
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)  # creates the table in Neon if it is missing
    ensure_schema_compatibility(engine)
    migrate_legacy_data(engine)
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