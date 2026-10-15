from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.views import health, presign_upload

# try to use sidecar if available, otherwise fallback to standard SpectacularSwaggerView
try:
    # sidecar exports a Swagger view wrapper with bundled assets
    from drf_spectacular_sidecar.views import SpectacularSwaggerView as SidecarSwaggerView

    SwaggerView = SidecarSwaggerView
except Exception:
    SwaggerView = SpectacularSwaggerView


urlpatterns = [
    # Admin Django du back-office (`SteamyAdminSite` : TOTP, WAD15)
    path("admin/", admin.site.urls),
    # Apps
    path("api/auth/", include("apps.accounts.urls.auth")),
    path("api/accounts/", include("apps.accounts.urls.accounts")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/classrooms/", include("apps.classrooms.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/learning/", include("apps.learning.urls")),
    path("api/wishlist/", include("apps.wishlist.urls")),
    path("api/shop/", include("apps.shop.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/public/", include("apps.public.urls")),
    path("api/referentials/", include("apps.referentials.urls")),
    # path("api/core/presign/", include("apps.core.views.presign_upload")),
    path("api/core/presign/", presign_upload, name="presign-upload"),
    path("api/health/", health, name="health"),
]

# Documentation de l'API : seulement si ALLOW_API_DOCS (activée en local, fermée en staging/prod).
if settings.ALLOW_API_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]
