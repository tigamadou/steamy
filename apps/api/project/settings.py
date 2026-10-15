import logging.config
import os
import sys
from datetime import timedelta

import dj_database_url

# ==================================================================================================
# CHANGE FIELDS
# ==================================================================================================


APP_NAME = "Dev App"
DEFAULT_FROM_EMAIL = "hello@inputlogic.ca"
DEFAULT_FROM_NAME = "Input Logic Dev"


# ==================================================================================================
# ENVIRONMENT SETTINGS
# ==================================================================================================


DEV = "dev"
STAGING = "staging"
PRODUCTION = "production"
TEST = "test"
ENV = os.environ.get("DJANGO_ENV", DEV)
TESTING = "test" in sys.argv or ENV == TEST
LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG" if ENV == DEV else "WARNING")


# ==================================================================================================
# DJANGO SETTINGS
# ==================================================================================================


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace("/project", "")
DEPLOYED = ENV in (STAGING, PRODUCTION)
DEBUG = not DEPLOYED

if DEPLOYED:
    # En staging/prod, l'absence de ces variables doit empêcher le démarrage
    SECRET_KEY = os.environ["SECRET_KEY"]
    ALLOWED_HOSTS = os.environ["ALLOWED_HOSTS"].split(",")
else:
    SECRET_KEY = os.environ.get("SECRET_KEY", "local")
    ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")
# Indicateur pour autoriser l'accès à la doc (par défaut False en prod)
ALLOW_API_DOCS = os.getenv("ALLOW_API_DOCS", "false").lower() in ("1", "true", "yes")


AUTH_USER_MODEL = "accounts.User"
# Connexion des personas par « Identifiant ou numéro » (W16) et du personnel par l'admin (WAD15) : ADR 0001.
AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.IdentifierBackend",
    "apps.accounts.backends.StaffBackend",
]

INSTALLED_APPS = [
    # Custom Admin settings (must be before django.contrib.admin)
    "django_admin_env_notice",
    "admin_interface",
    "colorfield",
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.messages",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    # 3rd party
    "django_celery_results",
    "django_celery_beat",
    "django_extensions",
    "django_filters",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "storages",
    "django_otp",
    "django_otp.plugins.otp_totp",
    # Local
    "apps.file",
    "apps.mail",
    "apps.accounts",
    "apps.courses",
    "apps.learning",
    "apps.payments",
    "apps.analytics",
    "apps.notifications",
    "apps.core",
]

MIDDLEWARE = [
    "libs.corsmiddleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # `request.user.is_verified()` (TOTP du personnel, D72) ; exigé sur le back-office en API-L6.1
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django_admin_env_notice.context_processors.from_settings",
            ],
        },
    },
]

WSGI_APPLICATION = "project.wsgi.application"
ASGI_APPLICATION = "project.asgi.application"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

if ENV in (STAGING, PRODUCTION):
    DATABASES = {"default": dj_database_url.config(conn_max_age=600, ssl_require=True)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "django"),
            "USER": os.environ.get("POSTGRES_USER", "postgres"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        },
    }

# Politique de mot de passe D25 seule : les validateurs par défaut de Django sont retirés (messages hors `PwReq`).
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "apps.accounts.password_validation.PasswordPolicyValidator"},
]

# Messages en français (D4) ; dates stockées en UTC, affichées et planifiées au fuseau du Bénin (C16).
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Porto-Novo"
USE_I18N = True
USE_L10N = True
USE_TZ = True

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")


# ==================================================================================================
# ADMIN SETTINGS
# ==================================================================================================


# Set Django admin banner colour based on environment
if ENV == DEV:
    ENVIRONMENT_NAME = "Development Environment"
    ENVIRONMENT_COLOR = "#828282"
elif ENV == STAGING:
    ENVIRONMENT_NAME = "Staging Staging Environment"
    ENVIRONMENT_COLOR = "#FF2222"
else:
    ENVIRONMENT_NAME = None
    ENVIRONMENT_COLOR = None


# ==================================================================================================
# LOGGING
# ==================================================================================================


LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG" if ENV == DEV else "WARNING")
LOG_APPNAME = os.environ.get("LOG_APPNAME", "DJANGO")
LOG_SYSNAME = f"{APP_NAME}-{ENV.upper()}"
LOGGING_CONFIG = None

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "root": {
        "level": "ERROR",
        "handlers": ["console", "papertrail"],
    },
    "formatters": {
        "custom": {
            "format": "\
                %(levelname)s %(message)s \
                (in %(module)s.%(funcName)s:%(lineno)s by %(name)s)",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
        "simple": {
            "format": f"\
                %(asctime)s {LOG_SYSNAME} {LOG_APPNAME} \
                [%(process)d]: %(levelname)s %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "custom"},
        "papertrail": {
            "class": "logging.handlers.SysLogHandler",
            "formatter": "simple",
            "address": ("logs7.papertrailapp.com", 52333),
        },
    },
    "loggers": {
        "apps": {"level": LOG_LEVEL},
        "libs": {"level": LOG_LEVEL},
        "project": {"level": LOG_LEVEL},
        "django": {"level": "INFO" if ENV == DEV else "WARNING"},
        "gunicorn": {"level": "WARNING"},
    },
}
logging.config.dictConfig(LOGGING)


# ==================================================================================================
# 3RD PARTY SETTINGS
# ==================================================================================================


REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": (
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": ("djangorestframework_camel_case.parser.CamelCaseJSONParser",),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # Session Django + CSRF uniquement (S12) : pas de token DRF.
        "libs.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "libs.pagination.PagePagination",
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    "EXCEPTION_HANDLER": "libs.exception_handler.exception_handler",
    # Throttling (S9) : plafonds globaux + portées sur les points sensibles (cache Redis).
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "120/min"),
        "user": os.getenv("THROTTLE_USER", "600/min"),
        "login": os.getenv("THROTTLE_LOGIN", "5/min"),
        "login-identifier": os.getenv("THROTTLE_LOGIN_IDENTIFIER", "10/hour"),
        "signup": os.getenv("THROTTLE_SIGNUP", "5/min"),
        "password-reset": os.getenv("THROTTLE_PASSWORD_RESET", "5/hour"),
        "webhook": os.getenv("THROTTLE_WEBHOOK", "120/min"),
    },
}
# Réponses d'erreur (composant `Error`) déclarées sur chaque opération
REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"] = "libs.schema.ApiAutoSchema"
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # autres options...
}
SPECTACULAR_SETTINGS = {
    "TITLE": "API Steamy",
    "DESCRIPTION": "API pour la plateforme de formation",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Le schéma doit refléter le JSON réellement émis (camelCase via djangorestframework-camel-case)
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "drf_spectacular.contrib.djangorestframework_camel_case.camelize_serializer_fields",
    ],
    "SCHEMA_PATH_PREFIX": r"/api",
    # Codes du format d'erreur D4 : énumération nommée pour le client TypeScript
    "ENUM_NAME_OVERRIDES": {"ErrorCodeEnum": "libs.errors.ERROR_CODES"},
    # Schéma d'auth (cookieAuth) déduit de DEFAULT_AUTHENTICATION_CLASSES
}
ADMIN_TITLE = "Admin"
ADMIN_HEADER = "Admin"

WEB_URL = os.environ.get("WEB_URL", "http://localhost:3000")
RESET_PASSWORD_URL = "{}{}".format(WEB_URL, "/reset-password?state={state}")

# Origines du front autorisées à appeler l'API avec les cookies de session (CORS)
CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", WEB_URL).split(",") if o]
# Origines autorisées à envoyer des requêtes protégées par CSRF (le front est sur un autre sous-domaine)
CSRF_TRUSTED_ORIGINS = [o for o in os.getenv("CSRF_TRUSTED_ORIGINS", WEB_URL).split(",") if o]

# Payements
PAYMENTS_KKIAPAY_SECRET = os.getenv("PAYMENTS_KKIAPAY_SECRET", "")
PAYMENTS_FEDAPAY_SECRET = os.getenv("PAYMENTS_FEDAPAY_SECRET", "")

# # ==================================================================================================
# # FILE SETTINGS
# # ==================================================================================================


# AWS_ACCESS_KEY_ID = os.environ.get('BUCKETEER_AWS_ACCESS_KEY_ID')
# AWS_DEFAULT_REGION = os.environ.get('BUCKETEER_AWS_REGION')
# AWS_SECRET_ACCESS_KEY = os.environ.get('BUCKETEER_AWS_SECRET_ACCESS_KEY')
# AWS_STORAGE_BUCKET_NAME = os.environ.get('BUCKETEER_BUCKET_NAME')
# AWS_DEFAULT_ACL = 'public-read'
# AWS_QUERYSTRING_AUTH = False

