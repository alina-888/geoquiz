from django.contrib import admin
from .models import Quiz, Question, Option, QuizAttempt, UserAnswer, QuestionMedia

admin.site.register([Quiz, Question, Option, QuizAttempt, UserAnswer, QuestionMedia])