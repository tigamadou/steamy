"""
Identité et comptes (SPEC-TECHNIQUE §3.1, ADR 0001).

Un seul modèle `User` pour les trois personas et le personnel. Les identifiants (`username`, `phone`, `email`) sont
nullables : l'unicité et la présence de l'identifiant propre à chaque rôle sont tenues par la base.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from libs.phone import E164_REGEX, normalize_phone

from .validators import HAS_LETTER_REGEX, USERNAME_REGEX, validate_username


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, password=None, **fields):
        user = self.model(**fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_learner(self, username, password=None, **fields):
        return self._create(password, role=User.Role.LEARNER, username=username, **fields)

    def create_parent(self, phone, password=None, **fields):
        return self._create(password, role=User.Role.PARENT, phone=phone, **fields)

    def create_teacher(self, email, password=None, **fields):
        return self._create(password, role=User.Role.TEACHER, email=email, **fields)

    def create_staff(self, email, password=None, **fields):
        return self._create(password, role=None, email=email, is_staff=True, **fields)

    # Utilisés par Django (`createsuperuser`, admin) : ils ne créent que du personnel.
    def create_user(self, email, password=None, **fields):
        return self.create_staff(email, password, **fields)

    def create_superuser(self, email, password=None, **fields):
        return self.create_staff(email, password, is_superuser=True, **fields)

    def get_by_natural_key(self, email):
        return self.get(email__iexact=email)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        LEARNER = "learner", "Apprenant"
        PARENT = "parent", "Parent"
        TEACHER = "teacher", "Enseignant"

    class Status(models.TextChoices):
        PENDING = "pending", "En attente de consentement"
        ACTIVE = "active", "Actif"
        SUSPENDED = "suspended", "Suspendu"
        DEACTIVATED = "deactivated", "Désactivé"
        ANONYMIZED = "anonymized", "Anonymisé"

    #: Statuts qui laissent le compte actif au sens de Django (`is_active`).
    ACTIVE_STATUSES = (Status.PENDING, Status.ACTIVE)

    role = models.CharField(_("rôle"), max_length=16, choices=Role.choices, null=True, blank=True)
    username = models.CharField(
        _("identifiant"), max_length=30, null=True, blank=True, validators=[validate_username]
    )
    phone = models.CharField(_("téléphone"), max_length=16, null=True, blank=True)
    email = models.EmailField(
        _("adresse email"), max_length=255, unique=True, null=True, blank=True
    )
    first_name = models.CharField(_("prénom"), max_length=150, blank=True)
    last_name = models.CharField(_("nom"), max_length=150, blank=True)
    status = models.CharField(
        _("statut"), max_length=16, choices=Status.choices, default=Status.ACTIVE
    )
    is_staff = models.BooleanField(
        _("personnel"),
        default=False,
        help_text=_("Donne accès à l'admin Django. Le rôle métier passe par les groupes."),
    )
    is_active = models.BooleanField(
        _("actif"),
        default=True,
        editable=False,
        help_text=_("Dérivé du statut : faux si le compte est suspendu, désactivé ou anonymisé."),
    )
    date_joined = models.DateTimeField(_("date d'inscription"), default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _("utilisateur")
        verbose_name_plural = _("utilisateurs")
        ordering = ["id"]
        constraints = [
            # Unicités conditionnelles, insensibles à la casse (C7)
            models.UniqueConstraint(
                Lower("username"),
                condition=Q(username__isnull=False),
                name="accounts_user_username_unique",
            ),
            models.UniqueConstraint(
                fields=["phone"],
                condition=Q(phone__isnull=False),
                name="accounts_user_phone_unique",
            ),
            models.UniqueConstraint(
                Lower("email"),
                condition=Q(email__isnull=False),
                name="accounts_user_email_unique",
            ),
            # Formats
            models.CheckConstraint(
                condition=Q(username__isnull=True)
                | (Q(username__regex=USERNAME_REGEX) & Q(username__regex=HAS_LETTER_REGEX)),
                name="accounts_user_username_format",
            ),
            models.CheckConstraint(
                condition=Q(phone__isnull=True) | Q(phone__regex=E164_REGEX),
                name="accounts_user_phone_e164",
            ),
            # Identifiant propre à chaque rôle (S4) ; rôle nul ⇔ personnel (D71). Un compte anonymisé n'en a
            # plus : l'identifiant est libéré (D40).
            models.CheckConstraint(
                condition=~Q(role="learner") | Q(username__isnull=False) | Q(status="anonymized"),
                name="accounts_user_learner_has_username",
            ),
            models.CheckConstraint(
                condition=~Q(role="parent") | Q(phone__isnull=False) | Q(status="anonymized"),
                name="accounts_user_parent_has_phone",
            ),
            models.CheckConstraint(
                condition=~Q(role="teacher") | Q(email__isnull=False),
                name="accounts_user_teacher_has_email",
            ),
            models.CheckConstraint(
                condition=(Q(role__isnull=True) & Q(is_staff=True) & Q(email__isnull=False))
                # `role IS NOT NULL` explicite : sinon `NULL IN (…)` rend la contrainte indéterminée, donc vraie.
                | (
                    Q(role__isnull=False)
                    & Q(role__in=["learner", "parent", "teacher"])
                    & Q(is_staff=False)
                ),
                name="accounts_user_role_or_staff",
            ),
            # `is_active` dérivé du statut
            models.CheckConstraint(
                condition=Q(is_active=True, status__in=["pending", "active"])
                | Q(is_active=False, status__in=["suspended", "deactivated", "anonymized"]),
                name="accounts_user_is_active_matches_status",
            ),
        ]

    def __str__(self):
        return self.username or self.email or self.phone or f"Utilisateur {self.pk}"

    def save(self, *args, **kwargs):
        # Champs nullables : une chaîne vide (formulaires de l'admin) vaut « absent ».
        self.username = self.username or None
        self.email = (self.email or "").strip().lower() or None
        self.phone = (normalize_phone(self.phone) or self.phone) if self.phone else None
        self.is_active = self.status in self.ACTIVE_STATUSES
        update_fields = kwargs.get("update_fields")
        if update_fields is not None and "status" in update_fields:
            kwargs["update_fields"] = {*update_fields, "is_active"}
        super().save(*args, **kwargs)

    def _get_session_auth_hash(self, secret=None):
        """
        Empreinte qui valide les sessions ouvertes (`django.contrib.auth.get_user`). Pour le personnel, elle inclut
        les secrets TOTP confirmés : réinitialiser le TOTP ferme toutes ses sessions (C20).
        """
        if not self.is_staff:
            return super()._get_session_auth_hash(secret)
        from django.utils.crypto import salted_hmac
        from django_otp.plugins.otp_totp.models import TOTPDevice

        keys = TOTPDevice.objects.filter(user=self, confirmed=True).order_by("id")
        material = "|".join([self.password, *keys.values_list("key", flat=True)])
        return salted_hmac(
            "apps.accounts.User.staff_session_auth_hash",
            material,
            secret=secret,
            algorithm="sha256",
        ).hexdigest()

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or str(self)

    def get_short_name(self):
        return self.first_name or str(self)

    @property
    def is_learner(self):
        return self.role == self.Role.LEARNER

    @property
    def is_parent(self):
        return self.role == self.Role.PARENT

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER


class Gender(models.TextChoices):
    FEMALE = "female", "Femme"
    MALE = "male", "Homme"
    OTHER = "other", "Autre"


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class LearnerProfile(TimestampedModel):
    """
    Profil de l'apprenant. Pas de téléphone (D30). Genre et handicap facultatifs (D6).
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="learner_profile")
    birth_date = models.DateField(_("date de naissance"), null=True, blank=True)
    locality = models.ForeignKey(
        "referentials.Locality", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    school_grade = models.ForeignKey(
        "referentials.SchoolGrade",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    goals = models.ManyToManyField("referentials.Goal", blank=True, related_name="+")
    avatar = models.ForeignKey(
        "referentials.Avatar", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    gender = models.CharField(
        _("genre"), max_length=8, choices=Gender.choices, null=True, blank=True
    )
    disability = models.ForeignKey(
        "referentials.Disability",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    email = models.EmailField(_("email de contact"), null=True, blank=True)
    #: Âge déclaré à l'inscription (W05), contrôlé avec la date de naissance de W11 (D23).
    declared_age = models.PositiveSmallIntegerField(_("âge déclaré"), null=True, blank=True)
    points = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    rank = models.CharField(_("rang"), max_length=32, blank=True)
    public_pseudonym = models.CharField(max_length=30, null=True, blank=True)
    #: Opt-in parental à l'affichage public (D15).
    public_display_allowed = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("profil apprenant")
        verbose_name_plural = _("profils apprenants")

    def __str__(self):
        return f"Profil apprenant de {self.user}"


class ParentProfile(TimestampedModel):
    """Profil du parent. `email` sert au rapport hebdomadaire (D55), pas à la connexion (S4)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="parent_profile")
    email = models.EmailField(_("email de contact"), null=True, blank=True)
    locality = models.ForeignKey(
        "referentials.Locality", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    profession = models.CharField(max_length=120, blank=True)
    gender = models.CharField(
        _("genre"), max_length=8, choices=Gender.choices, null=True, blank=True
    )
    disability = models.ForeignKey(
        "referentials.Disability",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    goals_for_children = models.ManyToManyField("referentials.Goal", blank=True, related_name="+")
    #: WP09 « Nombre d'enfants à inscrire ».
    children_to_enroll = models.PositiveSmallIntegerField(
        _("enfants à inscrire"), null=True, blank=True
    )
    #: Mobile Money préféré (WPD08), prérempli au paiement (WPD15, WK06). Le pays est celui du réseau.
    mobile_money_network = models.ForeignKey(
        "referentials.PaymentNetwork",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    mobile_money_phone = models.CharField(
        _("numéro Mobile Money"), max_length=16, null=True, blank=True
    )

    class Meta:
        verbose_name = _("profil parent")
        verbose_name_plural = _("profils parents")

    def __str__(self):
        return f"Profil parent de {self.user}"


class TeacherProfile(TimestampedModel):
    """Profil de l'enseignant, créé sur invitation (S5), rattaché à une école (C6)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    school = models.ForeignKey(
        "classrooms.School",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teachers",
    )
    phone = models.CharField(_("téléphone de contact"), max_length=16, null=True, blank=True)
    specialty = models.CharField(_("spécialité"), max_length=120, blank=True)
    bio = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("profil enseignant")
        verbose_name_plural = _("profils enseignants")

    def __str__(self):
        return f"Profil enseignant de {self.user}"


class OtpChallenge(TimestampedModel):
    """
    Code à usage unique envoyé par SMS (D24) : 6 chiffres, 5 min, 3 essais, renvoi après 60 s. Les valeurs viennent
    de `PlatformSettings` ; le code n'est jamais stocké en clair. `id` (UUID) est le `challengeId` donné au front.
    `data` garde ce que le flux ne crée qu'après un code valide (ex. prénom et nom du parent, C13).
    """

    class Purpose(models.TextChoices):
        PARENT_SIGNUP = "parent_signup", "Inscription parent"
        PASSWORD_RESET = "password_reset", "Mot de passe oublié"
        PHONE_CHANGE = "phone_change", "Changement de numéro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(_("téléphone"), max_length=16, blank=True)
    #: Code envoyé par email plutôt que par SMS (mot de passe oublié de l'enseignant, C6).
    email = models.EmailField(_("email"), blank=True)
    #: Compte concerné (mot de passe oublié) ; nul si la saisie ne désigne aucun compte.
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    purpose = models.CharField(_("objet"), max_length=16, choices=Purpose.choices)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("code OTP")
        verbose_name_plural = _("codes OTP")
        indexes = [models.Index(fields=["phone", "purpose"])]

    def __str__(self):
        return f"OTP {self.get_purpose_display()} ({self.created_at:%Y-%m-%d %H:%M})"


class SignupSession(TimestampedModel):
    """
    Inscription d'un apprenant en cours (D21) : compte `pending` sans mot de passe, plus un **code de reprise** haché,
    affiché une seule fois et non régénérable (C14). Supprimée à l'activation ; à l'expiration, le compte en attente
    est purgé et l'identifiant libéré (`purge_signup_sessions`).
    """

    learner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="signup_session")
    resume_code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = _("inscription en cours")
        verbose_name_plural = _("inscriptions en cours")

    def __str__(self):
        return f"Inscription en cours de {self.learner}"


class ConsentRequest(TimestampedModel):
    """
    Demande de consentement parental (§3.1, §4.2). `subject` fige ce que le parent voit (D20) : prénom, nom,
    identifiant, âge, lien de parenté. Le jeton du lien SMS n'est stocké que haché.
    """

    class Origin(models.TextChoices):
        LEARNER = "learner", "Apprenant"
        PARENT = "parent", "Parent"
        TEACHER = "teacher", "Enseignant"

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        ACCEPTED = "accepted", "Acceptée"
        REFUSED = "refused", "Refusée"
        EXPIRED = "expired", "Expirée"
        CANCELLED = "cancelled", "Annulée"

    origin = models.CharField(_("origine"), max_length=8, choices=Origin.choices)
    subject = models.JSONField(_("enfant (instantané)"), default=dict)
    learner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consent_requests",
    )
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    parent_phone = models.CharField(_("téléphone du parent"), max_length=16)
    parent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_consent_requests",
    )
    relationship = models.ForeignKey(
        "referentials.Relationship", on_delete=models.PROTECT, related_name="+"
    )
    status = models.CharField(
        _("statut"), max_length=10, choices=Status.choices, default=Status.PENDING
    )
    token_hash = models.CharField(max_length=64, blank=True, db_index=True)
    expires_at = models.DateTimeField()
    last_sent_at = models.DateTimeField(null=True, blank=True)
    refusal_reason = models.ForeignKey(
        "referentials.RefusalReason",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    refusal_note = models.TextField(_("précisions du refus"), blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("demande de consentement")
        verbose_name_plural = _("demandes de consentement")
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["parent_phone", "status"])]
        constraints = [
            models.UniqueConstraint(
                fields=["learner"],
                condition=Q(status="pending"),
                name="accounts_consent_one_pending_per_learner",
            ),
        ]

    def __str__(self):
        return f"Demande {self.get_origin_display().lower()} du {self.created_at:%Y-%m-%d} ({self.status})"


