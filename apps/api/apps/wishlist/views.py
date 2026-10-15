"""
Souhaits de l'apprenant (§7.4) : `GET wishlist/`, `PUT` et `DELETE wishlist/{courseSlug}/`, idempotents.

Seuls les parcours publiés s'ajoutent ; un parcours dépublié depuis disparaît de la liste (sans être supprimé).
"""

from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response

from apps.catalog.models import Course
from libs.permissions import IsLearner

from .models import WishlistItem
from .serializers import WishlistItemSerializer, WishlistQuerySerializer

SORTS = {
    "recent": ("-created_at", "-id"),
    "title": ("course__title", "id"),
    "price": ("course__price", "course__title", "id"),
}


@method_decorator(cache_control(private=True, no_store=True), name="dispatch")
class WishlistView(generics.ListAPIView):
    """Mes souhaits (WW01), triés ; parcours publiés seulement."""

    permission_classes = [IsLearner]
    serializer_class = WishlistItemSerializer
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return WishlistItem.objects.none()
        params = WishlistQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return (
            WishlistItem.objects.filter(
                learner=self.request.user, course__status=Course.Status.PUBLISHED
            )
            .select_related("course__category", "course__required_kit")
            .order_by(*SORTS[params.validated_data["sort"]])
        )

    @extend_schema(parameters=[WishlistQuerySerializer])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@method_decorator(cache_control(private=True, no_store=True), name="dispatch")
class WishlistItemView(generics.GenericAPIView):
    permission_classes = [IsLearner]
    serializer_class = WishlistItemSerializer

    @extend_schema(
        request=None, responses={200: WishlistItemSerializer, 201: WishlistItemSerializer}
    )
    def put(self, request, course_slug):
        """Ajoute un parcours publié (WC01-WC05) : 201, ou 200 s'il y était déjà."""
        course = get_object_or_404(Course, slug=course_slug, status=Course.Status.PUBLISHED)
        # `get_or_create` relit l'élément si une requête simultanée l'a créé (contrainte d'unicité)
        item, created = WishlistItem.objects.get_or_create(learner=request.user, course=course)
        return Response(
            WishlistItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, course_slug):
        """Retire un parcours (WW01, annulable par un nouveau `PUT`) : 204, qu'il y soit ou non."""
        WishlistItem.objects.filter(learner=request.user, course__slug=course_slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
