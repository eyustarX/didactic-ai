FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for compilation and database connectivity
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create storage directory for uploaded documents
RUN mkdir -p /app/storage

# Copy backend source code and seed data
COPY src/ ./src/
COPY data/ ./data/

# Environment settings
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000

# Health check to ensure service is responding
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch FastAPI via Uvicorn
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
