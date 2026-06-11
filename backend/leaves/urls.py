from django.urls import path

from .views import (
    LeaveBalanceView,
    ApplyLeaveView,
    MyLeavesView,
    CancelLeaveView,
    ManagerPendingLeavesView,
    ApproveLeaveView,
    RejectLeaveView,
    HRDashboardView,
    HRLeaveReportView,
    HRLeaveBalanceReportView,
    ExportLeaveReportCSVView
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

    path(
        'hr/leave-report/',
        HRLeaveReportView.as_view(),
        name='hr-leave-report'
    ),

    path(
        'hr/balances/',
        HRLeaveBalanceReportView.as_view(),
        name='hr-balance-report'
    ),

    path(
        'hr/export-csv/',
        ExportLeaveReportCSVView.as_view(),
        name='export-csv'
    ),
]