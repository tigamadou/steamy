# Configuration gunicorn de production (chargée par le CMD de l'image `prod`).
# ASGI via uvicorn : nécessaire pour les WebSockets de la messagerie (Channels).
import os

worker_class = "uvicorn_worker.UvicornWorker"
workers = int(os.getenv("GUNICORN_WORKERS", "2"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5

# Logs sur stdout/stderr, collectés par Kubernetes
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Recycler les workers limite l'impact d'éventuelles fuites mémoire
max_requests = 1000
max_requests_jitter = 100
