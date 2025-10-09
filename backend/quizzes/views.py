from django.db import models
import json
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

    def get_queryset(self):
        """Only show published quizzes to everyone; creators can also see their own."""
        base_qs = Quiz.objects.select_related('creator').prefetch_related('questions')
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            return base_qs.filter(Q(is_published=True) | Q(creator=user))
        return base_qs.filter(is_published=True)

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return QuizDetailSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    # Helpers for robust answer comparison
    @staticmethod
    def _normalize_text(value):
        if value is None:
            return None
        return str(value).strip().casefold()

    @staticmethod
    def _to_bool_like(value):
        if value is None:
            return None
        val = str(value).strip().casefold()
        true_vals = {'true', 't', 'yes', 'y', '1'}
        false_vals = {'false', 'f', 'no', 'n', '0'}
        if val in true_vals:
            return True
        if val in false_vals:
            return False
        return None

    @action(detail=True, methods=['get', 'post'])
    def questions(self, request, pk=None):
        """Get all questions for a specific quiz or create a new one with options"""
        quiz = self.get_object()
        if request.method.lower() == 'get':
            questions = quiz.questions.all().order_by('question_order')
            serializer = QuestionSerializer(questions, many=True)
            return Response(serializer.data)

        # POST: create question (only quiz creator)
        if quiz.creator != request.user:
            self.permission_denied(request)

        data = request.data
        question_text = data.get('question_text')
        points_value = data.get('points_value', 10)
        question_type = data.get('question_type', 'multiple_choice')
        correct_answer = data.get('correct_answer')
        options_raw = data.get('options', [])
        # If sent via multipart, options may arrive as a JSON string
        if isinstance(options_raw, str):
            try:
                options_data = json.loads(options_raw)
            except json.JSONDecodeError:
                options_data = []
        else:
            options_data = options_raw

        if not question_text:
            return Response({"error": "question_text is required"}, status=status.HTTP_400_BAD_REQUEST)

        next_order = quiz.questions.count() + 1
        
        # Handle media files
        image_file = request.FILES.get('image')
        audio_file = request.FILES.get('audio')
        video_file = request.FILES.get('video')
        
        # Validate that only one media type is provided
        media_files = [f for f in [image_file, audio_file, video_file] if f is not None]
        if len(media_files) > 1:
            return Response(
                {"error": "Only one media type can be attached per question"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        question = Question.objects.create(
            quiz=quiz,
            question_text=question_text,
            question_order=next_order,
            points_value=points_value,
            question_type=question_type,
            correct_answer=correct_answer,
            image=image_file,
            audio=audio_file,
            video=video_file,
        )

        # Create options if provided (for multiple choice)
        option_order = 1
        for opt in options_data:
            text = opt.get('option_text')
            if not text:
                continue
            Option.objects.create(
                question=question,
                option_text=text,
                is_correct=bool(opt.get('is_correct', False)),
                option_order=option_order,
            )
            option_order += 1

        serializer = QuestionSerializer(question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='start')
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

    @action(detail=True, methods=['get'], url_path='progress')
    def progress(self, request, pk=None):
        """Return current in-progress attempt progress for the user on this quiz"""
        quiz = self.get_object()
        attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz).order_by('-start_time').first()
        if not attempt:
            return Response({"detail": "No attempt found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path=r'question/(?P<question_id>[^/.]+)')
    def question_detail(self, request, pk=None, question_id=None):
        """Get a specific question within this quiz"""
        quiz = self.get_object()
        question = get_object_or_404(Question, id=question_id, quiz=quiz)
        serializer = QuestionSerializer(question)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path=r'question/(?P<question_id>[^/.]+)/answer')
    def submit_answer_nested(self, request, pk=None, question_id=None):
        """Submit an answer for a question within this quiz for the current user's active attempt"""
        quiz = self.get_object()
        question = get_object_or_404(Question, id=question_id, quiz=quiz)

        # Find or create an in-progress attempt for this quiz
        attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz, status='in_progress').first()
        if not attempt:
            attempt = QuizAttempt.objects.create(user=request.user, quiz=quiz, status='in_progress')

        option_id = request.data.get('option')
        text_answer = request.data.get('text')

        selected_option = None
        # Only resolve option for multiple choice questions; ignore stray option ids
        if question.question_type == 'multiple_choice' and option_id not in (None, '', 'null', 'undefined'):
            selected_option = get_object_or_404(Option, id=option_id, question=question)

        # Create or update user answer
        is_correct = False
        points_earned = 0
        if selected_option is not None:
            is_correct = bool(selected_option.is_correct)
            points_earned = question.points_value if is_correct else 0
        elif question.question_type in ['text', 'true_false']:
            # Robust text/boolean comparison
            if question.question_type == 'true_false':
                user_bool = self._to_bool_like(text_answer)
                correct_bool = self._to_bool_like(question.correct_answer)
                if user_bool is not None and correct_bool is not None:
                    is_correct = user_bool == correct_bool
            else:
                user_norm = self._normalize_text(text_answer)
                correct_norm = self._normalize_text(question.correct_answer)
                if user_norm is not None and correct_norm is not None:
                    is_correct = user_norm == correct_norm
            points_earned = question.points_value if is_correct else 0

        user_answer, _ = UserAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                'selected_option': selected_option,
                'text': text_answer,
                'is_correct': is_correct,
                'points_earned': points_earned,
            }
        )

        # If all answered, finalize attempt
        total_questions = attempt.quiz.questions.count()
        answered_questions = attempt.answers.count()
        if answered_questions >= total_questions:
            total_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
            completion_percent = (answered_questions / total_questions) * 100 if total_questions else 0
            attempt.score = total_points
            attempt.completion_percentage = completion_percent
            attempt.end_time = timezone.now()
            attempt.status = 'completed'
            attempt.save()
            attempt.user.total_points += total_points
            attempt.user.save()

        serializer = UserAnswerSerializer(user_answer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_by_quiz(self, request, pk=None):
        """Complete the current user's attempt for this quiz"""
        quiz = self.get_object()
        attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz, status='in_progress').first()
        if not attempt:
            return Response({"error": "No in-progress attempt found"}, status=status.HTTP_400_BAD_REQUEST)

        total_questions = attempt.quiz.questions.count()
        answered_questions = attempt.answers.count()
        total_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
        completion_percent = (answered_questions / total_questions) * 100 if total_questions else 0

        attempt.score = total_points
        attempt.completion_percentage = completion_percent
        attempt.end_time = timezone.now()
        attempt.status = 'completed'
        attempt.save()

        attempt.user.total_points += total_points
        attempt.user.save()

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for questions
    Allows managing quiz questions
    """
    queryset = Question.objects.select_related('quiz').prefetch_related('options')
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
        
        # Handle media files
        image_file = self.request.FILES.get('image')
        audio_file = self.request.FILES.get('audio')
        video_file = self.request.FILES.get('video')
        
        # Validate that only one media type is provided
        media_files = [f for f in [image_file, audio_file, video_file] if f is not None]
        if len(media_files) > 1:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Only one media type can be attached per question")
        
        serializer.save(
            question_order=next_order,
            image=image_file,
            audio=audio_file,
            video=video_file,
        )

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
        return (
            QuizAttempt.objects
            .select_related('quiz', 'user')
            .prefetch_related('answers__question')
            .filter(user=self.request.user)
        )

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

        # Get the question and selected option/text
        question_id = request.data.get('question')
        option_id = request.data.get('option')
        text_answer = request.data.get('text')

        if not question_id:
            return Response({"error": "Question is required"}, status=status.HTTP_400_BAD_REQUEST)

        question = get_object_or_404(Question, id=question_id, quiz=attempt.quiz)
        option = None
        if question.question_type == 'multiple_choice':
            if option_id in (None, '', 'null', 'undefined'):
                return Response({"error": "Option is required for multiple choice"}, status=status.HTTP_400_BAD_REQUEST)
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
        # Compute correctness
        is_correct = False
        points_earned = 0
        if question.question_type == 'multiple_choice':
            is_correct = bool(option.is_correct)
        elif question.question_type == 'true_false':
            def to_bool_like(v):
                if v is None:
                    return None
                s = str(v).strip().casefold()
                if s in {'true','t','yes','y','1'}: return True
                if s in {'false','f','no','n','0'}: return False
                return None
            user_bool = to_bool_like(text_answer)
            correct_bool = to_bool_like(question.correct_answer)
            if user_bool is not None and correct_bool is not None:
                is_correct = user_bool == correct_bool
        else:  # text
            user_norm = str(text_answer).strip().casefold() if text_answer is not None else None
            correct_norm = str(question.correct_answer).strip().casefold() if question.correct_answer is not None else None
            if user_norm is not None and correct_norm is not None:
                is_correct = user_norm == correct_norm
        points_earned = question.points_value if is_correct else 0

        user_answer, created = UserAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                'selected_option': option,
                'text': text_answer,
                'is_correct': is_correct,
                'points_earned': points_earned,
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
