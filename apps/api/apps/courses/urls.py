# apps/courses/urls.py
from rest_framework.routers import DefaultRouter

from .views import (
    CourseViewSet,
    LessonViewSet,
    ModuleViewSet,
    PathViewSet,
    ResourceViewSet,
)

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"modules", ModuleViewSet, basename="module")
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"resources", ResourceViewSet, basename="resource")
router.register(r"paths", PathViewSet)

urlpatterns = router.urls
