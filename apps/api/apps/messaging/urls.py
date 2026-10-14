from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet, AttachmentViewSet, NotificationViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
