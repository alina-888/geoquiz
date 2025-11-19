from rest_framework import serializers
from .models import (
    Option, Question, Quiz, QuizAttempt, UserAnswer, QuestionMedia, Hint, HintUnlock,
    QuizTranslation, QuestionTranslation, OptionTranslation, HintTranslation
)
from .validators import validate_user_storage_quota


# ============================================
# Translation Serializers
# ============================================

class QuizTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizTranslation
        fields = ['id', 'quiz', 'language', 'title', 'description']
        read_only_fields = ['id']

    def validate(self, attrs):
        """Prevent creating translations for the quiz's default language"""
        quiz = attrs.get('quiz')
        language = attrs.get('language')

        if quiz and language and quiz.default_language == language:
            raise serializers.ValidationError({
                'language': f'Cannot create translation for the default language ({language}). The main quiz fields already contain content in this language.'
            })

        return super().validate(attrs)


class QuestionTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTranslation
        fields = ['id', 'question', 'language', 'question_text', 'correct_answer']
        read_only_fields = ['id']


class OptionTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionTranslation
        fields = ['id', 'option', 'language', 'option_text']
        read_only_fields = ['id']


class HintTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HintTranslation
        fields = ['id', 'hint', 'language', 'hint_text']
        read_only_fields = ['id']


# ============================================
# Main Serializers
# ============================================

class OptionSerializer(serializers.ModelSerializer):
    translations = OptionTranslationSerializer(many=True, read_only=True)

    class Meta:
        model = Option
        fields = ['id', 'question', 'option_text', 'is_correct', 'option_order', 'translations']
        read_only_fields = ['id']


class QuestionMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()

    class Meta:
        model = QuestionMedia
        fields = ['id', 'question', 'media_type', 'file', 'file_url', 'display_order', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def validate(self, attrs):
        """Check storage quota before allowing file upload"""
        file = attrs.get('file')
        if file:
            # Get the user from the question's quiz creator
            question = attrs.get('question')
            if question and hasattr(question, 'quiz') and hasattr(question.quiz, 'creator'):
                user = question.quiz.creator
                validate_user_storage_quota(user, file.size)
        return super().validate(attrs)


class HintSerializer(serializers.ModelSerializer):
    """
    Serializer for hints - shows different data based on whether hint is unlocked
    """
    media_url = serializers.SerializerMethodField()
    has_media = serializers.ReadOnlyField()
    media_type = serializers.ReadOnlyField()
    is_unlocked = serializers.SerializerMethodField()
    translations = HintTranslationSerializer(many=True, read_only=True)

    class Meta:
        model = Hint
        fields = [
            'id', 'question', 'hint_text', 'hint_image', 'hint_audio', 'hint_video',
            'points_penalty', 'hint_order', 'has_media', 'media_type', 'media_url',
            'is_unlocked', 'translations'
        ]
        read_only_fields = ['id']

    def get_media_url(self, obj):
        """Return media URL only if hint is unlocked"""
        request = self.context.get('request')
        if not request:
            return None

        # Check if hint is unlocked for current user's attempt
        attempt = self.context.get('attempt')
        if not attempt:
            return obj.get_media_url()  # Creator view, show everything

        is_unlocked = HintUnlock.objects.filter(attempt=attempt, hint=obj).exists()
        if is_unlocked:
            return obj.get_media_url()

        return None

    def get_is_unlocked(self, obj):
        """Check if hint is unlocked for current attempt"""
        attempt = self.context.get('attempt')
        if not attempt:
            return False  # No attempt context

        return HintUnlock.objects.filter(attempt=attempt, hint=obj).exists()

    def to_representation(self, instance):
        """Hide hint content if not unlocked (for players)"""
        representation = super().to_representation(instance)

        attempt = self.context.get('attempt')
        if not attempt:
            # Creator view, return everything
            return representation

        # Player view - check if unlocked
        is_unlocked = HintUnlock.objects.filter(attempt=attempt, hint=instance).exists()

        if not is_unlocked:
            # Hide content for locked hints
            representation['hint_text'] = None
            representation['hint_image'] = None
            representation['hint_audio'] = None
            representation['hint_video'] = None
            representation['media_url'] = None

        return representation


class HintUnlockSerializer(serializers.ModelSerializer):
    """
    Serializer for tracking unlocked hints
    """
    hint_details = HintSerializer(source='hint', read_only=True)

    class Meta:
        model = HintUnlock
        fields = ['id', 'attempt', 'hint', 'hint_details', 'unlocked_at', 'points_deducted']
        read_only_fields = ['id', 'unlocked_at', 'points_deducted']


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    media_files = QuestionMediaSerializer(many=True, read_only=True)
    hints = serializers.SerializerMethodField()
    has_media = serializers.ReadOnlyField()
    media_type = serializers.ReadOnlyField()
    media_url = serializers.SerializerMethodField()
    translations = QuestionTranslationSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_text', 'question_order', 'points_value',
            'question_type', 'image', 'audio', 'video', 'has_media', 'media_type', 'media_url',
            'options', 'media_files', 'hints', 'geolocation', 'correct_answer', 'translations'
        ]
        read_only_fields = ['id', 'question_order']

    def get_hints(self, obj):
        """Get hints for this question with proper context"""
        hints = obj.hints.all()
        attempt = self.context.get('attempt')
        return HintSerializer(hints, many=True, context={'attempt': attempt}).data

    def get_media_url(self, obj):
        return obj.get_media_url()

    def validate(self, attrs):
        """Disallow geolocation on questions for non-geo quizzes."""
        quiz = None
        # When creating, quiz may be provided in attrs; on update, use instance
        if 'quiz' in attrs:
            quiz = attrs.get('quiz')
        elif getattr(self, 'instance', None) is not None:
            quiz = getattr(self.instance, 'quiz', None)

        geolocation = attrs.get('geolocation', None)

        if quiz is not None and geolocation not in (None, {}, [], ''):
            # If quiz is known and not geo, block any geolocation payload
            if getattr(quiz, 'is_geo', False) is False:
                raise serializers.ValidationError({
                    'geolocation': 'Geolocation is only allowed for geo quizzes.'
                })

        return super().validate(attrs)



class QuizSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    image_url = serializers.SerializerMethodField()
    translations = QuizTranslationSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'creator', 'creator_username', 'title', 'description', 'difficulty_level', 'estimated_duration', 'category',
            'is_published', 'is_geo', 'avg_rating', 'image', 'image_url', 'default_language', 'translations'
        ]
        read_only_fields = ['id', 'avg_rating', 'creator', 'creator_username']

    def get_image_url(self, obj):
        """Return full URL for the image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def validate(self, attrs):
        """Check storage quota for quiz image uploads"""
        image = attrs.get('image')
        if image:
            # Get user from instance or context
            user = None
            if self.instance:
                user = self.instance.creator
            else:
                request = self.context.get('request')
                if request and hasattr(request, 'user'):
                    user = request.user

            if user:
                validate_user_storage_quota(user, image.size)

        return super().validate(attrs)

    def validate_is_geo(self, value):
        """Prevent changing is_geo to False if quiz has questions with geolocation"""
        # Only validate on update (when instance exists)
        if self.instance:
            # If trying to change from True to False
            if self.instance.is_geo and not value:
                # Check if there are any questions with geolocation
                has_geo_questions = self.instance.questions.filter(geolocation__isnull=False).exists()
                if has_geo_questions:
                    raise serializers.ValidationError(
                        'Cannot change quiz to non-geo: this quiz has questions with geolocation data. '
                        'Remove geolocation from all questions first.'
                    )
        return value


class QuizDetailSerializer(QuizSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']


class UserAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAnswer
        fields = ['id', 'attempt', 'question', 'selected_option', 'answered_at', 'text', 'is_correct', 'points_earned']
        read_only_fields = ['id', 'answered_at', 'is_correct', 'points_earned']


class QuizAttemptSerializer(serializers.ModelSerializer):
    # quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    answers = UserAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'user', 'quiz', 'start_time', 'end_time',
            'score', 'completion_percentage', 'status', 'answers'
        ]
        read_only_fields = ['id', 'start_time', 'end_time', 'score', 'completion_percentage']
