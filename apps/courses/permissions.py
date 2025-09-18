from rest_framework import permissions


class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Autorise création/modification si user.is_staff ou user.role == 'teacher'.
    Lecture reste autorisée aux SAFE_METHODS.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, "is_staff", False):
            return True
        return getattr(user, "role", None) == "teacher"

    def has_object_permission(self, request, view, obj):
        # Pour object-level, autoriser staff, author, ou teacher selon le contexte.
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if getattr(user, "is_staff", False):
            return True
        # si l'objet a un champ "author"
        author = getattr(obj, "author", None)
        if author is not None and author.id == user.id:
            return True
        return getattr(user, "role", None) == "teacher"