# if AWS_ACCESS_KEY_ID:
#     DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Enable file resize task by uncommenting the task decorator for apps.file.tasks.resize_images()
# How often to check for images to resizes (in seconds)
FILE_IMAGE_RESIZE_SCHEDULE = 60
FILE_IMAGE_SIZES = (
    {"key": "th", "width": 350, "quality": 90},
    {"key": "md", "width": 800},
)
# ----------------
# Storage S3-compatible (RustFS en local, voir compose.yml racine)
# ----------------
AWS_LOCATION = os.environ.get("AWS_LOCATION", "")
# Django ≥ 5.1 ignore DEFAULT_FILE_STORAGE : le backend passe par STORAGES.
# La variable d'env garde son nom pour pouvoir basculer (ex : FileSystemStorage en test).
STORAGES = {
    "default": {
        "BACKEND": os.getenv("DEFAULT_FILE_STORAGE", "storages.backends.s3boto3.S3Boto3Storage"),
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "http://rustfs:9000")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "app-media")
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_DEFAULT_ACL = None
# Optionally to force virtual-host style addressing:
AWS_S3_ADDRESSING_STYLE = os.getenv("AWS_S3_ADDRESSING_STYLE", "path")


# ==================================================================================================
# EMAIL SETTINGS
# ==================================================================================================


# EMAIL_HOST = os.environ.get('SMTP_SERVER', 'smtp.postmarkapp.com')
# EMAIL_PORT = os.environ.get('SMTP_PORT', 587)
# # Required, add to Heroku config or .env file
# EMAIL_HOST_USER = os.environ.get('SMTP_USERNAME', None)
# # Required, add to Heroku config or .env file
# EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD', None)
# EMAIL_USE_TLS = True
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.example.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1") == "1"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@example.com")

SEND_MAIL = True if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD else False


# ==================================================================================================
# REDIS
# ==================================================================================================


REDIS_HOST = os.environ.get("REDIS_HOST")
REDIS_PORT = os.environ.get("REDIS_PORT", 6379)
REDIS_DB = os.environ.get("REDIS_DB", 0)
REDIS_URL = os.environ.get("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")

# ----------------
# Cache (Redis)
# ----------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}
# Sessions en base avec cache (C20) : une purge de Redis ne déconnecte plus tout le monde.
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_CACHE_ALIAS = "default"

# ==================================================================================================
# CELERY / WORKERS
# ==================================================================================================
# ----------------
# Celery
# ----------------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND", "django-db"
)  # using django_celery_results
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
# Tâches exécutées sur place pendant les tests (PLAN-API, règles propres à l'API)
CELERY_TASK_ALWAYS_EAGER = TESTING

# optional default task time limits
CELERY_TASK_TIME_LIMIT = int(os.getenv("CELERY_TASK_TIME_LIMIT", 300))
CELERY_TASK_SOFT_TIME_LIMIT = int(os.getenv("CELERY_TASK_SOFT_TIME_LIMIT", 180))


# CELERY_BROKER_URL = REDIS_URL
# CELERY_ACCEPT_CONTENT = ['json']
# CELERY_TASK_SERIALIZER = 'json'
# CELERY_RESULT_BACKEND = 'django-db'
# # Process tasks inline (no queue) if we're in test mode
# CELERY_ALWAYS_EAGER = TESTING
# CELERY_RESULT_EXTENDED = True  # Provide more data in Django Admin results

# Example of how to schedule tasks
# =================================
# from celery.schedules import crontab  # Import at top of file
#
#  CELERY_BEAT_SCHEDULE = {
#      'example-seconds': {
#          'task': 'apps.core.tasks.example_scheduled_task',
#          'schedule': 60.0,  # Call every 60 seconds
#      },
#      'example-cron': {
#          'task': 'apps.core.tasks.example_scheduled_task',
#          'schedule': crontab(minute=0, hour=0)  # Call at midnight every day
#      }
#  }


# ==================================================================================================
# GITHUB
# ==================================================================================================


if TESTING:
    try:
        del DATABASES["default"]["OPTIONS"]["sslmode"]
    except KeyError:
        pass


# ==================================================================================================
# SÉCURITÉ HTTP (staging / prod, derrière l'ingress Traefik qui termine le TLS)
# ==================================================================================================


if DEPLOYED:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Domaine parent partagé par le front et l'API (ex : ".steamy.africa")
    SESSION_COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
    CSRF_COOKIE_DOMAIN = SESSION_COOKIE_DOMAIN
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
