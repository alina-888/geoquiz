from django.db import models
from users.models import CustomUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator



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
    is_geo = models.BooleanField(default=False)

    def __str__(self):
        return self.title


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
    image = models.ImageField(upload_to='question_media/images/', null=True, blank=True)
    audio = models.FileField(upload_to='question_media/audio/', null=True, blank=True)
    video = models.FileField(upload_to='question_media/videos/', null=True, blank=True)
    geolocation = models.JSONField(null=True, blank=True)
    correct_answer = models.TextField(null=True, blank=True)  # for text and true/false questions

    class Meta:
        ordering = ['question_order']
        unique_together = ['quiz', 'question_order']

    def __str__(self):
        return f"{self.quiz.title} - Question {self.question_order}"

    def clean(self):
        """Validate file extensions for legacy media fields"""
        # Note: The single media restriction has been removed.
        # New uploads should use QuestionMedia model for multiple files.
        # Legacy fields (image, audio, video) are kept for backward compatibility.

        if self.audio:
            ext = self.audio.name.split('.')[-1].lower()
            valid_audio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
            if ext not in valid_audio:
                raise ValidationError(
                    f"Invalid audio file extension. Allowed: {', '.join(valid_audio)}"
                )

        if self.video:
            ext = self.video.name.split('.')[-1].lower()
            valid_video = ['mp4', 'webm', 'avi', 'mov', 'mkv']
            if ext not in valid_video:
                raise ValidationError(
                    f"Invalid video file extension. Allowed: {', '.join(valid_video)}"
                )


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

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='media_files')
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES)
    file = models.FileField(upload_to=question_media_upload_path)
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

    def clean(self):
        """Validate file extensions based on media type"""
        if self.file:
            ext = self.file.name.split('.')[-1].lower()

            if self.media_type == 'audio':
                valid_audio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
                if ext not in valid_audio:
                    raise ValidationError(
                        f"Invalid audio file extension. Allowed: {', '.join(valid_audio)}"
                    )

            elif self.media_type == 'video':
                valid_video = ['mp4', 'webm', 'avi', 'mov', 'mkv']
                if ext not in valid_video:
                    raise ValidationError(
                        f"Invalid video file extension. Allowed: {', '.join(valid_video)}"
                    )

            elif self.media_type == 'image':
                valid_image = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
                if ext not in valid_image:
                    raise ValidationError(
                        f"Invalid image file extension. Allowed: {', '.join(valid_image)}"
                    )


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
