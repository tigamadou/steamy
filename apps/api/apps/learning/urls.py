from django.urls import path

from . import views

urlpatterns = [
    path("enrollments/", views.EnrollmentListView.as_view(), name="learning-enrollments"),
    path(
        "enrollments/<slug:course_slug>/tree/",
        views.EnrollmentTreeView.as_view(),
        name="learning-enrollment-tree",
    ),
    path("projects/<int:pk>/", views.ProjectDetailView.as_view(), name="learning-project"),
    path("levels/<int:pk>/", views.LevelDetailView.as_view(), name="learning-level"),
    path("missions/<int:pk>/", views.MissionDetailView.as_view(), name="learning-mission"),
    path(
        "missions/<int:pk>/complete/",
        views.MissionCompleteView.as_view(),
        name="learning-mission-complete",
    ),
]
