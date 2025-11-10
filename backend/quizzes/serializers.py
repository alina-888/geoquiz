from rest_framework import serializers
from .models import Option, Question, Quiz, QuizAttempt, UserAnswer, QuestionMedia
from .validators import validate_user_storage_quota


class OptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Option
        fields = ['id', 'question', 'option_text', 'is_correct', 'option_order']
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


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    media_files = QuestionMediaSerializer(many=True, read_only=True)
    has_media = serializers.ReadOnlyField()
    media_type = serializers.ReadOnlyField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_text', 'question_order', 'points_value',
            'question_type', 'image', 'audio', 'video', 'has_media', 'media_type', 'media_url',
            'options', 'media_files', 'geolocation', 'correct_answer'
        ]
        read_only_fields = ['id', 'question_order']

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

    class Meta:
        model = Quiz
        fields = [
            'id', 'creator', 'creator_username', 'title', 'description', 'difficulty_level', 'estimated_duration', 'category',
            'is_published', 'is_geo', 'avg_rating', 'image', 'image_url'
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
