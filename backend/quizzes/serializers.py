from rest_framework import serializers
from .models import Option, Question, Quiz, QuizAttempt, UserAnswer


class OptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Option
        fields = ['id', 'question', 'option_text', 'is_correct', 'option_order']
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    has_media = serializers.ReadOnlyField()
    media_type = serializers.ReadOnlyField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'question_text', 'question_order', 'points_value',
            'question_type', 'image', 'audio', 'video', 'has_media', 'media_type', 'media_url',
            'options', 'correct_answer'
        ]
        read_only_fields = ['id', 'question_order']

    def get_media_url(self, obj):
        return obj.get_media_url()



class QuizSerializer(serializers.ModelSerializer):

    class Meta:
        model = Quiz
        fields = [
            'id', 'creator', 'title', 'description', 'difficulty_level', 'estimated_duration', 'category',
            'is_published', 'avg_rating'
        ]
        read_only_fields = ['id', 'avg_rating', 'creator']


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
