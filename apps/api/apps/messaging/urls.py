from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttachmentViewSet, ConversationViewSet, MessageViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
