from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("", views.ClassroomViewSet, basename="classrooms")

urlpatterns = [
    path("school/", views.SchoolView.as_view(), name="classrooms-school"),
    path("courses/", views.SupervisedCourseListView.as_view(), name="classrooms-courses"),
    path(
        "courses/<slug:slug>/",
        views.SupervisedCourseDetailView.as_view(),
        name="classrooms-course-detail",
    ),
    path(
        "courses/<slug:slug>/missions/<int:pk>/",
        views.SupervisedMissionView.as_view(),
        name="classrooms-course-mission",
    ),
    path("dashboard/", views.DashboardView.as_view(), name="classrooms-dashboard"),
    path("reviews/", views.ReviewListView.as_view(), name="classrooms-reviews"),
    path("comments/", views.CommentListView.as_view(), name="classrooms-comments"),
    path("learners/<int:pk>/", views.LearnerFollowUpView.as_view(), name="classrooms-learner"),
    path(
        "learners/<int:pk>/comments/",
        views.LearnerCommentView.as_view(),
        name="classrooms-learner-comments",
    ),
    *router.urls,
]
