from django.contrib import admin
from .models import Quiz, Question, Option, QuizAttempt, UserAnswer

admin.site.register([Quiz, Question, Option, QuizAttempt, UserAnswer])