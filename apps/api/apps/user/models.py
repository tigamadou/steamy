from .base import AbstractEmailUser
from django.db import models

class User(AbstractEmailUser):
    pass

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to="avatars/%Y/%m/%d/", blank=True, null=True)
    country = models.CharField(max_length=64, blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True, null=True)

    def __str__(self):
        return f"Profile {self.user.email}"
