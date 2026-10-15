# apps/analytics/views.py

from rest_framework import mixins, permissions, viewsets

from .models import TrackingEvent
from .serializers import TrackingEventSerializer


class TrackingEventViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Ingestion des événements de télémétrie, en ÉCRITURE SEULE (S3) : personne ne lit, ne
    modifie ni ne supprime les événements par l'API. L'utilisateur est celui de la session,
    jamais une valeur fournie par le client. Plafonné par le throttling global (S9).
    """

    queryset = TrackingEvent.objects.all()
    serializer_class = TrackingEventSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)
