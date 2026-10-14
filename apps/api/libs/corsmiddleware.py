from django import http
from django.conf import settings


class CorsMiddleware:
    """
    CORS de l'API.

    - Origines de CORS_ALLOWED_ORIGINS (le front) : origine renvoyée explicitement
      et cookies autorisés, nécessaires à l'auth par session depuis le navigateur.
    - Autres origines : `*` sans cookies (appels anonymes ou par token uniquement).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS" and "HTTP_ACCESS_CONTROL_REQUEST_METHOD" in request.META:
            response = http.HttpResponse()
            response["Content-Length"] = "0"
            response["Access-Control-Max-Age"] = 86400
        else:
            response = self.get_response(request)

        origin = request.META.get("HTTP_ORIGIN")
        if origin and origin in settings.CORS_ALLOWED_ORIGINS:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
        else:
            response["Access-Control-Allow-Origin"] = "*"
        response["Vary"] = ", ".join(filter(None, [response.get("Vary"), "Origin"]))
        response["Access-Control-Allow-Methods"] = "DELETE, GET, OPTIONS, PATCH, POST, PUT"
        response["Access-Control-Allow-Headers"] = (
            "accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, sentry-trace"
        )
        return response
