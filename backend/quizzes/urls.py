from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet)
router.register(r'questions', views.QuestionViewSet)
router.register(r'question-media', views.QuestionMediaViewSet, basename='question-media')
router.register(r'attempts', views.QuizAttemptViewSet, basename='attempts')
router.register(r'quiz-translations', views.QuizTranslationViewSet, basename='quiz-translation')
router.register(r'question-translations', views.QuestionTranslationViewSet, basename='question-translation')
router.register(r'option-translations', views.OptionTranslationViewSet, basename='option-translation')
router.register(r'hint-translations', views.HintTranslationViewSet, basename='hint-translation')

urlpatterns = [
    path('', include(router.urls)),
    # Friendly explicit paths mapping to viewset actions
    path('quizzes/<int:pk>/start/', views.QuizViewSet.as_view({'post': 'start_attempt'}), name='quiz-start'),
    path('quizzes/<int:pk>/progress/', views.QuizViewSet.as_view({'get': 'progress'}), name='quiz-progress'),
    path('quizzes/<int:pk>/question/<int:question_id>/', views.QuizViewSet.as_view({'get': 'question_detail'}), name='quiz-question-detail'),
    path('quizzes/<int:pk>/question/<int:question_id>/answer/', views.QuizViewSet.as_view({'post': 'submit_answer_nested'}), name='quiz-question-answer'),
    path('quizzes/<int:pk>/complete/', views.QuizViewSet.as_view({'post': 'complete_by_quiz'}), name='quiz-complete'),
]