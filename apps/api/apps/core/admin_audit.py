"""
Journal d'audit de l'admin Django (LOT-6 6.1) : toute écriture du personnel est tracée dans `AuditLog`.

`AuditedAdminMixin` est la base de tous les `ModelAdmin` : `SteamyAdminSite.register` l'ajoute à toute classe qui
ne l'a pas, y compris celles des apps tierces.
"""

import functools

from .audit import audit

#: Nombre maximal d'identifiants journalisés pour une action groupée.
MAX_ACTION_IDS = 500


class AuditedAdminMixin:
    """Ajout, modification (champs changés), suppression et actions → `AuditLog` (acteur, cible, données, IP)."""

    def log_addition(self, request, obj, message):
        audit("admin.add", request=request, target=obj, data={"object": str(obj)})
        return super().log_addition(request, obj, message)

    def log_change(self, request, obj, message):
        audit(
            "admin.change",
            request=request,
            target=obj,
            data={"object": str(obj), "changes": message},
        )
        return super().log_change(request, obj, message)

    def log_deletions(self, request, queryset):
        for obj in queryset:
            audit("admin.delete", request=request, target=obj, data={"object": str(obj)})
        return super().log_deletions(request, queryset)

    def get_actions(self, request):
        actions = super().get_actions(request)
        return {
            name: (
                # Les suppressions groupées sont journalisées objet par objet (`log_deletions`)
                func if name == "delete_selected" else self._audited_action(func, name),
                name,
                description,
            )
            for name, (func, _, description) in actions.items()
        }

    def _audited_action(self, func, name):
        label = self.model._meta.label_lower

        @functools.wraps(func)
        def action(modeladmin, request, queryset):
            ids = [str(pk) for pk in queryset.values_list("pk", flat=True)[:MAX_ACTION_IDS]]
            audit(
                "admin.action",
                request=request,
                data={"action": name, "model": label, "ids": ids, "count": queryset.count()},
            )
            return func(modeladmin, request, queryset)

        return action
