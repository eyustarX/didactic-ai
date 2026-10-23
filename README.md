# Didactic AI

<!-- TODO: Expand project overview and complete implementation documentation -->

Didactic AI is an AI-powered academic evaluation system designed for curriculum analysis, automated rubric generation, exam synthesis, and decomposed grading.

---

## Target Project Structure

```
didactic-ai/
│
├── frontend/                       # Frontend application (React + Vite)
│   ├── public/                     # Static assets and icons
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Top-level route pages
│   │   ├── services/               # API client services
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── App.jsx                 # Root application component
│   │   └── main.jsx                # Application DOM entry point
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Frontend package dependencies
│   └── .env.example                # Frontend environment configuration template
│
├── src/                            # Backend application (FastAPI & AI core)
│   ├── ai/                         # Multi-agent AI engine, RAG pipeline, and schemas
│   ├── api/                        # FastAPI versioned routes and endpoints
│   ├── services/                   # Application services and business logic
│   ├── core/                       # Configuration, security, and logging
│   ├── schemas/                    # API request and response models
│   ├── __init__.py                 # Root package initializer
│   └── main.py                     # FastAPI application entry point
│
├── tests/                          # Automated test suite (AI and API tests)
├── data/
│   └── samples/                    # Sample lectures, assignments, and submissions
│
├── scripts/
│   └── run_demo.py                 # Interactive terminal demonstration script
│
├── infra/                          # Infrastructure and DevOps configuration
│   ├── docker/
│   │   └── backend.Dockerfile      # FastAPI container definition
│   ├── monitoring/
│   │   ├── prometheus/             # Prometheus metrics configuration
│   │   └── grafana/dashboards/     # Grafana dashboard templates
│   └── minio/                      # S3-compatible local object storage configuration
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI workflow
│
├── docker-compose.yml              # Local multi-service development compose file
├── requirements.txt                # Python backend dependencies
├── .dockerignore                   # Docker build ignore patterns
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
└── README.md                       # Project documentation
```

---

## Directory Responsibilities

| Directory | Purpose |
| :--- | :--- |
| `frontend/` | React and Vite user interface for educators and students to upload materials, view rubrics, and inspect grading reports. |
| `src/ai/` | Core AI components: RAG retriever, multi-agent curriculum and rubric systems, provider adapters (Mock, Gemini, Bedrock). |
| `src/api/` | FastAPI RESTful route handlers exposing endpoints for curriculum ingestion, rubric synthesis, and grading. |
| `src/services/` | Business logic layer orchestrating AI tasks, document parsing, and response formatting. |
| `src/core/` | Centralized application configuration, security middleware, and structured logging. |
| `src/schemas/` | Pydantic data schemas validating incoming requests and outgoing API responses. |
| `tests/` | Unit and integration tests for AI agents, RAG retrieval, and API endpoints. |
| `data/samples/` | Reference benchmark lecture notes, assignments, and sample student submissions. |
| `scripts/` | Standalone utility and demo scripts for terminal-based pipeline verification. |
| `infra/` | Dockerfile, Prometheus metrics configuration, Grafana dashboards, and MinIO storage configuration. |
| `.github/` | Automated continuous integration (CI) workflows for testing, linting, and container builds. |

---

## Planned Implementation Stages

<!-- TODO: Track milestones as implementation proceeds -->

1. **Stage 1 - Project Structure Setup & Safe Baseline** *(Current)*
   - Prepare clean, modular folder structure across frontend, backend, infrastructure, and CI/CD.
   - Preserve existing AI modules, tests, scripts, and benchmark data.

2. **Stage 2 - Backend REST API Implementation**
   - Implement FastAPI application entry point (`src/main.py`).
   - Define versioned API endpoints (`src/api/routes.py`) for rubric generation, assessment generation, and grading.
   - Connect FastAPI routes to the existing AI engine and multi-agent system via `src/services/`.

3. **Stage 3 - Frontend Interface Development**
   - Initialize React + Vite application with Tailwind / modern CSS styling.
   - Build lecture upload interface, rubric inspection view, and student submission evaluation dashboard.
   - Connect frontend service layer to backend REST API.

4. **Stage 4 - Containerization & Infrastructure**
   - Finalize `infra/docker/backend.Dockerfile`.
   - Configure multi-container orchestration in `docker-compose.yml` (backend, frontend, Prometheus, Grafana, MinIO).

5. **Stage 5 - Monitoring & Metrics**
   - Instrument FastAPI endpoints with Prometheus metrics.
   - Set up Grafana dashboards for latency, request rates, and AI provider evaluation metrics.

6. **Stage 6 - CI/CD Automation**
   - Configure GitHub Actions workflow in `.github/workflows/ci.yml` for automated pytest execution, frontend build checks, and Docker image validation.
