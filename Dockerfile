FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and data assets
COPY src/ ./src/
COPY data/ ./data/

# Environment settings
ENV PYTHONUNBUFFERED=1 \
    PORT=7860

# Expose default Hugging Face Spaces port
EXPOSE 7860

# Start Uvicorn on port 7860 (Hugging Face standard) or PORT env var
CMD ["sh", "-c", "python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
