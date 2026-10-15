"""
Connexion du personnel à l'admin Django (WAD15, D72) : email, mot de passe et code TOTP à 6 chiffres.

- Un membre sans appareil confirmé n'obtient aucune session : après son mot de passe, il enrôle son application
  d'authentification (QR code, confirmé par un premier code), puis il est connecté.
- Plafonds par IP et par email (S9) ; connexions, échecs et enrôlements journalisés dans `AuditLog`.
- Session du personnel limitée à 8 h (C20) ; elle tombe si le compte est désactivé ou le TOTP réinitialisé
  (`User._get_session_auth_hash`).
- `next` : chemins de l'admin, ou `WEB_URL/backoffice` (pages Next.js du back-office), aucun autre hôte.
"""

import hashlib
import time
from base64 import b32encode
from urllib.parse import urlsplit

from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth import login as auth_login
from django.contrib.auth.views import LoginView
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import reverse
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.qr import write_qrcode_image
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.models import User

from .audit import audit

#: Clé de session de l'enrôlement en cours : mot de passe vérifié, appareil pas encore confirmé.
ENROLLMENT_SESSION_KEY = "staff_totp_enrollment"
#: Durée laissée pour scanner le QR code et saisir le premier code.
ENROLLMENT_MAX_AGE = 10 * 60
DEVICE_NAME = "Application d'authentification"
STAFF_BACKEND = "apps.accounts.backends.StaffBackend"

TOTP_WIDGET_ATTRS = {
    "inputmode": "numeric",
    "autocomplete": "one-time-code",
    "pattern": "[0-9]{6}",
    "maxlength": "6",
    "placeholder": "123456",
}


def limit_staff_session(sender, request, user, **kwargs):
    """Signal `user_logged_in` : la session du personnel expire après 8 h (C20)."""
    if user.is_staff:
        request.session.set_expiry(settings.STAFF_SESSION_AGE)


def confirmed_device(user) -> TOTPDevice | None:
    return TOTPDevice.objects.filter(user=user, confirmed=True).order_by("id").first()


def verify_totp(device: TOTPDevice, token: str) -> str | None:
    """Vérifie un code (rejeu et essais en rafale refusés) ; renvoie la raison du refus, ou `None`."""
    with transaction.atomic():
        device = TOTPDevice.objects.select_for_update().get(pk=device.pk)
        allowed, _ = device.verify_is_allowed()
        if not allowed:
            return "otp_throttled"
        # Un échec incrémente le compteur d'essais de l'appareil : il doit être enregistré (pas d'exception ici).
        return None if device.verify_token(token) else "otp_invalid"


# --- Plafonds (S9) -----------------------------------------------------------------------------------------------


class StaffLoginIPThrottle(SimpleRateThrottle):
    scope = "staff-login"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class StaffLoginEmailThrottle(SimpleRateThrottle):
    scope = "staff-login-email"

    def get_cache_key(self, request, view):
        email = request.POST.get("username", "").strip().lower()
        if not email:
            return None
        digest = hashlib.sha256(email.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}


def login_throttled(request) -> bool:
    return not all(
        throttle().allow_request(request, None)
        for throttle in (StaffLoginIPThrottle, StaffLoginEmailThrottle)
    )


# --- Formulaires --------------------------------------------------------------------------------------------------


class StaffLoginForm(AdminAuthenticationForm):
    username = forms.EmailField(
        label="Email professionnel",
        max_length=255,
        widget=forms.EmailInput(attrs={"autofocus": True, "autocomplete": "username"}),
    )
    password = forms.CharField(
        label="Mot de passe",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )
    otp_token = forms.CharField(
        label="Code de vérification (2FA)",
        required=False,
        max_length=6,
        help_text="Saisissez le code de votre application d'authentification.",
        widget=forms.TextInput(attrs=TOTP_WIDGET_ATTRS),
    )

    error_messages = {
        "invalid_login": "Email ou mot de passe incorrect.",
        "inactive": "Ce compte est désactivé.",
        "otp_missing": "Saisissez le code à 6 chiffres de votre application d'authentification.",
        "otp_invalid": "Code de vérification incorrect ou déjà utilisé.",
        "otp_throttled": "Trop de codes incorrects : patientez quelques instants avant de réessayer.",
        "throttled": "Trop de tentatives de connexion : réessayez dans quelques minutes.",
    }

    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        #: Raison du dernier refus, journalisée par la vue
        self.failure: str | None = None
        #: Mot de passe correct mais aucun appareil TOTP confirmé : enrôlement à faire
        self.needs_enrollment = False

    def clean(self):
        try:
            super().clean()
        except ValidationError:
            self.failure = "credentials"
            raise
        user = self.get_user()
        device = confirmed_device(user)
        if device is None:
            self.needs_enrollment = True
            return self.cleaned_data
        token = self.cleaned_data.get("otp_token", "").strip()
        self.failure = "otp_missing" if not token else verify_totp(device, token)
        if self.failure:
            raise ValidationError(self.error_messages[self.failure], code=self.failure)
        user.otp_device = device  # vérifie la session à la connexion (signal de django-otp)
        return self.cleaned_data


class TotpConfirmationForm(forms.Form):
    otp_token = forms.CharField(
        label="Premier code de l'application",
        max_length=6,
        help_text="Saisissez le code à 6 chiffres affiché par l'application après le scan.",
        widget=forms.TextInput(attrs={**TOTP_WIDGET_ATTRS, "autofocus": True}),
        error_messages={"required": StaffLoginForm.error_messages["otp_missing"]},
    )


