class OwnedByRequestUserMixin:
    """
    Restreint le queryset d'une vue aux objets de l'utilisateur connecté (S4).

    L'objet d'autrui n'existe pas pour l'appelant : 404 plutôt que 403, ce qui ne révèle
    pas son existence. Le personnel n'a pas de passe-droit ici : il passe par le back-office.
    """

    #: Chemin ORM de l'objet vers son propriétaire, par exemple "user" ou "enrollment__user".
    owner_field = "user"

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return queryset.none()
        return queryset.filter(**{self.owner_field: self.request.user})
