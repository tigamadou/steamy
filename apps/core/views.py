# core/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.core.storage_utils import get_presigned_post_for_upload

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