class ParentChildLink(TimestampedModel):
    """Lien parent ↔ apprenant : **un parent par apprenant**, à tout âge (S3) ; changement par la modération (D22)."""

    parent = models.ForeignKey(User, on_delete=models.CASCADE, related_name="children_links")
    learner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="parent_link")
    relationship = models.ForeignKey(
        "referentials.Relationship", on_delete=models.PROTECT, related_name="+"
    )
    consent_request = models.ForeignKey(
        ConsentRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        verbose_name = _("lien parent-enfant")
        verbose_name_plural = _("liens parent-enfant")

    def __str__(self):
        return f"{self.parent} → {self.learner}"


class PasswordResetToken(TimestampedModel):
    """Jeton remis après un code valide (WL03), échangé contre un nouveau mot de passe (WL04). Stocké haché."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="+")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = _("jeton de réinitialisation")
        verbose_name_plural = _("jetons de réinitialisation")

    def __str__(self):
        return f"Réinitialisation de {self.user}"


class DeletionRequest(TimestampedModel):
    """
    Suppression d'un compte (D40, D54). L'apprenant la demande (WD15) et son parent la valide ; le parent supprime
    aussi un enfant de lui-même (WPD09), ou son propre compte s'il n'a plus d'enfant rattaché. Programmée : le compte
    est désactivé aussitôt, puis anonymisé à `scheduled_for` (J+30, `anonymize_due_accounts`) ; annulable d'ici là.
    """

    class Status(models.TextChoices):
        PENDING_PARENT = "pending_parent", "En attente du parent"
        SCHEDULED = "scheduled", "Programmée"
        REFUSED = "refused", "Refusée par le parent"
        CANCELLED = "cancelled", "Annulée"
        DONE = "done", "Effectuée"

    #: Statuts d'une demande encore ouverte : une seule par compte.
    OPEN_STATUSES = (Status.PENDING_PARENT, Status.SCHEDULED)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deletion_requests")
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    status = models.CharField(_("statut"), max_length=16, choices=Status.choices)
    reason = models.ForeignKey(
        "referentials.DeletionReason",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    note = models.TextField(_("précisions"), blank=True)
    scheduled_for = models.DateTimeField(_("anonymisation prévue le"), null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("demande de suppression")
        verbose_name_plural = _("demandes de suppression")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(status__in=["pending_parent", "scheduled"]),
                name="accounts_deletion_one_open_per_user",
            ),
        ]

    def __str__(self):
        return f"Suppression de {self.user} ({self.status})"
