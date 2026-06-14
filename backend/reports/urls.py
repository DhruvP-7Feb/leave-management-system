from django.urls import path

from .views import (
    HRDashboardView,
    HRLeaveReportView,
    HRLeaveBalanceReportView,
    ExportLeaveReportCSVView,
)

urlpatterns = [
    path(
        'dashboard/',
        HRDashboardView.as_view(),
        name='hr-dashboard'
    ),

    path(
        'leaves/',
        HRLeaveReportView.as_view(),
        name='hr-leave-report'
    ),

    path(
        'balances/',
        HRLeaveBalanceReportView.as_view(),
        name='hr-balance-report'
    ),

    path(
        'leaves/export-csv/',
        ExportLeaveReportCSVView.as_view(),
        name='export-csv'
    ),
]
