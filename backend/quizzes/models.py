from django.db import models
from backend.users.models import CustomUser
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
    # latitude = models.FloatField()
    # longitude = models.FloatField()
    # radius_meters = models.PositiveIntegerField(default=50,
    #                                             help_text="Distance in meters within which the question is activated")
    #
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')
    media_content = models.ImageField(upload_to='question_media/', null=True, blank=True)
    correct_answer = models.TextField(null=True, blank=True)  # for text and true/false questions

    class Meta:
        ordering = ['question_order']
        unique_together = ['quiz', 'question_order']

    def __str__(self):
        return f"{self.quiz.title} - Question {self.question_order}"


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
