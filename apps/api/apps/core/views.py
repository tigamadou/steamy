# core/views.py
from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.storage_utils import get_presigned_post_for_upload


class PresignUploadRequestSerializer(serializers.Serializer):
    filename = serializers.CharField()
    content_type = serializers.CharField(required=False)


class PresignedPostSerializer(serializers.Serializer):
    url = serializers.URLField()
    # Champs à renvoyer tels quels dans le formulaire multipart d'upload
    fields = serializers.DictField(child=serializers.CharField())


class PresignUploadResponseSerializer(serializers.Serializer):
    key = serializers.CharField()
    presign = PresignedPostSerializer()


@extend_schema(request=PresignUploadRequestSerializer, responses=PresignUploadResponseSerializer)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def presign_upload(request):
    """
    POST body: {"filename": "...", "content_type": "image/png"}
    returns: {"key": "...", "presign": {...}}
    """
    filename = request.data.get("filename")
    content_type = request.data.get("content_type")
    if not filename:
        return Response({"detail": "filename required"}, status=400)
    res = get_presigned_post_for_upload(filename, content_type=content_type)
    return Response(res)


class HealthSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok", "degraded"])
    database = serializers.BooleanField()
    cache = serializers.BooleanField()


def _check(probe):
    try:
        probe()
        return True
    except Exception:
        return False


def _ping_database():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")


@extend_schema(responses={200: HealthSerializer, 503: HealthSerializer}, auth=[])
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """
    Sonde de disponibilité (front, Kubernetes readiness probe).
    Renvoie 503 si PostgreSQL ou Redis est injoignable.
    """
    database = _check(_ping_database)
    cache_ok = _check(lambda: cache.get("health-check"))
    ok = database and cache_ok
    data = {"status": "ok" if ok else "degraded", "database": database, "cache": cache_ok}
    return Response(data, status=200 if ok else 503)
