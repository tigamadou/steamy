"""
Saisie du catalogue par le groupe Contenu (WAD09, S5, D71). L'ordre des catégories, projets, niveaux et missions se
règle par glisser-déposer (`order`, django-admin-sortable2). L'arbre Parcours › Projet › Niveau › Mission se parcourt
par pages chaînées (inlines à un niveau, fil d'Ariane vers le parent). Le statut d'un parcours ne change que par les
actions « Publier » (arbre complet exigé, `publication.py`) et « Repasser en brouillon » (confirmation s'il a des
inscrits).
"""

from adminsortable2.admin import (
    CustomInlineFormSet,
    SortableAdminBase,
    SortableAdminMixin,
    SortableTabularInline,
)
from django import forms
from django.contrib import admin, messages
from django.contrib.admin import EmptyFieldListFilter
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from django.utils.translation import ngettext

from apps.core.admin_actions import form_action

from . import publication
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


def admin_link(obj) -> str:
    """Lien vers la fiche d'un objet du catalogue dans l'admin."""
    url = reverse(f"admin:{obj._meta.app_label}_{obj._meta.model_name}_change", args=[obj.pk])
    return format_html('<a href="{}">{}</a>', url, obj)


def breadcrumb(*parents) -> str:
    """Fil d'Ariane vers les parents d'un élément de l'arbre (S2)."""
    return format_html_join(" › ", "{}", ((admin_link(parent),) for parent in parents))


class UnpublishForm(forms.Form):
    confirm = forms.BooleanField(
        label="Je confirme : les inscrits n'ouvriront plus le contenu jusqu'à une nouvelle publication.",
        required=True,
    )


@admin.register(Course)
class CourseAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "difficulty",
        "access",
        "required_kit",
        "enrollment_count",
        "status",
        "featured",
    )
    list_filter = (
        "status",
        "category",
        "difficulty",
        "is_free",
        ("required_kit", EmptyFieldListFilter),
        "featured",
    )
    search_fields = ("title", "slug", "description")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("status", "created_at", "updated_at")
    autocomplete_fields = ("required_kit",)
    inlines = [ProjectInline]
    actions = ["publish", "unpublish"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(enrollment_total=Count("enrollments"))

    @admin.display(description="Accès", ordering="price")
    def access(self, obj):
        return "Gratuit" if obj.is_free else f"Payant · {obj.price:,} FCFA".replace(",", "\u202f")

    @admin.display(description="Inscrits", ordering="enrollment_total")
    def enrollment_count(self, obj):
        return obj.enrollment_total

    def has_publish_permission(self, request):
        return request.user.has_perm("catalog.publish_course")

    @admin.action(description="Publier", permissions=["publish"])
    def publish(self, request, queryset):
        published = 0
        for course in queryset:
            problems = publication.publish(course, request.user, request)
            if problems:
                self.message_user(
                    request,
                    format_html(
                        "« {} » n'est pas publié :<ul>{}</ul>",
                        course,
                        format_html_join("", "<li>{}</li>", ((problem,) for problem in problems)),
                    ),
                    messages.ERROR,
                )
            else:
                published += 1
        if published:
            self.message_user(
                request,
                ngettext("%d parcours publié.", "%d parcours publiés.", published) % published,
                messages.SUCCESS,
            )

    @admin.action(description="Repasser en brouillon", permissions=["publish"])
    def unpublish(self, request, queryset):
        def apply(_data=None):
            for course in queryset:
                publication.unpublish(course, request.user, request)
            count = queryset.count()
            self.message_user(
                request,
                ngettext(
                    "%d parcours repassé en brouillon.", "%d parcours repassés en brouillon.", count
                )
                % count,
                messages.SUCCESS,
            )

        if not queryset.filter(enrollment_total__gt=0).exists():
            apply()
            return None
        return form_action(
            self,
            request,
            queryset,
            UnpublishForm,
            title="Repasser en brouillon des parcours suivis",
            intro="Ces parcours ont des inscrits : ils n'ouvriront plus le contenu tant que le parcours n'est pas "
            "republié.",
            submit_label="Repasser en brouillon",
            apply=apply,
        )


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
    readonly_fields = ("path",)
    inlines = [LevelInline]

    @admin.display(description="Dans")
    def path(self, obj):
        return breadcrumb(obj.course) if obj.pk else "—"


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
    readonly_fields = ("path",)
    inlines = [MissionInline]

    @admin.display(description="Dans")
    def path(self, obj):
        return breadcrumb(obj.project.course, obj.project) if obj.pk else "—"


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "order", "duration_min", "has_video")
    list_filter = ("level__project__course",)
    search_fields = ("title", "level__title")
    readonly_fields = ("path", "vimeo_preview")

    @admin.display(description="Dans")
    def path(self, obj):
        return breadcrumb(obj.level.project.course, obj.level.project, obj.level) if obj.pk else "—"

    @admin.display(description="Vidéo", boolean=True)
    def has_video(self, obj):
        return bool(obj.vimeo_id)

    @admin.display(description="Aperçu de la vidéo")
    def vimeo_preview(self, obj):
        """Lecteur Vimeo non listé (identifiant validé par le modèle), pour vérifier la vidéo avant publication."""
        if not obj.vimeo_id:
            return "Aucune vidéo."
        src = f"https://player.vimeo.com/video/{obj.vimeo_id}"
        if obj.vimeo_hash:
            src += f"?h={obj.vimeo_hash}"
        return format_html(
            '<iframe src="{}" width="400" height="225" title="Aperçu : {}" allow="fullscreen" '
            'style="border:0"></iframe>',
            src,
            obj.title,
        )


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
