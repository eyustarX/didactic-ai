<div align="center">

# Didactic AI

**An AI-powered academic evaluation platform for curriculum analysis, rubric synthesis, and decomposed automated grading.**

[![CI Pipeline](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/eyustarX/didactic-ai/actions/workflows/ci.yml)
[![Pytest Suite](https://img.shields.io/badge/pytest-118%20passed-success)](tests/)
[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org/)
[![Frontend: Vercel](https://img.shields.io/badge/frontend-Vercel-black?logo=vercel)](https://vercel.com/)
[![Backend: Hugging Face Spaces](https://img.shields.io/badge/backend-Hugging%20Face%20Spaces-yellow?logo=huggingface)](https://huggingface.co/spaces)
[![Database: Neon Postgres](https://img.shields.io/badge/database-Neon%20Postgres-00e599)](https://neon.tech/)
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
[ React 18 + Vite Frontend (Hosted on Vercel) ]
                      │
                      │ HTTPS (REST API requests)
                      ▼
[ FastAPI Backend (Hosted on Hugging Face Spaces - Docker) ]
  ├── Document Parser & Semantic Chunker
  ├── RAG Lecture Retriever (Sentence-Transformers)
  ├── Decomposed Grading Agent
  └── Pydantic Validation & Retries
                      │
        ┌─────────────┴─────────────────────┐
        ▼                                   ▼
[ PostgreSQL (Neon) ]              [ Google Gemini API ]
(Gradebooks, Rubrics,               (Curriculum Analysis,
 Assessments, Chats)                Rubrics & Grading)
```

- **Frontend:** React 18 single-page application built with Vite and modern CSS, hosted on **Vercel**.
- **Backend API:** FastAPI running on Uvicorn inside a lightweight container, hosted on **Hugging Face Spaces**.
- **Database:** Serverless cloud PostgreSQL hosted on **Neon** via SQLAlchemy ORM.
- **AI & NLP:** Google Gemini API grounded with local semantic text retrieval (RAG).
- **Observability:** Prometheus metrics stream exposed at `/metrics`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Application** | React 18, Vite, Lucide Icons, Modern CSS |
| **Frontend Hosting** | **Vercel** |
| **Backend API** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **Backend Hosting** | **Render** (Docker-based) |
| **AI & NLP** | Google Gemini API, PyPDF, Sentence-Transformers |
| **Database** | PostgreSQL (**Neon** Serverless Postgres) |
| **Observability** | Prometheus (`prometheus-fastapi-instrumentator`) |
| **CI/CD & Testing** | GitHub Actions, Pytest |

---

## Project Structure

```
didactic-ai/
├── frontend/                   # React + Vite web application (deployed to Vercel)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Sidebar, Modals, Logo)
│   │   ├── pages/              # Main tabs (Assessment, Grading, Curriculum, Overview)
│   │   ├── services/           # API integration layer (api.js)
│   │   └── App.jsx             # Root application view
│   ├── package.json
│   └── vite.config.js
│
├── src/                        # Backend source code (deployed to Hugging Face Spaces)
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
│       └── backend.Dockerfile  # Production Dockerfile for Hugging Face Spaces
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

## Getting Started (Local Development)

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
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-something.neon.tech/dbname?sslmode=require

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

## Deployment Guide (Vercel & Hugging Face Spaces)

The production deployment plan decouples the frontend and backend for optimal performance, zero cost, and high availability:

### 1. Backend Deployment (Hugging Face Spaces)

The backend is packaged as a Docker container using [`infra/docker/backend.Dockerfile`](infra/docker/backend.Dockerfile).

1. Log in to [Hugging Face](https://huggingface.co/) and click **New Space**.
2. Set Space Name (e.g. `didactic-ai-api`) and select **Docker** as the Space SDK (Blank).
3. Connect your GitHub repository or push the project files.
4. In Space **Settings $\rightarrow$ Variables and Secrets**, add the repository secrets:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (`postgresql://...`)
   - `GEMINI_API_KEY`: Your Google Gemini API key
5. Hugging Face Spaces automatically builds the Dockerfile and exposes the live API over HTTPS (e.g., `https://your-username-didactic-ai-api.hf.space`).

### 2. Frontend Deployment (Vercel)

The React 18 single-page application is hosted globally on Vercel's Edge Network.

1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Import the `didactic-ai` repository.
3. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click edit and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, set:
   - `VITE_API_BASE_URL`: `https://your-username-didactic-ai-api.hf.space/api` *(your Hugging Face Spaces backend URL)*
5. Click **Deploy**. Vercel will build the frontend and provide a global public URL (e.g., `https://didactic-ai.vercel.app`).

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
