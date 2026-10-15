"""
Site de l'admin Django du back-office (LOT-6 6.1) : remplace `admin.site` (`SteamyAdminConfig`).

- Accès réservé au personnel dont la session est vérifiée par TOTP (`OTPAdminSite`, D72).
- Connexion WAD15 et enrôlement du TOTP : `apps.core.staff_auth`.
- Tout `ModelAdmin` enregistré hérite d'`AuditedAdminMixin` (journal d'audit).
"""

from django.conf import settings
from django.contrib.admin import ModelAdmin
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django_otp.admin import OTPAdminSite

from . import staff_auth
from .admin_audit import AuditedAdminMixin


class SteamyAdminSite(OTPAdminSite):
    site_header = "Steamy · Back-office"
    site_title = "Steamy · Back-office"
    index_title = "Administration"
    login_form = staff_auth.StaffLoginForm
    login_template = "admin/login.html"

    def __init__(self, name="admin"):
        super().__init__(name)

    def register(self, model_or_iterable, admin_class=None, **options):
        admin_class = admin_class or ModelAdmin
        if not issubclass(admin_class, AuditedAdminMixin):
            admin_class = type(
                admin_class.__name__,
                (AuditedAdminMixin, admin_class),
                {"__module__": admin_class.__module__},
            )
        super().register(model_or_iterable, admin_class, **options)

    def each_context(self, request):
        return {
            **super().each_context(request),
            "site_url": settings.WEB_URL,  # « Voir le site » mène au front
            "pilotage_url": staff_auth.backoffice_url(),
        }

    def get_urls(self):
        enrollment = csrf_protect(never_cache(self.totp_enrollment))
        return [
            path("totp/configuration/", enrollment, name="totp_enrollment"),
            *super().get_urls(),
        ]

    def totp_enrollment(self, request):
        return staff_auth.totp_enrollment(self, request)

    @method_decorator(never_cache)
    def login(self, request, extra_context=None):
        """WAD15 : même logique que `AdminSite.login`, avec la vue du personnel (TOTP, plafonds, audit)."""
        if request.method == "GET" and self.has_permission(request):
            return HttpResponseRedirect(reverse("admin:index", current_app=self.name))
        context = {
            **self.each_context(request),
            "title": "Connexion",
            "subtitle": None,
            "app_path": request.get_full_path(),
            "username": request.user.get_username(),
        }
        if REDIRECT_FIELD_NAME not in request.GET and REDIRECT_FIELD_NAME not in request.POST:
            context[REDIRECT_FIELD_NAME] = reverse("admin:index", current_app=self.name)
        context.update(extra_context or {})
        request.current_app = self.name
        return staff_auth.StaffLoginView.as_view(extra_context=context)(request)
