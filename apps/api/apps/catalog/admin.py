"""
Saisie du catalogue par le groupe Contenu (S5, D71). L'ordre des catégories, projets, niveaux et missions se règle
par glisser-déposer (`order`, django-admin-sortable2). Écran détaillé WAD09 : lot 6.3.
"""

from adminsortable2.admin import (
    CustomInlineFormSet,
    SortableAdminBase,
    SortableAdminMixin,
    SortableTabularInline,
)
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db.models import Count

from .models import (
    Badge,
    Category,
    Choice,
    Course,
    Level,
    Mission,
    Project,
    Question,
    Quiz,
)


@admin.register(Category)
class CategoryAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ("label", "slug", "icon", "color", "course_count")
    prepopulated_fields = {"slug": ("label",)}
    filter_horizontal = ("goals",)

    def get_queryset(self, request):
        return (
            super().get_queryset(request).annotate(course_total=Count("courses")).order_by("order")
        )

    @admin.display(description="Parcours", ordering="course_total")
    def course_count(self, obj):
        return obj.course_total


class ProjectInline(SortableTabularInline):
    model = Project
    fields = ("order", "title", "duration_hours")
    extra = 0
    show_change_link = True


@admin.register(Course)
class CourseAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ("title", "category", "difficulty", "is_free", "price", "status", "featured")
    list_filter = ("status", "category", "difficulty", "is_free", "featured")
    search_fields = ("title", "slug", "description")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
    inlines = [ProjectInline]


class LevelInline(SortableTabularInline):
    model = Level
    fields = ("order", "title", "duration_min")
    extra = 0
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ("title", "course", "order", "duration_hours")
    list_filter = ("course",)
    search_fields = ("title", "course__title")
    inlines = [LevelInline]


class MissionInline(SortableTabularInline):
    model = Mission
    fields = ("order", "title", "duration_min", "icon")
    extra = 0
    show_change_link = True


@admin.register(Level)
class LevelAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ("title", "project", "order", "duration_min")
    list_filter = ("project__course",)
    search_fields = ("title", "project__title")
    inlines = [MissionInline]


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "order", "duration_min")
    list_filter = ("level__project__course",)
    search_fields = ("title", "level__title")


class QuestionInline(SortableTabularInline):
    model = Question
    fields = ("order", "text", "concept", "remediation_mission", "weight")
    extra = 0
    show_change_link = True
    autocomplete_fields = ("remediation_mission",)


@admin.register(Quiz)
class QuizAdmin(SortableAdminBase, admin.ModelAdmin):
    """Formative (niveau) ou sommative (projet) ; les réponses se saisissent sur chaque question."""

    list_display = ("__str__", "kind", "level", "project", "threshold")
    list_filter = ("kind",)
    search_fields = ("title", "level__title", "project__title")
    autocomplete_fields = ("level", "project")
    inlines = [QuestionInline]


class SingleCorrectChoiceFormSet(CustomInlineFormSet):
    """Question à choix unique : exactement une bonne réponse."""

    def clean(self):
        super().clean()
        kept = [
            form.cleaned_data
            for form in self.forms
            if form.cleaned_data and not form.cleaned_data.get("DELETE")
        ]
        if sum(1 for data in kept if data.get("is_correct")) != 1:
            raise ValidationError("Cochez exactement une bonne réponse.")


class ChoiceInline(SortableTabularInline):
    model = Choice
    formset = SingleCorrectChoiceFormSet
    fields = ("order", "text", "is_correct")
    extra = 0


@admin.register(Question)
class QuestionAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ("__str__", "quiz", "concept", "order")
    search_fields = ("text", "concept")
    autocomplete_fields = ("quiz", "remediation_mission")
    inlines = [ChoiceInline]


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("label", "icon", "kind", "level", "project", "course")
    list_filter = ("kind",)
    search_fields = ("label",)
    autocomplete_fields = ("level", "project", "course")
