# courses/views.py
from rest_framework import viewsets, permissions, filters
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied

from .models import Path, Course, Module, Lesson, Resource
from .serializers import (
    PathSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    ModuleSerializer,
    LessonSerializer,
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "price", "title"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action in ["list"]:
            return CourseListSerializer
        return CourseDetailSerializer

    def perform_create(self, serializer):
        # set the request user as author if not staff
        serializer.save(author=self.request.user if not self.request.user.is_staff else None)


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related("course")
    serializer_class = ModuleSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsTeacherOrAdmin, IsAuthorOrAdmin]

    def create(self, request, *args, **kwargs):
        # leave default behaviour; useful if some other code blocked create
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        course = serializer.validated_data.get("course")
        if course is None:
            raise PermissionDenied("course is required")
        user = self.request.user
        if user.is_staff or (course.author_id is not None and course.author_id == user.id):
            serializer.save()
        else:
            raise PermissionDenied("Only course author or admin can add modules")


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("module__course")
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrAdmin]


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related("lesson")
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrAdmin]

    def perform_create(self, serializer):
        # you may want to add additional validation for file vs external_url
        serializer.save()
