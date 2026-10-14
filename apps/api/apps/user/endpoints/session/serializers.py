from rest_framework import serializers


class CsrfTokenSerializer(serializers.Serializer):
    csrf_token = serializers.CharField()


class SessionLoginResponseSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    # Django renouvelle le jeton CSRF à la connexion
    csrf_token = serializers.CharField()
