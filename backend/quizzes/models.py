import logging
import os
from io import BytesIO
from django.db import models
from django.core.files.base import ContentFile
from users.models import CustomUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from PIL import Image

logger = logging.getLogger(__name__)
from .validators import (
    validate_quiz_image,
    validate_question_image,
    validate_audio_file,
    validate_video_file,
    sanitize_filename,
)



class Quiz(models.Model):
    DIFFICULTY_CHOICES = [
        (1, 'Easy'),
        (2, 'Medium'),
        (3, 'Hard'),
    ]

    CATEGORY_CHOICES = [
        ('history', 'History'),
        ('landmarks', 'Landmarks'),
        ('culture', 'Culture'),
        ('nature', 'Nature'),
        ('other', 'Other'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('sr', 'Serbian'),
    ]

    creator = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_quizzes')
    title = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    difficulty_level = models.IntegerField(choices=DIFFICULTY_CHOICES, default=1)
    estimated_duration = models.PositiveIntegerField(help_text="Estimated duration in minutes")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    is_published = models.BooleanField(default=False)
    avg_rating = models.FloatField(default=0.0)
    total_ratings = models.PositiveIntegerField(default=0)
    is_geo = models.BooleanField(default=False)
    default_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='en', help_text="Primary language of quiz content")
    image = models.ImageField(
        upload_to='quiz_images/',
        null=True,
        blank=True,
        validators=[validate_quiz_image]
    )
    thumbnail = models.ImageField(
        upload_to='quiz_thumbnails/',
        null=True,
        blank=True,
        editable=False
    )

    THUMBNAIL_SIZE = (900, 800)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Track if image changed
        generate_thumbnail = False
        if self.pk:
            try:
                old_instance = Quiz.objects.get(pk=self.pk)
                if old_instance.image != self.image:
                    generate_thumbnail = True
                    # Delete old thumbnail if exists
                    if old_instance.thumbnail:
                        old_instance.thumbnail.delete(save=False)
            except Quiz.DoesNotExist:
                generate_thumbnail = bool(self.image)
        else:
            generate_thumbnail = bool(self.image)

        super().save(*args, **kwargs)

        # Generate thumbnail after save (so we have the image file)
        if generate_thumbnail and self.image:
            self._generate_thumbnail()

    def _generate_thumbnail(self):
        """Generate a thumbnail from the main image"""
        try:
            img = Image.open(self.image)
            img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Handle different image modes
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Save to BytesIO
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)

            # Generate thumbnail filename
            base_name = os.path.splitext(os.path.basename(self.image.name))[0]
            thumb_name = f"{base_name}_thumb.jpg"

            # Save without triggering another save()
            self.thumbnail.save(thumb_name, ContentFile(thumb_io.read()), save=False)
            Quiz.objects.filter(pk=self.pk).update(thumbnail=self.thumbnail.name)
        except Exception as e:
            logger.warning(f"Error generating thumbnail: {e}")


