# Image de l'API Steamy — trois cibles :
#   dev   : stack locale (compose.yml), code monté en volume, runserver
#   prod  : image déployée (staging/prod), gunicorn + workers uvicorn (ASGI, WebSockets)
# Le même Dockerfile sert aussi pour worker et beat Celery (commande différente).

# --- Dépendances système d'exécution (WeasyPrint, PostgreSQL) ---------------
FROM python:3.11.13-slim-bookworm AS runtime-base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libpq5 \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libharfbuzz-subset0 \
      libjpeg62-turbo libopenjp2-7 libffi8 \
      shared-mime-info fonts-dejavu-core fonts-liberation \
      curl \
 && rm -rf /var/lib/apt/lists/*

# --- Compilation des dépendances Python ---------------------------------------
FROM runtime-base AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential pkg-config libpq-dev libffi-dev \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /venv
ENV PATH="/venv/bin:${PATH}"
COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip setuptools wheel \
 && pip install -r /tmp/requirements.txt

# --- Dev ------------------------------------------------------------------------
FROM runtime-base AS dev

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:${PATH}"
WORKDIR /app
COPY . /app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# --- Prod -----------------------------------------------------------------------
FROM runtime-base AS prod

RUN useradd --create-home --uid 10001 app
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:${PATH}" \
    PORT=8000
WORKDIR /app
COPY --chown=app:app . /app

# Fichiers statiques (admin, docs) servis par WhiteNoise
RUN python manage.py collectstatic --noinput

# UID numérique : requis par runAsNonRoot côté Kubernetes
USER 10001
EXPOSE 8000

# Les migrations ne tournent PAS ici : Job Helm dédié, avant chaque déploiement.
CMD ["sh", "-c", "exec gunicorn project.asgi:application -c project/gunicorn.py --bind 0.0.0.0:${PORT}"]
