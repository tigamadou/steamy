from rest_framework import serializers

from .models import Category, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "category",
            "tone",
            "icon",
            "title",
            "message",
            "url",
            "read_at",
            "created_at",
        )
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    count = serializers.IntegerField()


class ReadAllSerializer(serializers.Serializer):
    updated = serializers.IntegerField(help_text="Nombre de notifications marquées comme lues")


class CategoryPreferenceSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=Category.choices)
    label = serializers.CharField(read_only=True)
    in_app = serializers.BooleanField(read_only=True, help_text="Toujours actif")
    email = serializers.BooleanField()


class PreferencesSerializer(serializers.Serializer):
    email_address = serializers.EmailField(
        read_only=True, allow_null=True, help_text="Adresse qui recevra les emails, null si aucune"
    )
    categories = CategoryPreferenceSerializer(many=True)


class PreferencesUpdateSerializer(serializers.Serializer):
    categories = CategoryPreferenceSerializer(many=True)

    def validate_categories(self, value):
        allowed = self.context["allowed"]
        refused = sorted({item["category"] for item in value} - set(allowed))
        if refused:
            raise serializers.ValidationError(
                f"Catégorie non disponible pour ce compte : {', '.join(refused)}."
            )
        return value
