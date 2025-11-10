from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth.password_validation import validate_password
from quizzes.validators import validate_user_storage_quota


class RegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'email']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
        }

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'profile_picture', 'total_points', 'bio', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'email', 'total_points']

    def validate(self, attrs):
        """Check storage quota for profile picture uploads"""
        profile_picture = attrs.get('profile_picture')
        if profile_picture and self.instance:
            validate_user_storage_quota(self.instance, profile_picture.size)
        return super().validate(attrs)

    def update(self, instance, validated_data):
        instance.username = validated_data.get('username', instance.username)
        instance.profile_picture = validated_data.get('profile_picture', instance.profile_picture)
        instance.bio = validated_data.get('bio', instance.bio)
        instance.save()
        return instance