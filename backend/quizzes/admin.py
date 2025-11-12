from django.contrib import admin
from .models import Quiz, Question, Option, QuizAttempt, UserAnswer, QuestionMedia, Hint, HintUnlock

admin.site.register([Quiz, Question, Option, QuizAttempt, UserAnswer, QuestionMedia, Hint, HintUnlock])