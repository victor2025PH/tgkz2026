# TG-Matrix Backend Dockerfile — P11-2: Multi-stage optimized build
# Stage 1: Builder — compile C extensions with gcc
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime — minimal image without gcc
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy pre-built Python packages from builder
COPY --from=builder /install /usr/local

# Install only runtime libs (no gcc/dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copy application code
COPY . .

# Create necessary directories with correct ownership
RUN mkdir -p /app/sessions /app/logs /app/data \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["python", "-u", "web_server.py"]
