"""Parcours mis de côté par l'apprenant (« Mes souhaits », WW01-WW03, WC01-WC05)."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class WishlistItem(models.Model):
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="wishlist_items",
        verbose_name=_("apprenant"),
    )
    course = models.ForeignKey(
        "catalog.Course", models.CASCADE, related_name="wishlist_items", verbose_name=_("parcours")
    )
    created_at = models.DateTimeField(_("ajouté le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("souhait")
        verbose_name_plural = _("souhaits")
        constraints = [
            models.UniqueConstraint(fields=["learner", "course"], name="wishlist_item_unique")
        ]

    def __str__(self):
        return f"{self.learner} ♥ {self.course}"
