# apps/messaging/middleware.py
import urllib.parse

import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes ?token=<jwt> from the websocket querystring,
    verifies it (SimpleJWT UntypedToken), and populates scope['user'].
    Fallback to anonymous if token invalid or absent.
    """
    async def __call__(self, scope, receive, send):
        # close old DB connections to avoid usage across threads
        close_old_connections()

        query_string = scope.get("query_string", b"").decode()
        qs = urllib.parse.parse_qs(query_string)
        token_list = qs.get("token") or qs.get("access_token") or []
        token = token_list[0] if token_list else None

        if token:
            try:
                # will raise on invalid token
                UntypedToken(token)
                # decode without verification to get user id (safe enough after UntypedToken)
                # Using PyJWT to decode the token payload
                decoded = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get("user_id") or decoded.get("user") or decoded.get("id")
                if user_id:
                    scope["user"] = await get_user(user_id)
                else:
                    scope["user"] = AnonymousUser()
            except (InvalidToken, TokenError, Exception):
                scope["user"] = AnonymousUser()
        else:
            # leave AuthMiddlewareStack to populate scope['user'] from session cookie
            # if session cookie is used, AuthMiddlewareStack will handle it; but if here
            scope["user"] = scope.get("user", AnonymousUser())

        return await super().__call__(scope, receive, send)
