FROM python:3.12-slim-bookworm

# Install uv natively from the official external image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency definitions
COPY pyproject.toml .

# Install packages directly to the system to avoid path isolation issues
# Note: we explicitly include pytest so that test-runner containers can run the test suite
RUN uv pip install --system -r pyproject.toml pytest

# Copy source code and frontend resources
COPY src/ /app/src/
COPY frontend/ /app/frontend/

EXPOSE 8000

CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]