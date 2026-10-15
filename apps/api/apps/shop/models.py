"""
Boutique de kits (SPEC-TECHNIQUE §3.3). Le stock exact reste interne : l'API publique n'expose qu'une disponibilité
booléenne. Zones de livraison et réservations de stock servent la commande (API-L3b.1) ; panier, adresse de
livraison et alertes de réassort viennent de l'API-L3b.3 (D38).
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import Course
from apps.catalog.validators import validate_string_list


class Kit(models.Model):
    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    name = models.CharField(_("nom"), max_length=160)
    category = models.ForeignKey(
        "catalog.Category", models.PROTECT, related_name="kits", verbose_name=_("catégorie")
    )
    price = models.PositiveIntegerField(_("prix (FCFA)"))
    difficulty = models.CharField(_("difficulté"), max_length=12, choices=Course.Difficulty.choices)
    emoji = models.CharField(_("emoji"), max_length=16, blank=True, help_text="Visuel des cartes")
    description = models.TextField(_("description"))
    contents = models.JSONField(
        _("contenu de la boîte"), default=list, blank=True, validators=[validate_string_list]
    )
    images = models.JSONField(
        _("images"),
        default=list,
        blank=True,
        validators=[validate_string_list],
        help_text="URL https ou chemins du stockage, la première sert de couverture",
    )
    compatible_courses = models.ManyToManyField(
        "catalog.Course",
        blank=True,
        related_name="compatible_kits",
        verbose_name=_("parcours compatibles"),
    )
    stock_quantity = models.PositiveIntegerField(_("stock"), default=0)
    active = models.BooleanField(_("en vente"), default=True)
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("kit")
        verbose_name_plural = _("kits")

    def __str__(self):
        return self.name

    @property
    def available(self) -> bool:
        return self.stock_quantity > 0


class DeliveryZone(models.Model):
    """Frais de port par zone, une seule promesse de délai par zone (D38)."""

    country = models.ForeignKey(
        "referentials.Country",
        models.PROTECT,
        to_field="code",
        related_name="delivery_zones",
        verbose_name=_("pays"),
    )
    name = models.CharField(_("nom"), max_length=120, help_text="« Cotonou et Calavi »")
    fee = models.PositiveIntegerField(_("frais de livraison (FCFA)"))
    delay_label = models.CharField(_("délai annoncé"), max_length=80, help_text="« 2 à 3 jours »")
    order = models.PositiveSmallIntegerField(_("ordre"), default=0)
    active = models.BooleanField(_("active"), default=True)

    class Meta:
        ordering = ["country", "order", "name"]
        verbose_name = _("zone de livraison")
        verbose_name_plural = _("zones de livraison")
        constraints = [
            models.UniqueConstraint(fields=["country", "name"], name="delivery_zone_unique"),
        ]

    def __str__(self):
        return f"{self.name} ({self.country_id})"


class StockReservation(models.Model):
    """
    Stock réservé **à la commande** (pas à la demande de paiement, C10) : le stock du kit est décrémenté sous
    verrou à la création de la réservation et rendu si la commande expire sans paiement (30 min, D38).
    """

    kit = models.ForeignKey(Kit, models.PROTECT, related_name="reservations", verbose_name=_("kit"))
    order_item = models.OneToOneField(
        "payments.OrderItem",
        models.CASCADE,
        related_name="stock_reservation",
        verbose_name=_("ligne de commande"),
    )
    quantity = models.PositiveIntegerField(_("quantité"))
    expires_at = models.DateTimeField(_("expire le"))
    confirmed_at = models.DateTimeField(_("confirmée le"), null=True, blank=True)
    released_at = models.DateTimeField(_("libérée le"), null=True, blank=True)
    created_at = models.DateTimeField(_("créée le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("réservation de stock")
        verbose_name_plural = _("réservations de stock")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(confirmed_at__isnull=True) | models.Q(released_at__isnull=True),
                name="stock_reservation_confirmed_or_released",
            ),
        ]

    def __str__(self):
        return f"{self.kit} × {self.quantity}"


class Cart(models.Model):
    """Panier côté serveur d'un utilisateur connecté (D38) ; celui d'un invité vit dans le navigateur."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, models.CASCADE, related_name="cart", verbose_name=_("utilisateur")
    )
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)

    class Meta:
        verbose_name = _("panier")
        verbose_name_plural = _("paniers")

    def __str__(self):
        return f"Panier de {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, models.CASCADE, related_name="items", verbose_name=_("panier"))
    kit = models.ForeignKey(Kit, models.CASCADE, related_name="+", verbose_name=_("kit"))
    quantity = models.PositiveSmallIntegerField(_("quantité"), default=1)
    created_at = models.DateTimeField(_("ajouté le"), auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = _("article du panier")
        verbose_name_plural = _("articles du panier")
        constraints = [models.UniqueConstraint(fields=["cart", "kit"], name="cart_item_unique")]

    def __str__(self):
        return f"{self.kit} × {self.quantity}"


class DeliveryAddress(models.Model):
    """Adresse de livraison enregistrée (WD19, WK05), proposée par défaut à la commande ; la commande en garde une
    copie figée."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="delivery_address",
        verbose_name=_("utilisateur"),
    )
    zone = models.ForeignKey(
        DeliveryZone, models.PROTECT, related_name="+", verbose_name=_("zone de livraison")
    )
    recipient_name = models.CharField(_("destinataire"), max_length=150)
    phone = models.CharField(_("téléphone"), max_length=16, blank=True)
    city = models.CharField(_("ville"), max_length=80)
    district = models.CharField(_("quartier"), max_length=80, blank=True)
    address_line = models.CharField(_("adresse"), max_length=255)
    updated_at = models.DateTimeField(_("modifiée le"), auto_now=True)

    class Meta:
        verbose_name = _("adresse de livraison")
        verbose_name_plural = _("adresses de livraison")

    def __str__(self):
        return f"{self.recipient_name}, {self.city}"


class RestockAlert(models.Model):
    """
    « Prévenez-moi » sur un kit en rupture (WK11) : **un seul** SMS pour un invité ou un parent (D38) ;
    notification dans l'application pour un apprenant, qui n'a pas de téléphone (D30).
    """

    kit = models.ForeignKey(
        Kit, models.CASCADE, related_name="restock_alerts", verbose_name=_("kit")
    )
    phone = models.CharField(_("téléphone"), max_length=16, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("utilisateur"),
    )
    notified_at = models.DateTimeField(_("prévenu le"), null=True, blank=True)
    created_at = models.DateTimeField(_("demandée le"), auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = _("alerte de réassort")
        verbose_name_plural = _("alertes de réassort")
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(phone="") | models.Q(user__isnull=False),
                name="restock_alert_has_recipient",
            ),
            # Une seule alerte en attente par destinataire et par kit
            models.UniqueConstraint(
                fields=["kit", "phone"],
                condition=models.Q(notified_at__isnull=True, user__isnull=True),
                name="restock_alert_unique_phone",
            ),
            models.UniqueConstraint(
                fields=["kit", "user"],
                condition=models.Q(notified_at__isnull=True, user__isnull=False),
                name="restock_alert_unique_user",
            ),
        ]

    def __str__(self):
        return f"{self.kit} · {self.user or self.phone}"
