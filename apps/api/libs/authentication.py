from rest_framework import authentication


class SessionAuthentication(authentication.SessionAuthentication):
    """
    Session Django + CSRF (S12). Déclare un schéma d'authentification pour qu'un appel anonyme sur une route
    protégée reçoive 401 `NOT_AUTHENTICATED` (le front redirige vers la connexion) et non 403, réservé aux refus
    d'un utilisateur connecté.
    """

    def authenticate_header(self, request):
        return 'Session realm="api"'


def enforce_csrf(request):
    """Impose le CSRF sur une requête anonyme : DRF ne le vérifie que pour une session déjà ouverte."""
    SessionAuthentication().enforce_csrf(request)
