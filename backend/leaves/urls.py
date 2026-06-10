from django.urls import path

from .views import (
    LeaveBalanceView,
    ApplyLeaveView,
    MyLeavesView,
    CancelLeaveView,
    ManagerPendingLeavesView,
    ApproveLeaveView,
    RejectLeaveView,
    HRDashboardView
)
urlpatterns = [
    path(
        'balances/',
        LeaveBalanceView.as_view(),
        name='leave-balances'
    ),

    path(
        'apply/',
        ApplyLeaveView.as_view(),
        name='apply-leave'
    ),

    path(
        'my-leaves/',
        MyLeavesView.as_view(),
        name='my-leaves'
    ),

    path(
        '<int:leave_id>/cancel/',
        CancelLeaveView.as_view(),
        name='cancel-leave'
    ),

    path(
        'pending-requests/',
        ManagerPendingLeavesView.as_view(),
        name='pending-requests'
    ),

    path(
        '<int:leave_id>/approve/',
        ApproveLeaveView.as_view(),
        name='approve-leave'
    ),

    path(
        '<int:leave_id>/reject/',
        RejectLeaveView.as_view(),
        name='reject-leave'
    ),

    path(
        'hr/dashboard/',
        HRDashboardView.as_view(),
        name='hr-dashboard'
    ),
]