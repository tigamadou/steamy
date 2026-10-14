from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.views import health, presign_upload

from .views import api_root

# try to use sidecar if available, otherwise fallback to standard SpectacularSwaggerView
try:
    # sidecar exports a Swagger view wrapper with bundled assets
    from drf_spectacular_sidecar.views import SpectacularSwaggerView as SidecarSwaggerView

    SwaggerView = SidecarSwaggerView
except Exception:
    SwaggerView = SpectacularSwaggerView

admin.site.site_title = settings.ADMIN_TITLE
admin.site.site_header = settings.ADMIN_HEADER


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Apps
    path("api/", include("apps.file.urls")),
    path("api/", include("apps.user.urls")),
    path("api/courses/", include("apps.courses.urls")),
    path("api/learning/", include("apps.learning.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/messaging/", include("apps.messaging.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
    # path("api/core/presign/", include("apps.core.views.presign_upload")),
    path("api/core/presign/", presign_upload, name="presign-upload"),
    path("api/health/", health, name="health"),
    # DRF API
    path("api/", api_root, name="index"),
    path("api-auth/", include("rest_framework.urls")),
    # Swagger API
    # Schema OpenAPI (JSON/YAML)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # ReDoc
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
