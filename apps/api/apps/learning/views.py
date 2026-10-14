# apps/learning/views.py
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related("course")
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("quiz")
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ChoiceViewSet(viewsets.ModelViewSet):
    queryset = Choice.objects.select_related("question")
    serializer_class = ChoiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.select_related("quiz", "user")
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action in ["create"]:
            return AttemptCreateSerializer
        return AttemptSerializer

    def perform_create(self, serializer):
        # ensure user is set to request.user
        serializer.validated_data["user"] = self.request.user
        return super().perform_create(serializer)

    @action(detail=True, methods=["post"])
    def manual_grade(self, request, pk=None):
        # endpoint pour corriger manuellement une tentative
        attempt = self.get_object()
        score = request.data.get("score")
        if score is None:
            return Response({"detail": "score missing"}, status=status.HTTP_400_BAD_REQUEST)
        attempt.score = float(score)
        attempt.passed = attempt.score >= float(attempt.quiz.pass_score)
        attempt.save()
        return Response({"score": attempt.score, "passed": attempt.passed})
