from django.contrib.auth.models import AbstractUser
from django.db import models
from quizzes.validators import validate_profile_picture


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
        validators=[validate_profile_picture]
    )
    total_points = models.PositiveIntegerField(default=0)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.username
