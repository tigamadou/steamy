# apps/learning/views.py
from rest_framework import filters, mixins, permissions, viewsets

from apps.courses.views import enrolled_course_filter

from .models import Attempt, Certificate, Choice, Enrollment, Progress, Question, Quiz
from .serializers import (
    AttemptCreateSerializer,
    AttemptSerializer,
    CertificateSerializer,
    ChoiceSerializer,
    EnrollmentSerializer,
    ProgressSerializer,
    QuestionSerializer,
    QuizSerializer,
)


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        owner = (
            getattr(obj, "user", None)
            or getattr(obj, "enrollment", None)
            and getattr(obj.enrollment, "user", None)
        )
        return owner and owner.id == request.user.id


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("user", "course")
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Ni modification ni suppression par le client : statut et progression sont calculés.
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProgressViewSet(viewsets.ModelViewSet):
    queryset = Progress.objects.select_related("lesson", "enrollment")
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Certificate.objects.select_related("enrollment", "enrollment__user")
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]


# Quiz, questions et choix : lecture seule, réservée aux inscrits du parcours (S8).
# La création de contenu pédagogique passe par le back-office.
class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Quiz.objects.none()
        filters_ = enrolled_course_filter(self.request.user, "course__")
        return Quiz.objects.filter(**filters_).prefetch_related("questions__choices").distinct()


class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Question.objects.none()
        filters_ = enrolled_course_filter(self.request.user, "quiz__course__")
        return Question.objects.filter(**filters_).prefetch_related("choices").distinct()


class ChoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Choice.objects.none()
        filters_ = enrolled_course_filter(self.request.user, "question__quiz__course__")
        return Choice.objects.filter(**filters_).distinct()


# Tentatives : création et lecture seulement. Le score est toujours calculé par le serveur
# (S8) ; il n'y a plus de correction manuelle.
class AttemptViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Attempt.objects.select_related("quiz", "user")
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action in ["create"]:
            return AttemptCreateSerializer
        return AttemptSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
