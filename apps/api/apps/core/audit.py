from .models import AuditLog


def client_ip(request) -> str | None:
    # Derrière l'ingress Traefik, REMOTE_ADDR est celle du proxy : on garde l'adresse transmise la plus proche.
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (
        (forwarded.split(",")[0].strip() or None) if forwarded else request.META.get("REMOTE_ADDR")
    )


def audit(action: str, *, actor=None, target=None, data=None, request=None) -> AuditLog:
    """Journalise une action sensible. `target` : instance de modèle concernée (facultative)."""
    if request is not None and actor is None and getattr(request, "user", None):
        actor = request.user if request.user.is_authenticated else None
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.label_lower if target is not None else "",
        target_id=str(target.pk) if target is not None else "",
        data=data or {},
        ip=client_ip(request) if request is not None else None,
    )
