from django.urls import path
from .views import LeaveBalanceView

urlpatterns = [
    path(
        'balances/',
        LeaveBalanceView.as_view(),
        name='leave-balances'
    ),
]