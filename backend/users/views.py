from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout

from .models import CustomUser
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Registration successful"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            # Clear any existing session first
            logout(request)
            # Login with new user
            login(request, user)
            return Response({
                "message": "Login successful",
                "username": user.username,
            })
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"})


class WhoAmIView(APIView):
    """Return current authenticated user info"""
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                "username": request.user.username,
                "is_authenticated": True
            })
        return Response({
            "username": None,
            "is_authenticated": False
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, username):
        return get_object_or_404(CustomUser, username=username)

    def get(self, request, username):
        user = self.get_object(username)
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    def put(self, request, username):
        user = self.get_object(username)
        if user != request.user:
            return Response({"error": "You do not have permission to edit this profile"},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = UserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
