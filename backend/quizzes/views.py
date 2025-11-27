from django.db import models
import json
from django.db.models import Avg, Count, Q, Exists, OuterRef
from django.db.models.functions import Lower, Upper
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Quiz, Question, Option, QuizAttempt, UserAnswer, QuestionMedia, Hint, HintUnlock,
    QuizTranslation, QuestionTranslation, OptionTranslation, HintTranslation, QuizRating,
)
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer,
    OptionSerializer, QuizAttemptSerializer, UserAnswerSerializer, QuestionMediaSerializer,
    HintSerializer, QuizTranslationSerializer, QuestionTranslationSerializer,
    OptionTranslationSerializer, HintTranslationSerializer,
    QuizRatingSubmitSerializer, ReviewSerializer, RatingSummarySerializer,
)
from .permissions import IsOwnerOrReadOnly
from .filters import QuizFilter

# Limits
MAX_FILES_PER_QUESTION = 8
MAX_FILES_PER_QUIZ = 100

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    # Removed SearchFilter to use custom Cyrillic-aware search in get_queryset()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = QuizFilter
    ordering_fields = ['created_at', 'avg_rating', 'title']
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Only show published quizzes to everyone; creators can also see their own."""
        base_qs = Quiz.objects.select_related('creator').prefetch_related(
            'questions', 'questions__media_files', 'translations'
        )
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            base_qs = base_qs.filter(Q(is_published=True) | Q(creator=user))
        else:
            base_qs = base_qs.filter(is_published=True)

        # Manual case-insensitive search using UPPER for proper Cyrillic support
        search = self.request.query_params.get('search', '').strip()
        if search:
            search_upper = search.upper()

            # Create subquery for translation matches to avoid duplicates
            translation_matches = QuizTranslation.objects.filter(
                quiz=OuterRef('pk')
            ).annotate(
                trans_title_upper=Upper('title'),
                trans_desc_upper=Upper('description')
            ).filter(
                Q(trans_title_upper__contains=search_upper) |
                Q(trans_desc_upper__contains=search_upper)
            )

            # Annotate main quiz fields and check translations with EXISTS
            base_qs = base_qs.annotate(
                title_upper=Upper('title'),
                description_upper=Upper('description'),
                category_upper=Upper('category'),
                has_translation_match=Exists(translation_matches)
            ).filter(
                Q(title_upper__contains=search_upper) |
                Q(description_upper__contains=search_upper) |
                Q(category_upper__contains=search_upper) |
                Q(has_translation_match=True)
            )

        return base_qs

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
        try:
            print(f"DEBUG: Creating question for quiz {quiz.id}")
            print(f"DEBUG: Quiz creator: {quiz.creator}, Request user: {request.user}")
            print(f"DEBUG: Request data keys: {request.data.keys()}")
            print(f"DEBUG: Request FILES keys: {request.FILES.keys()}")

            if quiz.creator != request.user:
                print(f"DEBUG: Permission denied - creator mismatch")
                self.permission_denied(request)

            data = request.data
            question_text = data.get('question_text')
            points_value = data.get('points_value', 10)
            question_type = data.get('question_type', 'multiple_choice')
            correct_answer = data.get('correct_answer')
            options_raw = data.get('options', [])
            geolocation_raw = data.get('geolocation')

            print(f"DEBUG: question_text={question_text}, type={question_type}, points={points_value}")
            print(f"DEBUG: options_raw type: {type(options_raw)}, value: {options_raw}")
            print(f"DEBUG: geolocation_raw type: {type(geolocation_raw)}, value: {geolocation_raw}")

            # If sent via multipart, options may arrive as a JSON string
            if isinstance(options_raw, str):
                try:
                    options_data = json.loads(options_raw)
                except json.JSONDecodeError as e:
                    print(f"DEBUG: Failed to parse options JSON: {e}")
                    options_data = []
            else:
                options_data = options_raw

            # Parse geolocation JSON if provided as string
            geolocation_data = None
            if geolocation_raw is not None and geolocation_raw != 'null' and geolocation_raw != 'undefined' and geolocation_raw != '':
                if isinstance(geolocation_raw, str):
                    try:
                        geolocation_data = json.loads(geolocation_raw)
                        print(f"DEBUG: Parsed geolocation: {geolocation_data}")
                    except json.JSONDecodeError as e:
                        print(f"DEBUG: Failed to parse geolocation JSON: {e}")
                        geolocation_data = None
                elif isinstance(geolocation_raw, (dict, list)):
                    geolocation_data = geolocation_raw
                    print(f"DEBUG: Using geolocation as-is: {geolocation_data}")

            # Block geolocation for non-geo quizzes
            if geolocation_data not in (None, {}, [], '') and getattr(quiz, 'is_geo', False) is False:
                print(f"DEBUG: Blocking geolocation for non-geo quiz")
                return Response(
                    {"error": "Geolocation is only allowed for geo quizzes"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not question_text:
                print(f"DEBUG: Missing question_text")
                return Response({"error": "question_text is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Get the next question order number (use max + 1 to avoid conflicts after deletions)
            max_order = quiz.questions.aggregate(models.Max('question_order'))['question_order__max']
            next_order = (max_order or 0) + 1
            print(f"DEBUG: Next order: {next_order} (max was {max_order})")

            # Handle media files
            image_file = request.FILES.get('image')
            audio_file = request.FILES.get('audio')
            video_file = request.FILES.get('video')

            print(f"DEBUG: Media files - image: {image_file}, audio: {audio_file}, video: {video_file}")

            # Validate that only one media type is provided
            media_files = [f for f in [image_file, audio_file, video_file] if f is not None]
            if len(media_files) > 1:
                print(f"DEBUG: Multiple media files provided")
                return Response(
                    {"error": "Only one media type can be attached per question"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"DEBUG: About to create question")
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
                geolocation=geolocation_data,
            )
            print(f"DEBUG: Question created with id={question.id}")

            # Create options if provided (for multiple choice)
            option_order = 1
            for opt in options_data:
                if isinstance(opt, dict):
                    text = opt.get('option_text')
                    if text and text.strip():
                        Option.objects.create(
                            question=question,
                            option_text=text,
                            is_correct=bool(opt.get('is_correct', False)),
                            option_order=option_order,
                        )
                        option_order += 1
                        print(f"DEBUG: Created option {option_order - 1}: {text}")

            print(f"DEBUG: Serializing question")
            # Refresh the question to include newly created options
            question = Question.objects.prefetch_related('options', 'options__translations').get(pk=question.pk)
            print(f"DEBUG: Question options count: {question.options.count()}")
            print(f"DEBUG: Question options: {list(question.options.values('id', 'option_text'))}")
            serializer = QuestionSerializer(question)
            print(f"DEBUG: Serialized data options: {serializer.data.get('options', [])}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            print(f"ERROR in questions POST: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Failed to create question: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='start', permission_classes=[permissions.IsAuthenticated])
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

    @action(detail=True, methods=['get'], url_path='progress', permission_classes=[permissions.IsAuthenticated])
    def progress(self, request, pk=None):
        """Return current in-progress attempt progress for the user on this quiz"""
        quiz = self.get_object()
        attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz).order_by('-start_time').first()
        if not attempt:
            return Response({"detail": "No attempt found"}, status=status.HTTP_404_NOT_FOUND)

        # Update current score if quiz is still in progress
        if attempt.status == 'in_progress':
            earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
            hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
            current_score = max(0, earned_points - hint_penalties)
            attempt.score = current_score
            attempt.save()

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path=r'question/(?P<question_id>[^/.]+)', permission_classes=[permissions.IsAuthenticated])
    def question_detail(self, request, pk=None, question_id=None):
        """Get a specific question within this quiz"""
        quiz = self.get_object()
        question = get_object_or_404(
            Question.objects.prefetch_related(
                'options', 'options__translations',
                'hints', 'hints__translations',
                'media_files', 'translations'
            ),
            id=question_id, quiz=quiz
        )

        # Get current attempt for hints context
        attempt = QuizAttempt.objects.filter(
            user=request.user,
            quiz=quiz,
            status='in_progress'
        ).first()

        serializer = QuestionSerializer(question, context={'attempt': attempt, 'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path=r'question/(?P<question_id>[^/.]+)/answer', permission_classes=[permissions.IsAuthenticated])
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

                # Support multiple accepted answers separated by |
                if user_norm is not None and question.correct_answer:
                    accepted_answers = [self._normalize_text(ans) for ans in question.correct_answer.split('|')]
                    is_correct = user_norm in accepted_answers

                # Also check against translated correct answers
                if not is_correct and user_norm is not None:
                    for translation in question.translations.all():
                        if translation.correct_answer:
                            # Support multiple answers in translations too
                            translated_answers = [self._normalize_text(ans) for ans in translation.correct_answer.split('|')]
                            if user_norm in translated_answers:
                                is_correct = True
                                break
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
            earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
            hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
            total_points = max(0, earned_points - hint_penalties)
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

    @action(detail=True, methods=['post'], url_path='complete', permission_classes=[permissions.IsAuthenticated])
    def complete_by_quiz(self, request, pk=None):
        """Complete the current user's attempt for this quiz"""
        quiz = self.get_object()
        attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz, status='in_progress').first()
        if not attempt:
            return Response({"error": "No in-progress attempt found"}, status=status.HTTP_400_BAD_REQUEST)

        total_questions = attempt.quiz.questions.count()
        answered_questions = attempt.answers.count()
        earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
        hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
        total_points = max(0, earned_points - hint_penalties)
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

    @action(detail=True, methods=['post'], url_path=r'question/(?P<question_id>[^/.]+)/hint/(?P<hint_id>[^/.]+)/unlock', permission_classes=[permissions.IsAuthenticated])
    def unlock_hint(self, request, pk=None, question_id=None, hint_id=None):
        """
        Unlock a hint for a question during an active quiz attempt.
        Deducts points and reveals hint content.
        """
        from .models import Hint, HintUnlock

        quiz = self.get_object()

        # Get the user's active attempt
        attempt = QuizAttempt.objects.filter(
            user=request.user,
            quiz=quiz,
            status='in_progress'
        ).first()

        if not attempt:
            return Response(
                {"error": "No active attempt found for this quiz"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the hint
        try:
            hint = Hint.objects.get(id=hint_id, question_id=question_id, question__quiz=quiz)
        except Hint.DoesNotExist:
            return Response(
                {"error": "Hint not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if hint is already unlocked
        if HintUnlock.objects.filter(attempt=attempt, hint=hint).exists():
            return Response(
                {"error": "Hint already unlocked"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check sequential unlocking: must unlock in order
        if hint.hint_order > 1:
            previous_hint_order = hint.hint_order - 1
            previous_hint = Hint.objects.filter(
                question=hint.question,
                hint_order=previous_hint_order
            ).first()

            if previous_hint and not HintUnlock.objects.filter(attempt=attempt, hint=previous_hint).exists():
                return Response(
                    {"error": f"You must unlock Hint {previous_hint_order} before unlocking Hint {hint.hint_order}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create unlock record with points penalty
        points_to_deduct = hint.points_penalty
        hint_unlock = HintUnlock.objects.create(
            attempt=attempt,
            hint=hint,
            points_deducted=points_to_deduct
        )

        # Calculate current score: earned points minus hint penalties
        earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
        hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
        current_score = max(0, earned_points - hint_penalties)

        # Update attempt score
        attempt.score = current_score
        attempt.save()

        # Return the unlocked hint with full content
        from .serializers import HintSerializer
        serializer = HintSerializer(hint, context={'attempt': attempt, 'request': request})

        return Response({
            "message": f"Hint unlocked! {points_to_deduct} points deducted.",
            "hint": serializer.data,
            "points_deducted": points_to_deduct,
            "new_score": current_score
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'delete'], url_path='rate', permission_classes=[permissions.IsAuthenticated])
    def rate_quiz(self, request, pk=None):
        """
        Submit, update, or delete a rating/review for this quiz.
        POST: Create or update rating (with optional review text)
        DELETE: Remove rating
        """
        quiz = self.get_object()

        # Check if user is the quiz creator
        if quiz.creator == request.user:
            return Response(
                {"error": "You cannot rate your own quiz"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == 'DELETE':
            # Delete rating
            try:
                rating = QuizRating.objects.get(quiz=quiz, user=request.user)
                rating.delete()
                # Recalculate quiz rating
                self._update_quiz_rating(quiz)
                return Response(status=status.HTTP_204_NO_CONTENT)
            except QuizRating.DoesNotExist:
                return Response(
                    {"error": "You haven't rated this quiz"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # POST: Create or update rating
        # Check if user has at least one attempt
        has_attempt = QuizAttempt.objects.filter(user=request.user, quiz=quiz).exists()
        if not has_attempt:
            return Response(
                {"error": "You must attempt the quiz before rating it"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuizRatingSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Create or update rating
        rating, created = QuizRating.objects.update_or_create(
            quiz=quiz,
            user=request.user,
            defaults=serializer.validated_data
        )

        # Recalculate quiz rating
        self._update_quiz_rating(quiz)

        return Response(
            ReviewSerializer(rating, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], url_path='reviews')
    def get_reviews(self, request, pk=None):
        """Get all reviews with text for this quiz (paginated)"""
        quiz = self.get_object()
        # Only return ratings that have review_text
        reviews = QuizRating.objects.filter(
            quiz=quiz,
            review_text__isnull=False
        ).exclude(review_text='').select_related('user').order_by('-created_at')

        # Apply pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(reviews, request)
        if page is not None:
            serializer = ReviewSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = ReviewSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='rating-summary')
    def rating_summary(self, request, pk=None):
        """Get rating summary: avg, total, distribution, and user's rating"""
        quiz = self.get_object()
        ratings = quiz.ratings.all()

        # Calculate distribution (count per star rating)
        distribution = {i: 0 for i in range(1, 6)}
        for rating in ratings:
            distribution[rating.rating] += 1

        # Get user's rating and review if authenticated
        user_rating = None
        user_review_text = None
        if request.user.is_authenticated:
            user_rating_obj = ratings.filter(user=request.user).first()
            if user_rating_obj:
                user_rating = user_rating_obj.rating
                user_review_text = user_rating_obj.review_text or ''

        summary = {
            'avg_rating': quiz.avg_rating,
            'total_ratings': quiz.total_ratings,
            'distribution': distribution,
            'user_rating': user_rating,
            'user_review_text': user_review_text
        }

        serializer = RatingSummarySerializer(summary)
        return Response(serializer.data)

    @staticmethod
    def _update_quiz_rating(quiz):
        """Recalculate and update quiz's avg_rating and total_ratings"""
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


class QuestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for questions
    Allows managing quiz questions
    """
    queryset = Question.objects.select_related('quiz').prefetch_related('options', 'media_files')
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
        from .models import QuestionMedia

        quiz_id = self.request.data.get('quiz')
        quiz = get_object_or_404(Quiz, id=quiz_id)

        # Only allow quiz creator to add questions
        if quiz.creator != self.request.user:
            self.permission_denied(self.request)

        # Get the next question order number (use max + 1 to avoid conflicts after deletions)
        max_order = quiz.questions.aggregate(models.Max('question_order'))['question_order__max']
        next_order = (max_order or 0) + 1

        # Save the question first
        question = serializer.save(question_order=next_order)

        # Handle multiple media files using QuestionMedia model
        image_files = self.request.FILES.getlist('images')  # Note: plural
        audio_files = self.request.FILES.getlist('audios')  # Note: plural
        video_files = self.request.FILES.getlist('videos')  # Note: plural

        # Validate total file count per question
        total_files = len(image_files) + len(audio_files) + len(video_files)
        if total_files > MAX_FILES_PER_QUESTION:
            raise serializers.ValidationError(
                f'Maximum {MAX_FILES_PER_QUESTION} files per question allowed. You tried to upload {total_files} files.'
            )

        # Validate total file count per quiz
        existing_quiz_files = QuestionMedia.objects.filter(question__quiz=quiz).count()
        total_quiz_files = existing_quiz_files + total_files
        if total_quiz_files > MAX_FILES_PER_QUIZ:
            raise serializers.ValidationError(
                f'Maximum {MAX_FILES_PER_QUIZ} files per quiz allowed. '
                f'This quiz already has {existing_quiz_files} file(s). '
                f'Adding {total_files} more would exceed the limit.'
            )

        display_order = 0

        # Create QuestionMedia objects for each uploaded file
        for image_file in image_files:
            QuestionMedia.objects.create(
                question=question,
                media_type='image',
                file=image_file,
                display_order=display_order
            )
            display_order += 1

        for audio_file in audio_files:
            QuestionMedia.objects.create(
                question=question,
                media_type='audio',
                file=audio_file,
                display_order=display_order
            )
            display_order += 1

        for video_file in video_files:
            QuestionMedia.objects.create(
                question=question,
                media_type='video',
                file=video_file,
                display_order=display_order
            )
            display_order += 1

        # Handle hints if provided
        hints_raw = self.request.data.get('hints')
        if hints_raw:
            # Parse hints JSON if it's a string
            if isinstance(hints_raw, str):
                try:
                    hints_data = json.loads(hints_raw)
                except json.JSONDecodeError:
                    hints_data = []
            else:
                hints_data = hints_raw if isinstance(hints_raw, list) else []

            # Create hints
            for idx, hint_data in enumerate(hints_data):
                if isinstance(hint_data, dict):
                    # Get hint media files from request.FILES using index-based keys
                    hint_image = self.request.FILES.get(f'hint_{idx}_image')
                    hint_audio = self.request.FILES.get(f'hint_{idx}_audio')
                    hint_video = self.request.FILES.get(f'hint_{idx}_video')
                    hint_text = hint_data.get('hint_text', '').strip()

                    # Validate: hint must have text or media
                    if not hint_text and not hint_image and not hint_audio and not hint_video:
                        raise serializers.ValidationError(
                            f'Hint {idx + 1} is empty. Each hint must have text or media.'
                        )

                    Hint.objects.create(
                        question=question,
                        hint_text=hint_text,
                        points_penalty=hint_data.get('points_penalty', 5),
                        hint_order=hint_data.get('hint_order', 1),
                        hint_image=hint_image,
                        hint_audio=hint_audio,
                        hint_video=hint_video,
                    )

        # Handle options for multiple choice questions
        options_raw = self.request.data.get('options')
        if options_raw:
            # Parse options if it's a JSON string
            if isinstance(options_raw, str):
                try:
                    options_data = json.loads(options_raw)
                except json.JSONDecodeError:
                    options_data = []
            else:
                options_data = options_raw if isinstance(options_raw, list) else []

            # Create options
            for idx, opt_data in enumerate(options_data):
                if isinstance(opt_data, dict) and opt_data.get('option_text', '').strip():
                    Option.objects.create(
                        question=question,
                        option_text=opt_data.get('option_text', '').strip(),
                        is_correct=opt_data.get('is_correct', False),
                        option_order=idx
                    )

        # Store the question for the create method to return
        self._created_question = question

    def create(self, request, *args, **kwargs):
        """Override create to return question with options included"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Refresh the question to include newly created options and hints
        question = Question.objects.prefetch_related(
            'options', 'options__translations', 'media_files', 'hints', 'hints__translations'
        ).get(pk=self._created_question.pk)

        response_serializer = QuestionSerializer(question)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Custom update to handle options and media files"""
        from .models import QuestionMedia

        try:
            instance = self.get_object()
            quiz = instance.quiz

            # Only allow quiz creator to update questions
            if quiz.creator != request.user:
                self.permission_denied(request)

            # Handle options for multiple choice questions
            question_type = request.data.get('question_type', instance.question_type)
            if question_type == 'multiple_choice':
                options_raw = request.data.get('options', [])
                # Parse options if it's a JSON string
                if isinstance(options_raw, str):
                    try:
                        options_data = json.loads(options_raw)
                    except json.JSONDecodeError:
                        options_data = []
                else:
                    options_data = options_raw

                # Delete old options and create new ones
                instance.options.all().delete()
                for idx, opt in enumerate(options_data):
                    if isinstance(opt, dict) and opt.get('option_text', '').strip():
                        Option.objects.create(
                            question=instance,
                            option_text=opt['option_text'],
                            is_correct=opt.get('is_correct', False),
                            option_order=idx + 1
                        )

            # Update the question instance
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            # Handle multiple media files using QuestionMedia model
            image_files = request.FILES.getlist('images')  # Note: plural
            audio_files = request.FILES.getlist('audios')  # Note: plural
            video_files = request.FILES.getlist('videos')  # Note: plural

            # Validate total file count per question (existing + new files)
            existing_count = instance.media_files.count()
            new_files_count = len(image_files) + len(audio_files) + len(video_files)
            total_files = existing_count + new_files_count

            if total_files > MAX_FILES_PER_QUESTION:
                raise serializers.ValidationError(
                    f'Maximum {MAX_FILES_PER_QUESTION} files per question allowed. '
                    f'This question already has {existing_count} file(s). '
                    f'You tried to add {new_files_count} more, which would exceed the limit.'
                )

            # Validate total file count per quiz
            existing_quiz_files = QuestionMedia.objects.filter(question__quiz=quiz).count()
            total_quiz_files = existing_quiz_files + new_files_count
            if total_quiz_files > MAX_FILES_PER_QUIZ:
                raise serializers.ValidationError(
                    f'Maximum {MAX_FILES_PER_QUIZ} files per quiz allowed. '
                    f'This quiz currently has {existing_quiz_files} file(s) across all questions. '
                    f'Adding {new_files_count} more would exceed the limit.'
                )

            # Get the current max display_order for this question
            max_order = instance.media_files.aggregate(models.Max('display_order'))['display_order__max']
            display_order = (max_order or -1) + 1

            # Create QuestionMedia objects for each new uploaded file
            for image_file in image_files:
                QuestionMedia.objects.create(
                    question=instance,
                    media_type='image',
                    file=image_file,
                    display_order=display_order
                )
                display_order += 1

            for audio_file in audio_files:
                QuestionMedia.objects.create(
                    question=instance,
                    media_type='audio',
                    file=audio_file,
                    display_order=display_order
                )
                display_order += 1

            for video_file in video_files:
                QuestionMedia.objects.create(
                    question=instance,
                    media_type='video',
                    file=video_file,
                    display_order=display_order
                )
                display_order += 1

            # Handle hints if provided - delete existing and create new ones
            hints_raw = request.data.get('hints')
            if hints_raw:
                # Delete existing hints for this question
                instance.hints.all().delete()

                # Parse hints JSON if it's a string
                if isinstance(hints_raw, str):
                    try:
                        hints_data = json.loads(hints_raw)
                    except json.JSONDecodeError:
                        hints_data = []
                else:
                    hints_data = hints_raw if isinstance(hints_raw, list) else []

                # Create new hints
                for idx, hint_data in enumerate(hints_data):
                    if isinstance(hint_data, dict):
                        # Get hint media files from request.FILES using index-based keys
                        hint_image = request.FILES.get(f'hint_{idx}_image')
                        hint_audio = request.FILES.get(f'hint_{idx}_audio')
                        hint_video = request.FILES.get(f'hint_{idx}_video')
                        hint_text = hint_data.get('hint_text', '').strip()

                        # Validate: hint must have text or media
                        if not hint_text and not hint_image and not hint_audio and not hint_video:
                            raise serializers.ValidationError(
                                f'Hint {idx + 1} is empty. Each hint must have text or media.'
                            )

                        Hint.objects.create(
                            question=instance,
                            hint_text=hint_text,
                            points_penalty=hint_data.get('points_penalty', 5),
                            hint_order=hint_data.get('hint_order', 1),
                            hint_image=hint_image,
                            hint_audio=hint_audio,
                            hint_video=hint_video,
                        )

            # Refresh the instance to include newly created options, hints and other relations
            instance = Question.objects.prefetch_related(
                'options', 'options__translations', 'media_files', 'hints', 'hints__translations'
            ).get(pk=instance.pk)
            response_serializer = QuestionSerializer(instance)
            return Response(response_serializer.data)
        except Exception as e:
            import traceback
            print(f"Error in QuestionViewSet.update: {str(e)}")
            print(traceback.format_exc())
            raise

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
            earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
            hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
            total_points = max(0, earned_points - hint_penalties)
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
        earned_points = attempt.answers.aggregate(total=models.Sum('points_earned'))['total'] or 0
        hint_penalties = attempt.unlocked_hints.aggregate(total=models.Sum('points_deducted'))['total'] or 0
        total_points = max(0, earned_points - hint_penalties)
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


class QuestionMediaViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing question media files
    Allows deleting individual media files
    """
    queryset = QuestionMedia.objects.all()
    serializer_class = QuestionMediaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only return media for questions in quizzes created by the user"""
        return QuestionMedia.objects.filter(question__quiz__creator=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Delete a media file"""
        instance = self.get_object()
        # Check permission: only quiz creator can delete
        if instance.question.quiz.creator != request.user:
            return Response(
                {"error": "You don't have permission to delete this media"},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# Translation ViewSets
# ============================================

class QuizTranslationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing quiz translations
    """
    queryset = QuizTranslation.objects.all()
    serializer_class = QuizTranslationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter translations by quiz if provided"""
        queryset = QuizTranslation.objects.all()
        quiz_id = self.request.query_params.get('quiz_id')
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        return queryset

    def perform_create(self, serializer):
        """Only quiz creator can add translations"""
        # Get quiz from request data
        quiz_id = self.request.data.get('quiz')
        if quiz_id:
            quiz = Quiz.objects.get(id=quiz_id)
            if quiz.creator != self.request.user:
                self.permission_denied(self.request)
        serializer.save()


class QuestionTranslationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing question translations
    """
    queryset = QuestionTranslation.objects.all()
    serializer_class = QuestionTranslationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter translations by question if provided"""
        queryset = QuestionTranslation.objects.all()
        question_id = self.request.query_params.get('question_id')
        if question_id:
            queryset = queryset.filter(question_id=question_id)
        return queryset

    def perform_create(self, serializer):
        """Only quiz creator can add translations"""
        # Get question from request data
        question_id = self.request.data.get('question')
        if question_id:
            question = Question.objects.get(id=question_id)
            if question.quiz.creator != self.request.user:
                self.permission_denied(self.request)
        serializer.save()


class OptionTranslationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing option translations
    """
    queryset = OptionTranslation.objects.all()
    serializer_class = OptionTranslationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter translations by option if provided"""
        queryset = OptionTranslation.objects.all()
        option_id = self.request.query_params.get('option_id')
        if option_id:
            queryset = queryset.filter(option_id=option_id)
        return queryset

    def perform_create(self, serializer):
        """Only quiz creator can add translations"""
        # Get option from request data
        option_id = self.request.data.get('option')
        if option_id:
            option = Option.objects.get(id=option_id)
            if option.question.quiz.creator != self.request.user:
                self.permission_denied(self.request)
        serializer.save()


class HintTranslationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing hint translations
    """
    queryset = HintTranslation.objects.all()
    serializer_class = HintTranslationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter translations by hint if provided"""
        queryset = HintTranslation.objects.all()
        hint_id = self.request.query_params.get('hint_id')
        if hint_id:
            queryset = queryset.filter(hint_id=hint_id)
        return queryset

    def perform_create(self, serializer):
        """Only quiz creator can add translations"""
        # Get hint from request data
        hint_id = self.request.data.get('hint')
        if hint_id:
            hint = Hint.objects.get(id=hint_id)
            if hint.question.quiz.creator != self.request.user:
                self.permission_denied(self.request)
        serializer.save()


