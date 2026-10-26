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

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Testing & Benchmarking](#testing--benchmarking)
- [Cloud Deployment (AWS SAM)](#cloud-deployment-aws-sam)
- [API Reference](#api-reference)
- [License](#license)

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
- **Multi-Provider AI Core:** Pluggable engine supporting Amazon Bedrock (Claude 3 Haiku, Titan Embeddings), Google Gemini, and a deterministic offline test simulator.
- **Security & Guardrails:** Strict Pydantic schema validation with automated retries and input sanitization against prompt injection.

---

## Architecture

![System Architecture](docs/architecture.svg)

The platform follows a modular, decoupled architecture:

- **Client:** React 18 single-page application built with Vite and Tailwind CSS.
- **API Gateway:** Amazon API Gateway HTTP API (v2) managing route dispatch, rate-limiting, and CORS.
- **Compute Layer:** FastAPI backend running natively or containerized on AWS Lambda (Python 3.11).
- **Persistence Layer:** PostgreSQL (Neon) and Amazon DynamoDB for relational gradebooks and rubric storage; Amazon S3 for lecture materials.
- **Intelligence Layer:** Amazon Bedrock Converse API / Google Gemini API grounded with local vector and TF-IDF retrieval (RAG).
- **Observability:** Native Prometheus metrics endpoint (`/metrics`) and Amazon CloudWatch telemetry.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, CSS3 Variables |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **AI / NLP** | Amazon Bedrock (Claude 3 Haiku), Google Gemini, PyPDF, Sentence-Transformers |
| **Database** | PostgreSQL (Neon), Amazon DynamoDB |
| **Infrastructure** | AWS SAM (Serverless Application Model), Amazon S3, AWS Lambda, API Gateway |
| **Monitoring** | Prometheus (`prometheus-fastapi-instrumentator`), Amazon CloudWatch |
| **CI/CD** | GitHub Actions, Pytest |

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
│   │   ├── engine.py           # Provider implementations (Bedrock, Gemini, Mock)
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
│   ├── lambda_handler.py       # AWS Lambda entrypoint adapter
│   └── main.py                 # FastAPI application root
│
├── infra/                      # Infrastructure as Code
│   ├── template.yaml           # AWS SAM serverless infrastructure template
│   ├── teardown.sh             # Linux/macOS teardown script
│   └── teardown.bat            # Windows teardown script
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

Create a `.env` file in the project root directory with the following configuration:

```env
# Database Configuration (PostgreSQL / Neon, or leave blank for local SQLite)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# AI Provider Settings
# If no API keys are provided, the system defaults to the deterministic offline simulator.
USE_AWS_BEDROCK=false
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Google Gemini (Alternative Free Provider)
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

Run the automated evaluation benchmark to measure grading variance, criterion adherence, and prompt injection safety:

```bash
python src/ai/eval_benchmark.py
```

Results are generated and saved to [`docs/benchmark_results.md`](docs/benchmark_results.md).

---

## Cloud Deployment (AWS SAM)

The project includes an **AWS Serverless Application Model (SAM)** template in [`infra/template.yaml`](infra/template.yaml) provisioning:
- **Amazon S3:** Document upload bucket with CORS and AES-256 encryption.
- **Amazon DynamoDB:** On-demand table for rubrics and gradebooks.
- **Amazon API Gateway:** HTTP API routing requests to Lambda.
- **AWS Lambda:** Python 3.11 execution runtime with least-privilege IAM policies.
- **AWS Budgets:** Active $1.00 budget alert for zero-cost compliance.

### Deploy

```bash
cd infra
sam build
sam deploy --guided --stack-name didactic-ai-prod
```

### Teardown

To cleanly remove all deployed AWS resources:

```bash
# Linux / macOS
bash infra/teardown.sh didactic-ai-prod us-east-1

# Windows
.\infra\teardown.bat didactic-ai-prod us-east-1

# Or via SAM CLI directly
sam delete --stack-name didactic-ai-prod --no-prompts
```

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