# --- Redirection après connexion ------------------------------------------------------------------------------------


def backoffice_url() -> str:
    return f"{settings.WEB_URL.rstrip('/')}/backoffice"


def safe_next(url: str) -> str:
    """`next` accepté : chemin interne (validé par Django) ou page du back-office Next.js ; sinon rien."""
    if not url:
        return ""
    parts = urlsplit(url)
    if not parts.netloc:
        return url
    web = urlsplit(backoffice_url())
    same_site = (parts.scheme, parts.netloc) == (web.scheme, web.netloc)
    path = parts.path.rstrip("/")
    if same_site and (path == web.path or path.startswith(f"{web.path}/")):
        return url
    return ""


class StaffLoginView(LoginView):
    form_class = StaffLoginForm
    template_name = "admin/login.html"
    next_page = "admin:index"  # `next` absent ou refusé

    def get_success_url_allowed_hosts(self):
        return {*super().get_success_url_allowed_hosts(), urlsplit(settings.WEB_URL).netloc}

    def get_redirect_url(self):
        return safe_next(super().get_redirect_url())

    def post(self, request, *args, **kwargs):
        if login_throttled(request):
            form = self.get_form()
            form.add_error(
                None, ValidationError(form.error_messages["throttled"], code="throttled")
            )
            audit(
                "staff.login_throttled",
                request=request,
                data={"email": request.POST.get("username", "")[:255]},
            )
            response = self.render_to_response(self.get_context_data(form=form))
            response.status_code = 429
            return response
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        user = form.get_user()
        if form.needs_enrollment:
            self.request.session[ENROLLMENT_SESSION_KEY] = {
                "user": user.pk,
                "started": time.time(),
                "next": self.get_redirect_url(),
            }
            audit("staff.totp_enrollment_started", actor=user, request=self.request)
            return redirect("admin:totp_enrollment")
        response = super().form_valid(form)
        audit("staff.login", actor=user, request=self.request)
        return response

    def form_invalid(self, form):
        if form.failure:
            audit(
                "staff.otp_failed" if form.failure.startswith("otp_") else "staff.login_failed",
                actor=form.get_user(),
                request=self.request,
                data={"email": form.data.get("username", "")[:255], "reason": form.failure},
            )
        return super().form_invalid(form)


# --- Enrôlement TOTP ----------------------------------------------------------------------------------------------


def pending_enrollment(request) -> tuple[User, dict] | None:
    """Membre en cours d'enrôlement : mot de passe vérifié il y a moins de 10 min, aucun appareil confirmé."""
    pending = request.session.get(ENROLLMENT_SESSION_KEY)
    if not pending or time.time() - pending["started"] > ENROLLMENT_MAX_AGE:
        return None
    user = User.objects.filter(pk=pending["user"], is_staff=True, is_active=True).first()
    if user is None or confirmed_device(user) is not None:
        return None
    return user, pending


def qr_code_svg(device: TOTPDevice) -> str:
    class Buffer(bytearray):
        def write(self, data):
            self.extend(data if isinstance(data, bytes) else data.encode())

    out = Buffer()
    write_qrcode_image(device.config_url, out)
    return out.decode()


def totp_enrollment(site, request):
    """
    Enrôlement du TOTP (WAD15, première connexion) : un nouveau secret à chaque affichage, invisible une fois
    l'appareil confirmé ; le premier code valide confirme l'appareil et ouvre la session vérifiée.
    """
    found = pending_enrollment(request)
    if found is None:
        request.session.pop(ENROLLMENT_SESSION_KEY, None)
        messages.error(request, "Session de configuration expirée : reconnectez-vous.")
        return redirect("admin:login")
    user, pending = found

    form = TotpConfirmationForm(request.POST or None)
    if request.method == "POST":
        device = TOTPDevice.objects.filter(user=user, confirmed=False).order_by("-id").first()
        if device is None:
            return redirect("admin:totp_enrollment")
        reason = (
            verify_totp(device, form.cleaned_data["otp_token"])
            if form.is_valid()
            else "otp_missing"
        )
        if reason is None:
            device.confirmed = True
            device.save(update_fields=["confirmed"])
            del request.session[ENROLLMENT_SESSION_KEY]
            user.otp_device = device
            auth_login(request, user, backend=STAFF_BACKEND)
            audit("staff.totp_enrolled", actor=user, request=request)
            audit("staff.login", actor=user, request=request)
            return redirect(pending["next"] or reverse("admin:index"))
        audit("staff.otp_failed", actor=user, request=request, data={"reason": "enrollment"})
        if form.is_valid():
            form.add_error("otp_token", StaffLoginForm.error_messages[reason])
    else:
        # Nouveau secret à chaque affichage : un QR code vu auparavant ne sert plus.
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()
        device = TOTPDevice.objects.create(user=user, name=DEVICE_NAME, confirmed=False)

    context = {
        **site.each_context(request),
        "title": "Configurer la double authentification",
        "form": form,
        "qr_code": qr_code_svg(device),
        "secret": b32encode(device.bin_key).decode(),
        "email": user.email,
    }
    request.current_app = site.name
    return TemplateResponse(request, "admin/totp_enrollment.html", context)
