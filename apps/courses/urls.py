# apps/courses/urls.py
from rest_framework.routers import DefaultRouter
from .views import (
    PathViewSet,
    CourseViewSet,
    ModuleViewSet,
    LessonViewSet,
    ResourceViewSet,
)

router = DefaultRouter()
router.register(r'paths', PathViewSet)
router.register(r'', CourseViewSet)  # courses à la racine
router.register(r'modules', ModuleViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'resources', ResourceViewSet)

urlpatterns = router.urls
