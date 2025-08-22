from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet, AttachmentViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"attachments", AttachmentViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
