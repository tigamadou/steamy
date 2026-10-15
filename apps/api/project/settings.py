import json
import logging.config
import os
import sys
from datetime import timedelta

import dj_database_url
from celery.schedules import crontab

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
    # Django core (admin : site du back-office avec TOTP, `apps.core.admin_site`)
    "apps.core.apps.SteamyAdminConfig",
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
    "adminsortable2",
    "storages",
    "django_otp",
    "django_otp.plugins.otp_totp",
    # Local
    "apps.file",
    "apps.mail",
    "apps.accounts",
    "apps.catalog",
    "apps.events",
    "apps.public",
    "apps.shop",
    "apps.learning",
    "apps.wishlist",
    "apps.payments",
    "apps.analytics",
    "apps.notifications",
    "apps.referentials",
    "apps.classrooms",
    "apps.impact",
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
    # `request.user.is_verified()` : session du personnel vérifiée par TOTP (D72)
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


# Bandeau d'environnement de l'admin (django-admin-env-notice), aux couleurs du thème monochrome
ENVIRONMENT_NAME, ENVIRONMENT_COLOR = {
    DEV: ("Développement", "#5B5479"),  # --ink-600
    TEST: ("Test", "#5B5479"),
    STAGING: ("Préproduction", "#9A5B02"),  # --amber-700
    PRODUCTION: ("Production", "#161325"),  # --ink-900
}.get(ENV, (None, None))
ENVIRONMENT_TEXT_COLOR = "#FFFFFF"
# Modales de django-admin-interface (pages de l'admin dans une iframe du même site)
X_FRAME_OPTIONS = "SAMEORIGIN"

# Personnel (LOT-6 6.1) : session de 8 h (C20) et TOTP (D72)
STAFF_SESSION_AGE = 8 * 60 * 60
OTP_TOTP_ISSUER = "Steamy"
# Ni secret ni QR code d'un appareil TOTP dans l'admin : le QR code n'est montré qu'à l'enrôlement
OTP_ADMIN_HIDE_SENSITIVE_DATA = True


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
        # Connexion du personnel à l'admin (WAD15), par IP et par email
        "staff-login": os.getenv("THROTTLE_STAFF_LOGIN", "10/min"),
        "staff-login-email": os.getenv("THROTTLE_STAFF_LOGIN_EMAIL", "10/hour"),
        # Création d'un compte en attente (apprenant) ou d'un défi OTP (parent)
        "signup": os.getenv("THROTTLE_SIGNUP", "5/min"),
        # Étapes suivantes (demande au parent, mot de passe) : compteur séparé, sinon un parent et son enfant
        # derrière la même adresse IP (box familiale, salle de classe) s'épuisent mutuellement
        "signup-step": os.getenv("THROTTLE_SIGNUP_STEP", "20/min"),
        "otp": os.getenv("THROTTLE_OTP", "10/min"),
        "username-availability": os.getenv("THROTTLE_USERNAME_AVAILABILITY", "30/min"),
        "resume": os.getenv("THROTTLE_RESUME", "5/min"),
        "resume-username": os.getenv("THROTTLE_RESUME_USERNAME", "10/hour"),
        "consent-preview": os.getenv("THROTTLE_CONSENT_PREVIEW", "20/min"),
        "invitation": os.getenv("THROTTLE_INVITATION", "20/min"),
        "password-reset": os.getenv("THROTTLE_PASSWORD_RESET", "5/hour"),
        "webhook": os.getenv("THROTTLE_WEBHOOK", "120/min"),
        # Création de commande (réserve du stock) : par utilisateur, ou par IP pour un invité
        "orders": os.getenv("THROTTLE_ORDERS", "30/hour"),
        # Initiation d'un paiement (chaque essai sollicite le téléphone du payeur)
        "payments": os.getenv("THROTTLE_PAYMENTS", "20/hour"),
        # Alerte de réassort (un SMS par demande) : par IP pour un invité
        "restock-alert": os.getenv("THROTTLE_RESTOCK_ALERT", "10/hour"),
        # Formulaires publics (devis, newsletter, contact) : par IP
        "public-form": os.getenv("THROTTLE_PUBLIC_FORM", "10/hour"),
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
    # Rôle d'un compte et origine d'une demande de consentement ont les mêmes valeurs : un seul `RoleEnum`
    "ENUM_NAME_OVERRIDES": {
        "ErrorCodeEnum": "libs.errors.ERROR_CODES",
        "RoleEnum": "apps.accounts.models.User.Role",
        "EnrollmentStatusEnum": "apps.learning.models.Enrollment.Status",
        "AttemptStatusEnum": "apps.learning.models.QuizAttempt.Status",
        "QuizKindEnum": "apps.catalog.models.Quiz.Kind",
        "BadgeKindEnum": "apps.catalog.models.Badge.Kind",
        # Impact Tracker : noms explicites, sans renommer `ToneEnum` (notifications)
        "ToneEnum": "apps.notifications.models.Tone",
        "PeriodKindEnum": "apps.impact.periods.KINDS",
        "KpiStatusEnum": "apps.impact.status.STATUS_CODES",
        "KpiToneEnum": "apps.impact.status.TONES",
        "ImpactReportStatusEnum": "apps.impact.models.ImpactReport.Status",
        # `source` des inscriptions garde son nom face à `KpiSourceEnum`
        "SourceEnum": "apps.learning.models.Enrollment.Source",
        "KpiSourceEnum": "apps.impact.models.KpiDefinition.Source",
        "KpiUnitEnum": "apps.impact.models.KpiDefinition.Unit",
        "KpiPeriodicityEnum": "apps.impact.models.KpiDefinition.Periodicity",
        "OrderKindEnum": "apps.payments.models.Order.Kind",
        "OrderCreateKindEnum": "apps.payments.serializers.ORDER_CREATE_KINDS",
        "OrderStatusEnum": "apps.payments.models.Order.Status",
    },
    # Schéma d'auth (cookieAuth) déduit de DEFAULT_AUTHENTICATION_CLASSES
}

