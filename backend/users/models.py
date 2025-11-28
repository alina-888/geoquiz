import os
from io import BytesIO
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.files.base import ContentFile
from quizzes.validators import validate_profile_picture
from PIL import Image


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
        validators=[validate_profile_picture]
    )
    profile_thumbnail = models.ImageField(
        upload_to='profile_thumbnails/',
        null=True,
        blank=True,
        editable=False
    )
    total_points = models.PositiveIntegerField(default=0)
    bio = models.TextField(blank=True)

    THUMBNAIL_SIZE = (150, 150)

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        # Track if image changed
        generate_thumbnail = False
        if self.pk:
            try:
                old_instance = CustomUser.objects.get(pk=self.pk)
                if old_instance.profile_picture != self.profile_picture:
                    generate_thumbnail = True
                    # Delete old thumbnail if exists
                    if old_instance.profile_thumbnail:
                        old_instance.profile_thumbnail.delete(save=False)
            except CustomUser.DoesNotExist:
                generate_thumbnail = bool(self.profile_picture)
        else:
            generate_thumbnail = bool(self.profile_picture)

        super().save(*args, **kwargs)

        # Generate thumbnail after save (so we have the image file)
        if generate_thumbnail and self.profile_picture:
            self._generate_thumbnail()

    def _generate_thumbnail(self):
        """Generate a thumbnail from the profile picture"""
        try:
            img = Image.open(self.profile_picture)
            img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Handle different image modes
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Save to BytesIO
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)

            # Generate thumbnail filename
            base_name = os.path.splitext(os.path.basename(self.profile_picture.name))[0]
            thumb_name = f"{base_name}_thumb.jpg"

            # Save without triggering another save()
            self.profile_thumbnail.save(thumb_name, ContentFile(thumb_io.read()), save=False)
            CustomUser.objects.filter(pk=self.pk).update(profile_thumbnail=self.profile_thumbnail.name)
        except Exception as e:
            print(f"Error generating profile thumbnail: {e}")
