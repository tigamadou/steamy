# apps/learning/urls.py
from rest_framework.routers import DefaultRouter

from .views import (
    AttemptViewSet,
    CertificateViewSet,
    ChoiceViewSet,
    EnrollmentViewSet,
    ProgressViewSet,
    QuestionViewSet,
    QuizViewSet,
)

router = DefaultRouter()
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"progress", ProgressViewSet)
router.register(r"certificates", CertificateViewSet, basename="certificate")
router.register(r"quizzes", QuizViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"choices", ChoiceViewSet)
router.register(r"attempts", AttemptViewSet)

urlpatterns = router.urls