class Question(models.Model):
    QUESTION_TYPES = [
        ('text', 'Text'),
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_order = models.PositiveIntegerField()
    points_value = models.PositiveIntegerField(default=10)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')
    image = models.ImageField(
        upload_to='question_media/images/',
        null=True,
        blank=True,
        validators=[validate_question_image]
    )
    audio = models.FileField(
        upload_to='question_media/audio/',
        null=True,
        blank=True,
        validators=[validate_audio_file]
    )
    video = models.FileField(
        upload_to='question_media/videos/',
        null=True,
        blank=True,
        validators=[validate_video_file]
    )
    geolocation = models.JSONField(null=True, blank=True)
    correct_answer = models.TextField(null=True, blank=True)  # for text and true/false questions

    class Meta:
        ordering = ['question_order']
        unique_together = ['quiz', 'question_order']

    def __str__(self):
        return f"{self.quiz.title} - Question {self.question_order}"

    def clean(self):
        """Validate media files using comprehensive validators"""
        # Validators are now applied at the field level
        # This clean() method is kept for any additional custom validation
        pass


    @property
    def has_media(self):
        """Check if question has any media attached"""
        return bool(self.image or self.audio or self.video)
    
    @property
    def media_type(self):
        """Return the type of media attached"""
        if self.image:
            return 'image'
        elif self.audio:
            return 'audio'
        elif self.video:
            return 'video'
        return None
    
    def get_media_url(self):
        """Get URL of attached media"""
        if self.image:
            return self.image.url
        elif self.audio:
            return self.audio.url
        elif self.video:
            return self.video.url
        return None
    
    def get_media_field(self):
        """Get the actual media field object"""
        if self.image:
            return self.image
        elif self.audio:
            return self.audio
        elif self.video:
            return self.video
        return None


def question_media_upload_path(instance, filename):
    """Generate upload path based on media type"""
    if instance.media_type == 'image':
        return f'question_media/images/{filename}'
    elif instance.media_type == 'audio':
        return f'question_media/audio/{filename}'
    elif instance.media_type == 'video':
        return f'question_media/videos/{filename}'
    else:
        return f'question_media/{filename}'


class QuestionMedia(models.Model):
    """Model for storing multiple media files per question"""
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]

    THUMBNAIL_SIZE = (400, 300)

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='media_files')
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES)
    file = models.FileField(upload_to=question_media_upload_path)
    thumbnail = models.ImageField(
        upload_to='question_media/thumbnails/',
        null=True,
        blank=True,
        editable=False
    )
    display_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'uploaded_at']
        verbose_name = 'Question Media'
        verbose_name_plural = 'Question Media'

    def __str__(self):
        return f"{self.question} - {self.media_type} ({self.display_order})"

    @property
    def file_url(self):
        """Get URL of the media file"""
        if self.file:
            return self.file.url
        return None

    @property
    def thumbnail_url(self):
        """Get URL of the thumbnail (for images only)"""
        if self.thumbnail:
            return self.thumbnail.url
        # Fallback to main file for images without thumbnail
        if self.media_type == 'image' and self.file:
            return self.file.url
        return None

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Generate thumbnail for new images
        if is_new and self.media_type == 'image' and self.file:
            self._generate_thumbnail()

    def _generate_thumbnail(self):
        """Generate a thumbnail from the image file"""
        try:
            img = Image.open(self.file)
            img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Handle different image modes
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # Save to BytesIO
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)

            # Generate thumbnail filename
            base_name = os.path.splitext(os.path.basename(self.file.name))[0]
            thumb_name = f"{base_name}_thumb.jpg"

            # Save without triggering another save()
            self.thumbnail.save(thumb_name, ContentFile(thumb_io.read()), save=False)
            QuestionMedia.objects.filter(pk=self.pk).update(thumbnail=self.thumbnail.name)
        except Exception as e:
            logger.warning(f"Error generating question media thumbnail: {e}")

    def clean(self):
        """Validate file based on media type using comprehensive validators"""
        if self.file:
            # Apply appropriate validator based on media type
            if self.media_type == 'image':
                validate_question_image(self.file)
            elif self.media_type == 'audio':
                validate_audio_file(self.file)
            elif self.media_type == 'video':
                validate_video_file(self.file)


class Hint(models.Model):
    """
    Hints for questions. Each question can have up to 3 hints.
    Hints must be unlocked sequentially and cost points.
    """
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='hints')
    hint_text = models.TextField(blank=True)
    hint_image = models.ImageField(
        upload_to='question_media/hints/images/',
        null=True,
        blank=True,
        validators=[validate_question_image]
    )
    hint_audio = models.FileField(
        upload_to='question_media/hints/audio/',
        null=True,
        blank=True,
        validators=[validate_audio_file]
    )
    hint_video = models.FileField(
        upload_to='question_media/hints/videos/',
        null=True,
        blank=True,
        validators=[validate_video_file]
    )
    points_penalty = models.PositiveIntegerField(
        help_text="Points deducted when hint is unlocked"
    )
    hint_order = models.PositiveIntegerField(help_text="Display order (1, 2, or 3)")

    class Meta:
        ordering = ['hint_order']
        unique_together = ['question', 'hint_order']

    def __str__(self):
        return f"Hint {self.hint_order} for {self.question}"

    def clean(self):
        """Validate hint constraints"""
        # Validate hint order (1, 2, or 3)
        if self.hint_order not in [1, 2, 3]:
            raise ValidationError({'hint_order': 'Hint order must be 1, 2, or 3'})

        # Validate max 3 hints per question
        if self.question:
            existing_hints = Hint.objects.filter(question=self.question).exclude(pk=self.pk)
            if existing_hints.count() >= 3:
                raise ValidationError('A question can have maximum 3 hints')

        # Validate points penalty
        if self.points_penalty <= 0:
            raise ValidationError({'points_penalty': 'Points penalty must be greater than 0'})

        if self.question and self.points_penalty > self.question.points_value:
            raise ValidationError({
                'points_penalty': f'Points penalty cannot exceed question value ({self.question.points_value} points)'
            })

        # Validate that at least text or media is provided
        if not self.hint_text and not self.hint_image and not self.hint_audio and not self.hint_video:
            raise ValidationError('Hint must have at least text or media content')

    @property
    def has_media(self):
        """Check if hint has any media attached"""
        return bool(self.hint_image or self.hint_audio or self.hint_video)

    @property
    def media_type(self):
        """Return the type of media attached"""
        if self.hint_image:
            return 'image'
        elif self.hint_audio:
            return 'audio'
        elif self.hint_video:
            return 'video'
        return None

    def get_media_url(self):
        """Get URL of attached media"""
        if self.hint_image:
            return self.hint_image.url
        elif self.hint_audio:
            return self.hint_audio.url
        elif self.hint_video:
            return self.hint_video.url
        return None


class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    option_order = models.PositiveIntegerField()

    class Meta:
        ordering = ['option_order']
        unique_together = ['question', 'option_order']

    def __str__(self):
        return f"{self.option_text} ({'Correct' if self.is_correct else 'Incorrect'})"


