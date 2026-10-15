"""URLconf de test : `backoffice/overview/` factice, protégée comme le sera la vraie (API-L6.4)."""

from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView

from libs.permissions import IsStaffVerified
from project.urls import urlpatterns as project_urlpatterns


class Overview(APIView):
    permission_classes = [IsStaffVerified]

    def get(self, request):
        return Response({"ok": True})


urlpatterns = [path("api/backoffice/overview/", Overview.as_view()), *project_urlpatterns]
