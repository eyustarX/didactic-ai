# Didactic AI

Didactic AI is an AI-powered academic evaluation system designed for curriculum analysis, automated rubric generation, exam synthesis, decomposed grading, and cohort performance analytics.

---

## Architecture Overview

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
├── src/                            # Backend application (FastAPI & AI Core)
│   ├── ai/                         # Multi-agent AI engine, RAG pipeline, and domain models
│   │   ├── agents.py               # CurriculumAgent and RubricAgent
│   │   ├── engine.py               # Pluggable engine (Mock, Gemini, AWS Bedrock)
│   │   ├── ingest.py               # PDF ingestion, cleaning, and semantic chunking
│   │   ├── prompts.py              # Structured LLM prompt templates
│   │   ├── rag.py                  # TF-IDF lecture slide retriever
│   │   └── schemas.py              # Core domain schemas
│   ├── api/                        # FastAPI versioned routes
│   │   └── routes.py               # REST endpoints (/upload, /generate/*, /grade/*, /analytics)
│   ├── services/                   # Application services
│   │   ├── engine_adapter.py       # Cached AI engine provider
│   │   ├── grading_service.py      # Evaluates & persists grades to PostgreSQL
│   │   └── analytics_service.py    # Aggregates cohort performance & error patterns
│   ├── db/                         # Database persistence layer
│   │   ├── models.py               # SQLAlchemy models (Submission)
│   │   └── session.py              # Database engine & session dependency
│   ├── core/                       # Configuration & settings
│   │   └── config.py               # Environment configuration via Pydantic
│   ├── schemas/                    # API request and response schemas
│   │   └── schemas.py              # DTO models for REST endpoints
│   ├── __init__.py                 # Root package initializer
│   └── main.py                     # FastAPI application entry point with Prometheus & CORS
│
├── tests/                          # Automated test suite (56 unit & API tests)
│   ├── test_agents.py
│   ├── test_api.py
│   ├── test_benchmark.py
│   ├── test_engine.py
│   ├── test_ingest.py
│   ├── test_prompts.py
│   ├── test_rag.py
│   └── test_schemas.py
│
├── data/
│   └── samples/                    # Benchmark sample lectures, assignments, and submissions
│
├── scripts/
│   └── run_demo.py                 # Interactive terminal benchmark demonstration script
│
├── infra/                          # Infrastructure & Monitoring
│   ├── docker/
│   │   └── backend.Dockerfile      # Container definition
│   ├── monitoring/
│   │   ├── prometheus/             # Prometheus metrics configuration
│   │   └── grafana/dashboards/     # Grafana dashboard configurations
│   └── minio/                      # S3-compatible local object storage configuration
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI workflow (automated testing & build)
│
├── docker-compose.yml              # Multi-container orchestration definition
├── requirements.txt                # Python backend dependencies
├── .dockerignore                   # Docker build ignore rules
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
└── README.md                       # Project documentation
```

---

## Key Features

- **Multi-Agent Curriculum Extraction**: Evaluates lecture slides using Bloom's Taxonomy (Remember, Understand, Apply, Analyze, Evaluate, Create).
- **Normalized Rubric Generation**: Synthesizes standardized grading rubrics whose criteria weights mathematically sum to 100%.
- **Assessment Synthesis**: Generates exam questions, model answer keys, and point allocations directly from source lecture notes.
- **Decomposed Grading & Citations**: Evaluates open-ended student submissions against rubrics with evidence citations, identified gaps, and score breakdowns.
- **Persistent Analytics & Error Categorization**: Automatically records submission evaluations in PostgreSQL (Neon) and aggregates cohort performance and common error patterns.
- **Prometheus Observability**: Native metrics exposed at `/metrics` via `prometheus-fastapi-instrumentator`.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status metadata and active provider info |
| `GET` | `/health` | Health check probe |
| `GET` | `/metrics` | Prometheus metrics stream |
| `POST` | `/upload` | Multipart PDF upload, text extraction, and semantic chunking |
| `POST` | `/generate/rubrics` | Generates a normalized grading rubric from lecture text |
| `POST` | `/generate/assessment` | Generates exam questions and answer keys |
| `POST` | `/grade/exam` | Evaluates a single question response and stores score |
| `POST` | `/grade/assignment` | Evaluates a full project/assignment and stores score |
| `GET` | `/analytics` | Retrieves cohort statistics (average score, total submissions, error tags) |

Interactive documentation is available at **`/docs`** (Swagger UI) and **`/redoc`** (ReDoc).

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- Git

### 1. Clone & Set Up Python Environment

```bash
git clone https://github.com/eyustarX/didactic-ai.git
cd didactic-ai

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database (PostgreSQL / Neon, or leave empty for local SQLite)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# AI Provider Settings (Defaults to Mock provider if keys are omitted)
GEMINI_API_KEY=your_gemini_api_key_here
USE_AWS_BEDROCK=false
AWS_REGION=us-east-1
```

### 3. Run the Backend API

```bash
uvicorn src.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Prometheus Metrics: `http://localhost:8000/metrics`

### 4. Run Automated Tests

```bash
pytest -v
```

All 56 unit and integration tests run offline without external API dependencies.

### 5. Run the Terminal Benchmark Demo

```bash
python scripts/run_demo.py
```

Executes an end-to-end evaluation demonstration across sample lectures and student submissions.

---

## Continuous Integration (CI/CD)

GitHub Actions runs automated checks on every push and pull request via [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
- Python 3.12 environment setup
- Dependency installation
- Automated Pytest execution (56 tests)
- Terminal demo benchmark verification
