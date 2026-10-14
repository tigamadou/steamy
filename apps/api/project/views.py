from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse


@extend_schema(exclude=True)
@api_view(["GET"])
def api_root(request, format=None):
    return Response(
        {
            "users": reverse("user-list", request=request, format=format),
        }
    )
