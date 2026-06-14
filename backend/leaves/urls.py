from django.urls import path

from .views import (
    LeaveTypeListCreateView,
    PublicHolidayListCreateView,
    PublicHolidayDeleteView,
    LeaveBalanceView,
    ApplyLeaveView,
    MyLeavesView,
    CancelLeaveView,
    ManagerPendingLeavesView,
    ApproveLeaveView,
    RejectLeaveView,
    DelegateApproverView,
)

urlpatterns = [
    # Leave types (#10)
    path(
        'leave-types/',
        LeaveTypeListCreateView.as_view(),
        name='leave-type-list-create'
    ),

    # Public holidays (#11)
    path(
        'holidays/',
        PublicHolidayListCreateView.as_view(),
        name='holiday-list-create'
    ),

    path(
        'holidays/<int:pk>/delete/',
        PublicHolidayDeleteView.as_view(),
        name='holiday-delete'
    ),

    # Balances
    path(
        'balances/',
        LeaveBalanceView.as_view(),
        name='leave-balances'
    ),

    # Apply leave
    path(
        'apply/',
        ApplyLeaveView.as_view(),
        name='apply-leave'
    ),

    # My leaves
    path(
        'my-leaves/',
        MyLeavesView.as_view(),
        name='my-leaves'
    ),

    # Cancel
    path(
        '<int:leave_id>/cancel/',
        CancelLeaveView.as_view(),
        name='cancel-leave'
    ),

    # Manager
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

    # Delegate (#12)
    path(
        'delegate/',
        DelegateApproverView.as_view(),
        name='delegate-list-create'
    ),

    path(
        'delegate/<int:pk>/delete/',
        DelegateApproverView.as_view(),
        name='delegate-delete'
    ),
]