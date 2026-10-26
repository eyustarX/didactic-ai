<div align="center">

# Didactic AI

**An AI-powered academic evaluation platform for curriculum analysis, rubric synthesis, and decomposed automated grading.**

[![CI Pipeline](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml)
[![Pytest Suite](https://img.shields.io/badge/pytest-118%20passed-success)](tests/)
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-purple)](LICENSE)

</div>

---

## Overview

**Didactic AI** is an open-source evaluation platform designed for higher education educators. It bridges the gap between course materials and objective evaluation by:

1. Ingesting course lecture materials (PDF, PPTX, DOCX, text) and extracting key learning concepts using Bloom's Taxonomy.
2. Generating standardized examination papers alongside normalized, multi-criterion marking rubrics.
3. Automatically evaluating open-ended student submissions against canonical rubrics with verbatim evidence citations and targeted remediation feedback.
4. Aggregating submission metrics into an interactive cohort gradebook to identify class-wide learning gaps.

---

## Key Features

- **Document Ingestion & Semantic Chunking:** Ingests lecture notes, presentation slides, and handbooks with recursive chunking and noise filtering.
- **Canonical Rubric Synthesis:** Generates multi-criteria grading rubrics where all criterion weights mathematically sum to 100%.
- **Assessment Studio:** Formulates balanced exam questions, quizzes, and coursework assignments with question-level locking (`lock: true`) for iterative refinement.
- **Decomposed Grading Engine:** Evaluates student answers criterion-by-criterion, citing exact phrases from student papers to support awarded marks.
- **Remediation Loop:** Generates concept-level explanations for identified student gaps and formulates follow-up practice problems.
- **Cohort Learning Analytics:** Aggregates student scores, calculates class averages, and highlights common misconceptions across parallel course sections.
- **Robust AI Engine:** Powered by Google Gemini and local semantic vector models, with a built-in offline simulator for instant local testing.
- **Security & Guardrails:** Strict Pydantic schema validation with automated retries and input sanitization against prompt injection.

---

## Architecture

```
[ React 18 + Vite Frontend ]
           │
           │ HTTPS (REST API)
           ▼
[ FastAPI Backend (Python 3.11) ]
  ├── Document Parser & Semantic Chunker
  ├── RAG Lecture Retriever (Sentence-Transformers)
  ├── Decomposed Grading Agent
  └── Pydantic Validation & Retries
           │
     ┌─────┴─────────────────────┐
     ▼                           ▼
[ PostgreSQL (Neon) ]   [ Google Gemini API ]
(Gradebooks, Rubrics,    (Curriculum Analysis,
 Assessments, Chats)     Rubrics & Grading)
```

- **Frontend:** React 18 single-page application built with Vite and modern CSS.
- **Backend API:** FastAPI running on Uvicorn with asynchronous endpoints.
- **Database:** PostgreSQL (Neon serverless cloud database) via SQLAlchemy ORM.
- **AI & NLP:** Google Gemini API grounded with local semantic text retrieval (RAG).
- **Observability:** Prometheus metrics stream exposed at `/metrics`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, Modern CSS |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **AI & NLP** | Google Gemini API, PyPDF, Sentence-Transformers |
| **Database** | PostgreSQL (Neon Serverless Postgres) |
| **Deployment & Containers** | Docker, Hugging Face Spaces / Render |
| **Observability** | Prometheus (`prometheus-fastapi-instrumentator`) |
| **CI/CD & Testing** | GitHub Actions, Pytest |

---

## Project Structure

```
didactic-ai/
├── frontend/                   # React + Vite web application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Sidebar, Modals, Logo)
│   │   ├── pages/              # Main tabs (Assessment, Grading, Curriculum, Overview)
│   │   ├── services/           # API integration layer (api.js)
│   │   └── App.jsx             # Root application view
│   ├── package.json
│   └── vite.config.js
│
├── src/                        # Backend source code
│   ├── ai/                     # AI engine, prompts, RAG, and benchmark suite
│   │   ├── engine.py           # Provider implementations (Gemini, Mock)
│   │   ├── eval_benchmark.py   # Automated consistency & security benchmark
│   │   ├── ingest.py           # PDF/PPTX document text extraction
│   │   ├── prompts.py          # Structured prompt templates
│   │   ├── rag.py              # Lecture slide chunk retriever
│   │   └── schemas.py          # Pydantic domain models
│   ├── api/                    # FastAPI routes and controllers
│   │   ├── didactic_routes.py  # Core application endpoints
│   │   └── routes.py           # Top-level API router
│   ├── core/                   # Application settings and configurations
│   ├── db/                     # SQLAlchemy models and database sessions
│   ├── services/               # Grading, analytics, and engine adapters
│   └── main.py                 # FastAPI application root
│
├── infra/                      # Infrastructure & container configurations
│   └── docker/
│       └── backend.Dockerfile  # Production container definition
│
├── docs/                       # Architecture diagrams and benchmark reports
│   ├── architecture.svg
│   └── benchmark_results.md
│
├── tests/                      # Automated test suite (118 tests)
├── requirements.txt            # Python dependencies
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python:** Version 3.11 or higher
- **Node.js:** Version 18 or higher (with `npm`)
- **Git**

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eyustarX/didactic-ai.git
   cd didactic-ai
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the API server:**
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```
   - API Root: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - Prometheus Metrics: `http://localhost:8000/metrics`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   - Frontend Application: `http://localhost:5173`

---

## Environment Variables

Create a `.env` file in the project root directory with your credentials:

```env
# Database Configuration (PostgreSQL / Neon, or leave empty for local SQLite)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Google Gemini API Key (Free from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Settings
STAGE=dev
LOG_LEVEL=INFO
```

---

## Testing & Benchmarking

### Unit & Integration Tests

The test suite contains 118 automated tests covering PDF parsing, RAG retrieval, prompt generation, Pydantic validation, and grading logic:

```bash
pytest -v
```

### AI Evaluation Benchmark

Run the automated evaluation benchmark to measure grading consistency across repeated runs, rubric adherence, and adversarial safety:

```bash
python src/ai/eval_benchmark.py
```

Results are saved to [`docs/benchmark_results.md`](docs/benchmark_results.md).

---

## Deployment (Docker & Cloud Hosting)

### Docker Deployment

The application includes a production-ready container definition in [`infra/docker/backend.Dockerfile`](infra/docker/backend.Dockerfile):

```bash
# Build the Docker image
docker build -f infra/docker/backend.Dockerfile -t didactic-ai-backend .

# Run the container
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require" \
  -e GEMINI_API_KEY="your_api_key" \
  didactic-ai-backend
```

### Hosting on Hugging Face Spaces / Render

1. Create a new **Docker Space** on Hugging Face Spaces or a **Web Service** on Render.
2. Link your GitHub repository.
3. Configure the environment variables (`DATABASE_URL`, `GEMINI_API_KEY`) in the platform settings.
4. The service will build from the Dockerfile and launch on port 8000.

---

## API Reference

| Method | Endpoint | Description | Headers |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check probe and active AI provider status | None |
| `GET` | `/metrics` | Prometheus metrics stream for observability | None |
| `POST` | `/upload` | Multipart file upload (PDF/PPTX) and text extraction | `X-Lecturer-Id` |
| `POST` | `/generate/rubrics` | Generates a normalized grading rubric from lecture text | `X-Lecturer-Id` |
| `POST` | `/generate/assessment` | Generates exam questions and answer keys | `X-Lecturer-Id` |
| `POST` | `/grade/exam` | Evaluates a single question answer with evidence citations | `X-Lecturer-Id` |
| `POST` | `/grade/assignment` | Evaluates a full assignment submission against rubric | `X-Lecturer-Id` |
| `GET` | `/analytics` | Aggregates class-wide statistics and error patterns | `X-Lecturer-Id` |
| `GET` | `/chat/sessions` | Lists conversation history sessions for the instructor | `X-Lecturer-Id` |

Interactive OpenAPI documentation is accessible at `/docs` (Swagger UI) and `/redoc` (ReDoc).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
