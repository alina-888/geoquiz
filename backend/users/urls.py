from django.urls import path
from .views import ProfileView, RegisterView, LoginView, LogoutView, WhoAmIView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("whoami/", WhoAmIView.as_view(), name="whoami"),
    path("profile/<str:username>", ProfileView.as_view(), name="profile"),
]
