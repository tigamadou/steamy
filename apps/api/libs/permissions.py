from rest_framework import permissions
from rest_framework.permissions import SAFE_METHODS, IsAdminUser

from apps.core.groups import SUPER_ADMIN
from libs.errors import ApiError


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.

    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object.
        return obj.owner == request.user


class IsAdminUserOrReadOnly(IsAdminUser):
    def has_permission(self, request, view):
        is_admin = super().has_permission(request, view)
        return request.method in SAFE_METHODS or is_admin


class IsStaffVerified(permissions.BasePermission):
    """
    Routes `/api/backoffice/` (D71, D72) : membre du personnel dont la session est vérifiée par TOTP (WAD15) et,
    si la vue en déclare, membre d'un des groupes requis (`IsStaffVerified.of(FINANCE)`). Super-admin et
    superutilisateur passent toujours le contrôle de groupe.

    Anonyme → 401 `NOT_AUTHENTICATED` ; persona → 403 `PERMISSION_DENIED` ; personnel non vérifié → 403
    `OTP_REQUIRED` (le front renvoie vers WAD15) ; groupe insuffisant → 403 `PERMISSION_DENIED`.
    """

    groups: tuple[str, ...] = ()

    @classmethod
    def of(cls, *groups: str) -> type["IsStaffVerified"]:
        return type(cls.__name__, (cls,), {"groups": groups})

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_staff):
            return False
        # `is_verified` est posé par `OTPMiddleware` ; absent (requête hors middleware), la session n'est pas vérifiée
        if not getattr(user, "is_verified", lambda: False)():
            raise ApiError("OTP_REQUIRED")
        if not self.groups or user.is_superuser:
            return True
        return user.groups.filter(name__in=(*self.groups, SUPER_ADMIN)).exists()


class IsParent(permissions.IsAuthenticated):
    """Parent connecté (anonyme : 401 ; autre rôle : 403)."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_parent


class IsLearner(permissions.IsAuthenticated):
    """Apprenant connecté (anonyme : 401 ; autre rôle : 403)."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_learner
