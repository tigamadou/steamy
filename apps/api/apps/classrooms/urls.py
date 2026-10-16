from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("", views.ClassroomViewSet, basename="classrooms")

urlpatterns = [
    path("school/", views.SchoolView.as_view(), name="classrooms-school"),
    path(
        "event-applications/",
        views.EventApplicationListView.as_view(),
        name="classrooms-event-applications",
    ),
    path("courses/", views.SupervisedCourseListView.as_view(), name="classrooms-courses"),
    path(
        "courses/<slug:slug>/",
        views.SupervisedCourseDetailView.as_view(),
        name="classrooms-course-detail",
    ),
    *router.urls,
]
