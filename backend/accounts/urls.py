from django.urls import path
from .views import (
    LoginView,
    ProfileView,
    HRDashboardView,
    EmployeeCreateView
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

    path(
        'employees/',
        EmployeeCreateView.as_view(),
        name='employee-create'
    ),
]