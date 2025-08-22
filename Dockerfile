# Dockerfile (Debian-slim, WeasyPrint-ready)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Installer dépendances système nécessaires (WeasyPrint, compilation pip, rendu PDF)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     build-essential \
     gcc \
     pkg-config \
     libpq-dev \
     libffi-dev \
     libssl-dev \
     curl \
     ca-certificates \
     bash \
     make \
     python3-dev \
     # libs pour WeasyPrint (Cairo / Pango / Pixbuf + dépendances)
     libcairo2 \
     libcairo2-dev \
     libpango-1.0-0 \
     libpango1.0-dev \
     libgdk-pixbuf-xlib-2.0-0 \
     libgdk-pixbuf-xlib-2.0-dev \
     libxml2 \
     libxml2-dev \
     libxslt1.1 \
     libxslt1-dev \
     zlib1g-dev \
     libjpeg-dev \
     fonts-dejavu-core \
     fonts-liberation \
     shared-mime-info \
  && rm -rf /var/lib/apt/lists/*

# copier requirements et installer (optimisé pour cache Docker)
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r /app/requirements.txt

# copier le code de l'app
COPY . /app

# créer user non-root et donner droits
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

ENV PATH="/home/appuser/.local/bin:${PATH}"

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
