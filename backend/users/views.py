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
    Achievement, UserAchievement, Review, Location
)
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer,
    OptionSerializer, QuizAttemptSerializer, UserAnswerSerializer,
    AchievementSerializer, UserAchievementSerializer, ReviewSerializer,
    LocationSerializer, UserSerializer, QuizListSerializer
)
from .permissions import IsOwnerOrReadOnly
from .filters import QuizFilter, LocationFilter


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
        if self.action == 'list':
            return QuizListSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
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

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get all reviews for a specific quiz"""
        quiz = self.get_object()
        reviews = quiz.reviews.all()
        serializer = ReviewSerializer(reviews, many=True)
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

    @action(detail=True, methods=['get'])
    def nearby(self, request, pk=None):
        """
        Get quizzes near the user's current location
        Requires lat and lng query parameters
        """
        try:
            lat = float(request.query_params.get('lat', 0))
            lng = float(request.query_params.get('lng', 0))
            radius = float(request.query_params.get('radius', 5000))  # Default 5km radius
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid location parameters"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # This is a simple distance calculation
        # For production, consider using GeoDjango for more accurate and efficient queries
        nearby_quizzes = []
        for quiz in Quiz.objects.filter(is_published=True):
            # Check if at least one question is within radius
            if quiz.questions.filter(
                    Q(latitude__range=(lat - 0.1, lat + 0.1)) &
                    Q(longitude__range=(lng - 0.1, lng + 0.1))
            ).exists():
                nearby_quizzes.append(quiz)

        serializer = QuizListSerializer(nearby_quizzes, many=True)
        return Response(serializer.data)