class QuizAttempt(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    score = models.PositiveIntegerField(default=0)
    completion_percentage = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0),MaxValueValidator(100.0)]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')

    def __str__(self):
        return f"{self.user.username}'s attempt of {self.quiz.title}"


class UserAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(Option, on_delete=models.CASCADE, null=True, blank=True)
    text = models.CharField(max_length=255, null=True, blank=True)  # For text answers
    answered_at = models.DateTimeField(auto_now_add=True)
    is_correct = models.BooleanField(default=False)
    points_earned = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['attempt', 'question']

    def __str__(self):
        return f"Answer to {self.question} by {self.attempt.user.username}"


class HintUnlock(models.Model):
    """
    Tracks which hints have been unlocked by users during quiz attempts.
    Records the point penalty applied.
    """
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='unlocked_hints')
    hint = models.ForeignKey(Hint, on_delete=models.CASCADE, related_name='unlocks')
    unlocked_at = models.DateTimeField(auto_now_add=True)
    points_deducted = models.PositiveIntegerField(help_text="Points deducted when unlocked")

    class Meta:
        unique_together = ['attempt', 'hint']
        ordering = ['unlocked_at']

    def __str__(self):
        return f"{self.attempt.user.username} unlocked hint {self.hint.hint_order} for {self.hint.question}"


class QuizRating(models.Model):
    """
    User ratings and reviews for quizzes.
    Ratings without review_text contribute to avg_rating but don't show as reviews.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='quiz_ratings')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    review_text = models.TextField(blank=True, null=True, help_text="Optional review text")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('quiz', 'user')
        ordering = ['-created_at']
        verbose_name = 'Quiz Rating'
        verbose_name_plural = 'Quiz Ratings'

    def __str__(self):
        review_status = " (with review)" if self.review_text else ""
        return f"{self.user.username} rated {self.quiz.title}: {self.rating}/5{review_status}"

    def update_quiz_rating(self):
        """Update the related quiz's avg_rating and total_ratings"""
        quiz = self.quiz
        ratings = quiz.ratings.all()
        total = ratings.count()
        if total > 0:
            avg = ratings.aggregate(models.Avg('rating'))['rating__avg']
            quiz.avg_rating = round(avg, 2)
            quiz.total_ratings = total
        else:
            quiz.avg_rating = 0.0
            quiz.total_ratings = 0
        quiz.save(update_fields=['avg_rating', 'total_ratings'])


# ============================================
# Translation Models
# ============================================

class QuizTranslation(models.Model):
    """
    Translations for Quiz content.
    Stores title and description in different languages.
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('sr', 'Serbian'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='translations')
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        unique_together = ('quiz', 'language')
        verbose_name = 'Quiz Translation'
        verbose_name_plural = 'Quiz Translations'

    def __str__(self):
        return f"{self.quiz.title} ({self.get_language_display()})"


class QuestionTranslation(models.Model):
    """
    Translations for Question content.
    Stores question text and correct answer in different languages.
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('sr', 'Serbian'),
    ]

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='translations')
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES)
    question_text = models.TextField()
    correct_answer = models.TextField(null=True, blank=True)  # For text/true_false questions

    class Meta:
        unique_together = ('question', 'language')
        verbose_name = 'Question Translation'
        verbose_name_plural = 'Question Translations'

    def __str__(self):
        return f"Q{self.question.question_order} ({self.get_language_display()})"


class OptionTranslation(models.Model):
    """
    Translations for multiple choice options.
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('sr', 'Serbian'),
    ]

    option = models.ForeignKey(Option, on_delete=models.CASCADE, related_name='translations')
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES)
    option_text = models.CharField(max_length=500)

    class Meta:
        unique_together = ('option', 'language')
        verbose_name = 'Option Translation'
        verbose_name_plural = 'Option Translations'

    def __str__(self):
        return f"{self.option.option_text[:30]} ({self.get_language_display()})"


class HintTranslation(models.Model):
    """
    Translations for hint text content.
    Note: Media files (images/audio/video) are not translated, only text.
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Russian'),
        ('sr', 'Serbian'),
    ]

    hint = models.ForeignKey(Hint, on_delete=models.CASCADE, related_name='translations')
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES)
    hint_text = models.TextField()

    class Meta:
        unique_together = ('hint', 'language')
        verbose_name = 'Hint Translation'
        verbose_name_plural = 'Hint Translations'

    def __str__(self):
        return f"Hint {self.hint.hint_order} ({self.get_language_display()})"


# ============================================
# Signals for automatic quiz rating updates
# ============================================

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=QuizRating)
def update_quiz_rating_on_save(sender, instance, **kwargs):
    """Automatically update quiz ratings when a rating is created or updated"""
    instance.update_quiz_rating()

@receiver(post_delete, sender=QuizRating)
def update_quiz_rating_on_delete(sender, instance, **kwargs):
    """Automatically update quiz ratings when a rating is deleted"""
    instance.update_quiz_rating()
