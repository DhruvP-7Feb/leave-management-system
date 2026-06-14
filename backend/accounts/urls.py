from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    LogoutView,
    ProfileView,
    EmployeeListView,
    EmployeeCreateView,
    DeactivateEmployeeView,
    ReactivateEmployeeView
)

urlpatterns = [
    path(
        'login/',
        LoginView.as_view(),
        name='login'
    ),

    path(
        'logout/',
        LogoutView.as_view(),
        name='logout'
    ),

    path(
        'token/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh'
    ),

    path(
        'profile/',
        ProfileView.as_view(),
        name='profile'
    ),

    path(
        'employees/',
        EmployeeListView.as_view(),
        name='employee-list'
    ),

    path(
        'employees/create/',
        EmployeeCreateView.as_view(),
        name='employee-create'
    ),

    path(
        'employees/<int:user_id>/deactivate/',
        DeactivateEmployeeView.as_view(),
        name='employee-deactivate'
    ),

    path(
        'employees/<int:user_id>/reactivate/',
        ReactivateEmployeeView.as_view(),
        name='employee-reactivate'
    ),
]