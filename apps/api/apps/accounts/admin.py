from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import LearnerProfile, ParentProfile, TeacherProfile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("id", "__str__", "role", "status", "is_staff", "date_joined")
    list_filter = ("role", "status", "is_staff", "groups")
    search_fields = ("username", "email", "phone", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("is_active", "date_joined", "last_login")
    fieldsets = (
        (None, {"fields": ("role", "status", "username", "phone", "email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name")}),
        ("Personnel", {"fields": ("is_staff", "is_superuser", "groups")}),
        ("Dates", {"fields": ("is_active", "date_joined", "last_login")}),
    )
    # Création depuis l'admin : personnel uniquement. Les personas sont créés par leurs flux (S1, S5).
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2", "groups"),
            },
        ),
    )
    filter_horizontal = ("groups",)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.role, obj.is_staff = None, True
        super().save_model(request, obj, form, change)


for profile in (LearnerProfile, ParentProfile, TeacherProfile):
    admin.site.register(profile, list_display=("user", "created_at"), raw_id_fields=("user",))
