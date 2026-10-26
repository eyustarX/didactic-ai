<div align="center">

# Didactic AI

**An AI-powered academic evaluation platform for curriculum analysis, rubric synthesis, and decomposed automated grading.**

[![CI Pipeline](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml)
[![Pytest Suite](https://img.shields.io/badge/pytest-118%20passed-success)](tests/)
[![Frontend Vercel](https://img.shields.io/badge/frontend-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![Backend Hugging Face](https://img.shields.io/badge/backend-Hugging%20Face%20Spaces-yellow?logo=huggingface&logoColor=black)](https://huggingface.co/spaces)
[![Database Neon](https://img.shields.io/badge/database-Neon%20Postgres-00e599?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
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
[ React 18 + Vite Frontend (Vercel) ]
                  │
                  │ HTTPS (REST API)
                  ▼
[ FastAPI Backend (Hugging Face Spaces - Docker) ]
  ├── Document Parser & Semantic Chunker
  ├── RAG Lecture Retriever (Sentence-Transformers)
  ├── Decomposed Grading Agent
  └── Pydantic Validation & Retries
                  │
        ┌─────────┴─────────────────────┐
        ▼                               ▼
[ PostgreSQL (Neon) ]       [ Google Gemini API ]
(Gradebooks, Rubrics,        (Curriculum Analysis,
 Assessments, Chats)          Rubrics & Grading)
```

- **Frontend:** React 18 single-page application hosted on **Vercel** with fast edge delivery.
- **Backend API:** FastAPI running on Uvicorn, containerized with Docker and hosted on **Hugging Face Spaces**.
- **Database:** Serverless PostgreSQL on **Neon** via SQLAlchemy ORM.
- **AI & NLP:** Google Gemini API grounded with local semantic text retrieval (RAG).
- **Observability:** Prometheus metrics stream exposed at `/metrics`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, Modern CSS |
| **Frontend Hosting** | **Vercel** |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **Backend Hosting** | **Hugging Face Spaces** (Docker Container) |
| **AI & NLP** | Google Gemini API, PyPDF, Sentence-Transformers |
| **Database** | **PostgreSQL (Neon Serverless Postgres)** |
| **Observability** | Prometheus (`prometheus-fastapi-instrumentator`) |
| **CI/CD & Testing** | GitHub Actions, Pytest |

---

## Project Structure

```
didactic-ai/
├── frontend/                   # React + Vite web application (Deployed on Vercel)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Sidebar, Modals, Logo)
│   │   ├── pages/              # Main tabs (Assessment, Grading, Curriculum, Overview)
│   │   ├── services/           # API integration layer (api.js)
│   │   └── App.jsx             # Root application view
│   ├── package.json
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.js
│
├── src/                        # Backend source code (Deployed on Hugging Face Spaces)
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
├── Dockerfile                  # Production Docker container for Hugging Face Spaces
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

### Backend Setup (Local)

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

### Frontend Setup (Local)

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
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Google Gemini API Key (Free from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Settings
STAGE=prod
LOG_LEVEL=INFO
```

For the frontend, configure `frontend/.env`:
```env
# Points to the deployed Hugging Face Spaces backend URL (or local http://localhost:8000/api)
VITE_API_BASE_URL=https://your-space-name.hf.space/api
```

---

## Deployment Guide

### 1. Backend on Hugging Face Spaces

1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Set **Space SDK** to **Docker** (Blank).
3. Connect your GitHub repository or push this repository directly to the Space.
4. The root [`Dockerfile`](Dockerfile) will automatically build the environment and expose port `7860`.
5. Under **Settings > Variables and secrets**, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `GEMINI_API_KEY`: Your Google Gemini API key.

### 2. Frontend on Vercel

1. Import your repository into [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-space-name.hf.space/api`
7. Click **Deploy**. Vercel will build and serve the application globally with automatic edge SSL.

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
