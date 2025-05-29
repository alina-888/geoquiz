from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # For quizzes, check if the user is the creator
        if hasattr(obj, 'creator'):
            return obj.creator == request.user

        # For user-related objects (attempts, answers), check user
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # For question and option objects, check quiz creator
        if hasattr(obj, 'quiz') and hasattr(obj.quiz, 'creator'):
            return obj.quiz.creator == request.user

        # For options, we need to check through the question
        if hasattr(obj, 'question') and hasattr(obj.question, 'quiz') and hasattr(obj.question.quiz, 'creator'):
            return obj.question.quiz.creator == request.user

        # Default to deny permission
        return False