WEB_URL = os.environ.get("WEB_URL", "http://localhost:3000")
RESET_PASSWORD_URL = "{}{}".format(WEB_URL, "/reset-password?state={state}")

# Origines du front autorisées à appeler l'API avec les cookies de session (CORS)
CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", WEB_URL).split(",") if o]
# Origines autorisées à envoyer des requêtes protégées par CSRF (le front est sur un autre sous-domaine)
CSRF_TRUSTED_ORIGINS = [o for o in os.getenv("CSRF_TRUSTED_ORIGINS", WEB_URL).split(",") if o]

# Paiement Mobile Money (S9, ADR 0003) : faux prestataire pilotable en local, en CI et dans les e2e, FedaPay en
# staging (bac à sable) et en production. Le faux prestataire refuse de fonctionner si DEPLOYED.
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "fedapay" if DEPLOYED else "fake")
# Durée de vie d'une commande non payée, et de son stock réservé (D38)
ORDER_TTL_MINUTES = int(os.getenv("ORDER_TTL_MINUTES", "30"))
# Délai (secondes) avant que le faux prestataire poste son webhook : le temps de voir l'écran d'attente (WA04)
FAKE_PAYMENT_DELAY = int(os.getenv("FAKE_PAYMENT_DELAY", "3"))
FEDAPAY_SECRET_KEY = os.getenv("FEDAPAY_SECRET_KEY", "")
FEDAPAY_WEBHOOK_SECRET = os.getenv("FEDAPAY_WEBHOOK_SECRET", "")
FEDAPAY_ENVIRONMENT = os.getenv("FEDAPAY_ENVIRONMENT", "sandbox")
# Page de retour du mode redirection : inutilisée par le débit direct, mais exigée par FedaPay
FEDAPAY_CALLBACK_URL = os.getenv("FEDAPAY_CALLBACK_URL", WEB_URL)
# Mode de débit direct FedaPay (`POST /v1/{mode}`) par « PAYS:réseau » (référentiel PaymentNetwork, D76). À
# confirmer dans le bac à sable, Celtiis surtout (ADR 0003, inconnue 1) ; surchargeable en JSON.
FEDAPAY_MODES = json.loads(
    os.getenv(
        "FEDAPAY_MODES",
        '{"BJ:mtn": "mtn_open", "BJ:moov": "moov", "BJ:celtiis": "sbin", '
        '"TG:moov": "moov_tg", "CI:mtn": "mtn_ci"}',
    )
)
# Identifiants FedaPay des devises, quand une notification ne donne que `currency_id`
FEDAPAY_CURRENCY_IDS = json.loads(os.getenv("FEDAPAY_CURRENCY_IDS", '{"1": "XOF"}'))

