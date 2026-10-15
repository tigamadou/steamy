from django.urls import path

from . import views

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="catalog-categories"),
    path("courses/", views.CourseListView.as_view(), name="catalog-courses"),
    path("courses/<slug:slug>/", views.CourseDetailView.as_view(), name="catalog-course"),
]
