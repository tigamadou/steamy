# apps/courses/urls.py
from rest_framework.routers import SimpleRouter

from .views import (
    CourseViewSet,
    LessonViewSet,
    ModuleViewSet,
    ResourceViewSet,
)

router = SimpleRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"modules", ModuleViewSet, basename="module")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"resources", ResourceViewSet, basename="resource")

urlpatterns = router.urls
