# courses/views.py
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from apps.courses.models import Course  # si pas déjà importé

from .models import Course, Lesson, Module, Path, Resource
from .permissions import IsTeacherOrAdmin
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    LessonSerializer,
    ModuleSerializer,
    PathSerializer,
    ResourceSerializer,
)


class IsAuthorOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admins can do everything, authors can modify their own courses
        if request.user and request.user.is_staff:
            return True
        # some models have author field (Course)
        author = getattr(obj, "author", None)
        return author is not None and author.id == request.user.id


class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or getattr(request.user, "role", None) == "teacher"


class PathViewSet(viewsets.ModelViewSet):
    queryset = Path.objects.all()
    serializer_class = PathSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("author", "path").prefetch_related("modules")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin, IsAuthorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "price", "title"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action in ["list"]:
            return CourseListSerializer
        return CourseDetailSerializer
    # ... reste inchangé ...

    def perform_create(self, serializer):
        # si user non-staff => l'author sera le user
        author = None if self.request.user.is_staff else self.request.user
        serializer.save(author=author)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, *args, **kwargs):
        """
        Action simple pour inscrire l'utilisateur courant au cours.
        Retourne 201 si créé, 200 si existe déjà.
        """
        course = self.get_object()
        from apps.learning.models import Enrollment
        user = request.user
        en, created = Enrollment.objects.get_or_create(user=user, course=course)
        if created:
            return Response({"ok": True, "created": True}, status=201)
        return Response({"ok": True, "created": False}, status=200)


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related("course")
    serializer_class = ModuleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin, IsAuthorOrAdmin]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def _resolve_course(self, serializer):
        # 1) try validated_data
        course = serializer.validated_data.get("course")
        if course:
            return course
        # 2) try common nested kwarg names
        course_pk = self.kwargs.get("course_pk") or self.kwargs.get(
            "course_id") or self.kwargs.get("pk")
        course_slug = self.kwargs.get("course_slug") or self.kwargs.get("slug")
        if course_pk:
            try:
                return Course.objects.get(pk=course_pk)
            except Course.DoesNotExist:
                raise NotFound("Parent course not found (pk=%s)" % course_pk)
        if course_slug:
            try:
                return Course.objects.get(slug=course_slug)
            except Course.DoesNotExist:
                raise NotFound("Parent course not found (slug=%s)" % course_slug)
        # nothing found
        return None

    def perform_create(self, serializer):
        course = self._resolve_course(serializer)
        user = self.request.user

        # sanity: course must be provided somehow
        if course is None:
            raise PermissionDenied("course is required to create a module")

        # permission check: only staff, course author or teacher can create
        if not (user.is_staff or (course.author_id and course.author_id == user.id) or getattr(user, "role", None) == "teacher"):
            raise PermissionDenied("Only course author or admin (or teacher) can add modules")

        # save: if course was not in validated_data (nested route), pass it explicitly
        if "course" in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(course=course)


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("module__course")
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin, IsAuthorOrAdmin]

    def _resolve_module_and_course(self, serializer):
        module = serializer.validated_data.get("module")
        if module:
            return module, module.course
        # try nested kwarg names for module or course
        module_pk = self.kwargs.get("module_pk") or self.kwargs.get("module_id")
        if module_pk:
            try:
                m = Module.objects.get(pk=module_pk)
                return m, m.course
            except Module.DoesNotExist:
                raise NotFound("Parent module not found (pk=%s)" % module_pk)
        # try nested under course + module id in body - fallback
        return None, None

    def perform_create(self, serializer):
        module, course = self._resolve_module_and_course(serializer)
        user = self.request.user
        if module is None:
            raise PermissionDenied("module is required to create a lesson")
        if not (user.is_staff or (course.author_id and course.author_id == user.id) or getattr(user, "role", None) == "teacher"):
            raise PermissionDenied("Only course author or admin (or teacher) can add lessons")
        if "module" in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(module=module)


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related("lesson")
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin, IsAuthorOrAdmin]

    def _resolve_lesson_and_course(self, serializer):
        lesson = serializer.validated_data.get("lesson")
        if lesson:
            return lesson, lesson.module.course
        lesson_pk = self.kwargs.get("lesson_pk") or self.kwargs.get("lesson_id")
        if lesson_pk:
            try:
                l = Lesson.objects.get(pk=lesson_pk)
                return l, l.module.course
            except Lesson.DoesNotExist:
                raise NotFound("Parent lesson not found (pk=%s)" % lesson_pk)
        return None, None

    def perform_create(self, serializer):
        lesson, course = self._resolve_lesson_and_course(serializer)
        user = self.request.user
        if lesson is None:
            raise PermissionDenied("lesson is required to create a resource")
        if not (user.is_staff or (course.author_id and course.author_id == user.id) or getattr(user, "role", None) == "teacher"):
            raise PermissionDenied("Only course author or admin (or teacher) can add resources")
        if "lesson" in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(lesson=lesson)
