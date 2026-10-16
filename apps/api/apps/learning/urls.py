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
    path("quizzes/<int:pk>/", views.QuizDetailView.as_view(), name="learning-quiz"),
    path(
        "quizzes/<int:pk>/attempts/",
        views.QuizAttemptCreateView.as_view(),
        name="learning-quiz-attempts",
    ),
    path("attempts/", views.AttemptListView.as_view(), name="learning-attempts"),
    path("attempts/<int:pk>/", views.AttemptDetailView.as_view(), name="learning-attempt"),
    path("activity/", views.ActivityView.as_view(), name="learning-activity"),
    path("badges/", views.BadgeListView.as_view(), name="learning-badges"),
    path("certificates/", views.CertificateListView.as_view(), name="learning-certificates"),
    path(
        "certificates/<int:pk>/download/",
        views.CertificateDownloadView.as_view(),
        name="learning-certificate-download",
    ),
    path("dashboard/", views.DashboardView.as_view(), name="learning-dashboard"),
    path("progress/", views.ProgressView.as_view(), name="learning-progress"),
    path(
        "recommendations/", views.RecommendationListView.as_view(), name="learning-recommendations"
    ),
]
