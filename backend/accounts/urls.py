from django.urls import path

""" from .views import (
    LoginView,
    ProfileView
)
 """
from .views import (
    LoginView,
    ProfileView,
    HRDashboardView,
)

urlpatterns = [
    path(
        'login/',
        LoginView.as_view(),
        name='login'
    ),

    path(
        'profile/',
        ProfileView.as_view(),
        name='profile'
    ),

    path(
        'hr-dashboard/',
        HRDashboardView.as_view(),
        name='hr-dashboard'
    ),
]