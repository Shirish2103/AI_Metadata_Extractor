# ---- Frontend build stage ----
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend runtime stage ----
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install full dependencies (includes torch, transformers, keybert for all features)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake in spaCy model and NLTK data
ENV SPACY_MODEL=en_core_web_sm
RUN python -m spacy download en_core_web_sm \
    && python -c "import nltk; nltk.download('stopwords')"

# App code + pre-tagged outputs/ (this deployment has no raw dataset to mount,
# so the cached .json.gz metadata ships inside the image).
COPY . .
COPY --from=frontend /frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Default port 8000; HF Spaces can override via PORT env var
EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]