# SMS (S10, ADR 0002) : faux fournisseur (lisible dans Mailpit) en local et en CI, Twilio en staging et production.
# Le faux fournisseur refuse de fonctionner si DEPLOYED.
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "twilio" if DEPLOYED else "fake")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SENDER = os.getenv("TWILIO_SENDER", "STEAMY")
# URL publique du webhook de statut (`/api/notifications/sms/status/`) ; vide : pas d'accusés de réception
TWILIO_STATUS_CALLBACK_URL = os.getenv("TWILIO_STATUS_CALLBACK_URL", "")

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
    # Documents générés (certificats, factures) : jamais publics (ADR 0005)
    "private": {
        "BACKEND": os.getenv(
            "PRIVATE_FILE_STORAGE",
            "apps.core.storage.PrivateFileSystemStorage"
            if os.getenv("DEFAULT_FILE_STORAGE", "").endswith("FileSystemStorage")
            else "apps.core.storage.PrivateMediaStorage",
        ),
    },
}
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "http://rustfs:9000")
# Point d'accès joignable du navigateur, pour signer les URL de téléchargement des documents privés (ADR 0005, P5) ;
# vide : signature pour `AWS_S3_ENDPOINT_URL`
AWS_S3_PUBLIC_ENDPOINT_URL = os.getenv("AWS_S3_PUBLIC_ENDPOINT_URL", "")
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
# Destinataire des formulaires publics (devis, contact)
TEAM_EMAIL = os.getenv("TEAM_EMAIL", "contact@steamy.local")

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

# Tâches planifiées (versionnées ici, jamais saisies à la main dans l'admin) ; heure du Bénin (C16)
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "expire-consent-requests": {
        "task": "apps.accounts.tasks.expire_consent_requests",
        "schedule": crontab(minute=5),
    },
    "purge-signup-sessions": {
        "task": "apps.accounts.tasks.purge_signup_sessions",
        "schedule": crontab(minute=15),
    },
    "purge-refused-requests": {
        "task": "apps.accounts.tasks.purge_refused_requests",
        "schedule": crontab(minute=30, hour=3),
    },
    # Filet de sécurité des PDF de certificats (ADR 0005 §3)
    "retry-pending-certificates": {
        "task": "apps.learning.tasks.retry_pending_certificates",
        "schedule": crontab(minute="*/10"),
    },
    # Impact Tracker : agrégats quotidiens puis KPI `auto` (D75)
    "aggregate-daily-stats": {
        "task": "apps.impact.tasks.aggregate_daily_stats",
        "schedule": crontab(minute=0, hour=2),
    },
    "release-expired-reservations": {
        "task": "apps.payments.tasks.release_expired_reservations",
        "schedule": crontab(minute="*/5"),
    },
    "reconcile-pending-payments": {
        "task": "apps.payments.tasks.reconcile_pending_payments",
        "schedule": crontab(minute="*/5"),
    },
}
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

# Domaine parent partagé par le front et l'API (ex : ".steamy.africa" ; ".steamy.test" sur la stack e2e) : le
# serveur Next lit la session posée par l'API. Sans valeur, cookie limité à l'hôte de l'API (localhost en dev).
SESSION_COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
CSRF_COOKIE_DOMAIN = SESSION_COOKIE_DOMAIN

if DEPLOYED:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
