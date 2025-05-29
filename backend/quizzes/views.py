from django.db import models
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Quiz, Question, Option, QuizAttempt, UserAnswer,
)
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer,
    OptionSerializer, QuizAttemptSerializer, UserAnswerSerializer,
)
from .permissions import IsOwnerOrReadOnly
from .filters import QuizFilter

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = QuizFilter
    search_fields = ['title', 'description', 'category']
    ordering_fields = ['created_at', 'avg_rating', 'title']
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return QuizDetailSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get all questions for a specific quiz"""
        quiz = self.get_object()
        questions = quiz.questions.all().order_by('question_order')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        """Create a new attempt for the current user on this quiz"""
        quiz = self.get_object()
        # Check if user has an in-progress attempt
        existing_attempt = QuizAttempt.objects.filter(
            user=request.user,
            quiz=quiz,
            status='in_progress'
        ).first()

        if existing_attempt:
            serializer = QuizAttemptSerializer(existing_attempt)
            return Response(serializer.data)

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            status='in_progress'
        )
        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for questions
    Allows managing quiz questions
    """
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        """Filter questions by quiz if quiz_id is provided"""
        queryset = Question.objects.all()
        quiz_id = self.request.query_params.get('quiz_id', None)
        if quiz_id is not None:
            queryset = queryset.filter(quiz_id=quiz_id)
        return queryset

    def perform_create(self, serializer):
        """Ensure the question is added to the end of the quiz"""
        quiz_id = self.request.data.get('quiz')
        quiz = get_object_or_404(Quiz, id=quiz_id)

        # Only allow quiz creator to add questions
        if quiz.creator != self.request.user:
            self.permission_denied(self.request)

        # Get the next question order number
        next_order = quiz.questions.count() + 1
        serializer.save(question_order=next_order)

    @action(detail=True, methods=['get'])
    def options(self, request, pk=None):
        """Get all options for a specific question"""
        question = self.get_object()
        options = question.options.all().order_by('option_order')
        serializer = OptionSerializer(options, many=True)
        return Response(serializer.data)


class QuizAttemptViewSet(viewsets.ModelViewSet):
    """
    API endpoint for quiz attempts
    Allows users to manage their quiz attempts
    """
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own attempts"""
        return QuizAttempt.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit an answer to a question in this attempt"""
        attempt = self.get_object()

        # Ensure attempt is in progress
        if attempt.status != 'in_progress':
            return Response(
                {"error": "Cannot submit answers to a completed or abandoned attempt"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the question and selected option
        question_id = request.data.get('question')
        option_id = request.data.get('option')

        if not question_id or not option_id:
            return Response(
                {"error": "Question and option are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        question = get_object_or_404(Question, id=question_id, quiz=attempt.quiz)
        option = get_object_or_404(Option, id=option_id, question=question)

        # # Check if user's location matches question location
        # if 'lat' in request.data and 'lng' in request.data:
        #     try:
        #         user_lat = float(request.data.get('lat'))
        #         user_lng = float(request.data.get('lng'))
        #
        #         # Calculate rough distance (this is a simplification)
        #         # For production, use GeoDjango's distance calculation
        #         lat_diff = abs(user_lat - question.latitude)
        #         lng_diff = abs(user_lng - question.longitude)
        #
        #         # Convert to approximate meters (very rough approximation)
        #         approx_distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111000
        #
        #         if approx_distance > question.radius_meters:
        #             return Response(
        #                 {"error": "You're not close enough to the question location"},
        #                 status=status.HTTP_400_BAD_REQUEST
        #             )
        #     except (ValueError, TypeError):
        #         pass

        # Create or update user answer
        user_answer, created = UserAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                'selected_option': option,
                'is_correct': option.is_correct,
                'points_earned': question.points_value if option.is_correct else 0
            }
        )

        # Check if all questions are answered
        total_questions = attempt.quiz.questions.count()
        answered_questions = attempt.answers.count()

        if answered_questions >= total_questions:
            # Calculate score and completion
            correct_answers = attempt.answers.filter(is_correct=True).count()
            total_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
            completion_percent = (answered_questions / total_questions) * 100

            # Update attempt
            attempt.score = total_points
            attempt.completion_percentage = completion_percent
            attempt.end_time = timezone.now()
            attempt.status = 'completed'
            attempt.save()

            # Update user's total points
            attempt.user.total_points += total_points
            attempt.user.save()

            # Check for achievements
            self._check_achievements(attempt)

        serializer = UserAnswerSerializer(user_answer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a quiz attempt as completed"""
        attempt = self.get_object()

        if attempt.status != 'in_progress':
            return Response(
                {"error": "This attempt is already complete or abandoned"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate score and completion
        total_questions = attempt.quiz.questions.count()
        answered_questions = attempt.answers.count()
        correct_answers = attempt.answers.filter(is_correct=True).count()
        total_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
        completion_percent = (answered_questions / total_questions) * 100

        # Update attempt
        attempt.score = total_points
        attempt.completion_percentage = completion_percent
        attempt.end_time = timezone.now()
        attempt.status = 'completed'
        attempt.save()

        # Update user's total points
        attempt.user.total_points += total_points
        attempt.user.save()

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)
