from django.urls import path

from .views.me import MeView
from .views.session import CsrfView, LoginView, LogoutView

# Chemins hérités de l'ancienne app `user`, gardés le temps du renommage en `/api/auth/` et `/api/accounts/`
# (API-1.2) : le front les appelle encore.
urlpatterns = [
    path("public/user/csrf", CsrfView.as_view(), name="public-user-csrf"),
    path("public/user/session-login", LoginView.as_view(), name="public-user-session-login"),
    path("user/session-logout", LogoutView.as_view(), name="user-session-logout"),
    path("user/my-profile", MeView.as_view(), name="user-my-profile"),
]
