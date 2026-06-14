from django.contrib import admin

from .models import (
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    DelegateApprover,
)


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'name',
        'annual_quota',
        'is_active'
    )


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'employee',
        'leave_type',
        'total_days',
        'used_days',
        'remaining_days'
    )

    search_fields = (
        'employee__name',
    )


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'employee',
        'leave_type',
        'start_date',
        'end_date',
        'total_days',
        'status',
        'created_at'
    )

    list_filter = (
        'status',
        'leave_type'
    )

    search_fields = (
        'employee__name',
    )


@admin.register(PublicHoliday)
class PublicHolidayAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'name',
        'date',
        'year'
    )


@admin.register(DelegateApprover)
class DelegateApproverAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'manager',
        'delegate',
        'start_date',
        'end_date',
        'is_active',
    )

    list_filter = (
        'is_active',
    )