FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libjpeg62-turbo && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
RUN mkdir -p /data
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite+aiosqlite:////data/spend_tracker.db
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
