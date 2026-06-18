import csv
import math
from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from accounts.permissions import IsHRAdmin, IsManagerOrHRAdmin
from accounts.models import User

from .models import (
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    DelegateApprover,
)
from .serializers import (
    LeaveTypeSerializer,
    PublicHolidaySerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveRequestListSerializer,
    ManagerLeaveRequestSerializer,
    RejectLeaveSerializer,
    HRLeaveRequestSerializer,
    HRLeaveBalanceSerializer,
    DelegateApproverSerializer,
)
from .utils import calculate_working_days


# ──────────────────────────────────────────────
# Leave Type CRUD  (#10)
# ──────────────────────────────────────────────

class LeaveTypeListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        leave_types = LeaveType.objects.all().order_by('id')
        serializer = LeaveTypeSerializer(
            leave_types,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        if request.user.role != 'hr_admin':
            return Response(
                {'error': 'Only HR Admin can create leave types.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = LeaveTypeSerializer(data=request.data)

        if serializer.is_valid():
            leave_type = serializer.save()

            # (#27) Auto-create balances for all existing active employees
            active_employees = User.objects.filter(
                is_active=True
            ).exclude(
                role='hr_admin'
            )

            for employee in active_employees:
                # Skip if balance already exists
                if LeaveBalance.objects.filter(
                    employee=employee,
                    leave_type=leave_type
                ).exists():
                    continue

                joining_month = employee.joining_date.month
                remaining_months = 12 - joining_month + 1

                prorated_days = math.ceil(
                    leave_type.annual_quota * remaining_months / 12
                )

                LeaveBalance.objects.create(
                    employee=employee,
                    leave_type=leave_type,
                    total_days=prorated_days
                )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ──────────────────────────────────────────────
# Public Holiday CRUD  (#11)
# ──────────────────────────────────────────────

class PublicHolidayListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        holidays = PublicHoliday.objects.all().order_by('date')
        serializer = PublicHolidaySerializer(
            holidays,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        if request.user.role != 'hr_admin':
            return Response(
                {'error': 'Only HR Admin can add public holidays.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PublicHolidaySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PublicHolidayDeleteView(APIView):

    permission_classes = [IsHRAdmin]

    def delete(self, request, pk):

        try:
            holiday = PublicHoliday.objects.get(id=pk)
        except PublicHoliday.DoesNotExist:
            return Response(
                {'error': 'Public holiday not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        holiday.delete()

        return Response(
            {'message': 'Public holiday deleted.'},
            status=status.HTTP_200_OK
        )


# ──────────────────────────────────────────────
# Leave Balance
# ──────────────────────────────────────────────

class LeaveBalanceView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        balances = LeaveBalance.objects.filter(
            employee=request.user
        )

        serializer = LeaveBalanceSerializer(
            balances,
            many=True
        )

        return Response(serializer.data)


# ──────────────────────────────────────────────
# Apply Leave
# ──────────────────────────────────────────────

class ApplyLeaveView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = LeaveRequestSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():

            leave_type = serializer.validated_data['leave_type']
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            is_half_day = serializer.validated_data.get('is_half_day', False)

            total_days = calculate_working_days(
                start_date,
                end_date
            )

            if is_half_day:
                total_days = 0.5

            try:
                leave_balance = LeaveBalance.objects.get(
                    employee=request.user,
                    leave_type=leave_type
                )
            except LeaveBalance.DoesNotExist:
                return Response(
                    {
                        "error": "Leave balance record not found. Contact HR."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if leave_balance.remaining_days < total_days:
                return Response(
                    {'error': 'Insufficient leave balance.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            overlapping_leave = LeaveRequest.objects.filter(
                employee=request.user
            ).filter(
                Q(status='pending') | Q(status='approved')
            ).filter(
                start_date__lte=end_date,
                end_date__gte=start_date
            ).exists()

            if overlapping_leave:
                return Response(
                    {'error': 'You already have an overlapping leave request.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            leave_request = LeaveRequest.objects.create(
                employee=request.user,
                leave_type=leave_type,
                start_date=start_date,
                end_date=end_date,
                reason=serializer.validated_data['reason'],
                is_half_day=is_half_day,
                proxy_employee=serializer.validated_data.get('proxy_employee'),
                total_days=total_days
            )

            return Response(
                {
                    'message': 'Leave request submitted successfully.',
                    'leave_request_id': leave_request.id,
                    'status': leave_request.status
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ──────────────────────────────────────────────
# My Leaves
# ──────────────────────────────────────────────

class MyLeavesView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        leaves = LeaveRequest.objects.filter(
            employee=request.user
        ).order_by('-created_at')

        serializer = LeaveRequestListSerializer(
            leaves,
            many=True
        )

        return Response(serializer.data)


# ──────────────────────────────────────────────
# Cancel Leave
# ──────────────────────────────────────────────

class CancelLeaveView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):

        try:
            leave_request = LeaveRequest.objects.get(
                id=leave_id,
                employee=request.user
            )
        except LeaveRequest.DoesNotExist:
            return Response(
                {'error': 'Leave request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if leave_request.status == 'rejected':
            return Response(
                {'error': 'Rejected leave cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if leave_request.status == 'cancelled':
            return Response(
                {'error': 'Leave is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.now().date()

        if today >= leave_request.start_date:
            return Response(
                {'error': 'Leave cannot be cancelled after it has started.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore balance if approved leave is cancelled
        if leave_request.status == 'approved':
            leave_balance = LeaveBalance.objects.get(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type
            )
            leave_balance.used_days -= leave_request.total_days
            leave_balance.save()

        leave_request.status = 'cancelled'
        leave_request.cancelled_at = timezone.now()
        leave_request.save()

        return Response(
            {'message': 'Leave cancelled successfully.'}
        )


# ──────────────────────────────────────────────
# Helper: check if user can approve for a department
# ──────────────────────────────────────────────

def _can_user_approve(user, leave_request):
    """
    Returns True if the user is authorized to approve/reject
    the given leave request.
    Handles: direct manager, HR admin, or active delegate.
    """
    employee = leave_request.employee

    # (#1) Manager cannot approve their own leave
    if employee == user:
        return False

    # HR Admin can approve any request
    if user.role == 'hr_admin':
        return True

    if user.role == 'manager':
        employee_dept = employee.department
        if employee_dept and employee_dept.manager == user:
            return True

        # (#12) Check if user is an active delegate for the
        # employee's department manager
        today = timezone.now().date()
        if employee_dept and employee_dept.manager:
            is_delegate = DelegateApprover.objects.filter(
                manager=employee_dept.manager,
                delegate=user,
                is_active=True,
                start_date__lte=today,
                end_date__gte=today,
            ).exists()
            if is_delegate:
                return True

    return False


# ──────────────────────────────────────────────
# Manager Pending Leaves  (#2 fixed filter)
# ──────────────────────────────────────────────

class ManagerPendingLeavesView(APIView):

    permission_classes = [IsManagerOrHRAdmin]

    def get(self, request):

        if request.user.role == 'hr_admin':
            # HR Admin sees ALL pending requests
            pending_requests = LeaveRequest.objects.filter(
                status='pending'
            )
        else:
            # (#2) Manager sees requests from departments they manage
            # Also include requests delegated to them
            today = timezone.now().date()

            managed_dept_requests = LeaveRequest.objects.filter(
                employee__department__manager=request.user,
                status='pending'
            ).exclude(employee=request.user)

            # Delegated requests
            active_delegations = DelegateApprover.objects.filter(
                delegate=request.user,
                is_active=True,
                start_date__lte=today,
                end_date__gte=today,
            ).values_list('manager', flat=True)

            delegated_requests = LeaveRequest.objects.filter(
                employee__department__manager__in=active_delegations,
                status='pending'
            ).exclude(employee=request.user)

            pending_requests = (
                managed_dept_requests | delegated_requests
            ).distinct()

        serializer = ManagerLeaveRequestSerializer(
            pending_requests,
            many=True
        )

        return Response(serializer.data)


# ──────────────────────────────────────────────
# Approve Leave  (#1 self-approval blocked)
# ──────────────────────────────────────────────

class ApproveLeaveView(APIView):

    permission_classes = [IsManagerOrHRAdmin]

    def post(self, request, leave_id):

        try:
            leave_request = LeaveRequest.objects.get(
                id=leave_id,
                status='pending'
            )
        except LeaveRequest.DoesNotExist:
            return Response(
                {'error': 'Pending leave request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # (#1) Block self-approval
        if leave_request.employee == request.user:
            return Response(
                {'error': 'You cannot approve your own leave request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not _can_user_approve(request.user, leave_request):
            return Response(
                {'error': 'You are not authorized to approve this leave request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        leave_balance = LeaveBalance.objects.get(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type
        )

        leave_balance.used_days += leave_request.total_days
        leave_balance.save()

        leave_request.status = 'approved'
        leave_request.approved_by = request.user
        leave_request.actioned_at = timezone.now()
        leave_request.save()

        return Response(
            {'message': 'Leave approved successfully.'}
        )


# ──────────────────────────────────────────────
# Reject Leave  (#1 self-rejection blocked)
# ──────────────────────────────────────────────

class RejectLeaveView(APIView):

    permission_classes = [IsManagerOrHRAdmin]

    def post(self, request, leave_id):

        serializer = RejectLeaveSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            leave_request = LeaveRequest.objects.get(
                id=leave_id,
                status='pending'
            )
        except LeaveRequest.DoesNotExist:
            return Response(
                {'error': 'Pending leave request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # (#1) Block self-rejection
        if leave_request.employee == request.user:
            return Response(
                {'error': 'You cannot reject your own leave request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not _can_user_approve(request.user, leave_request):
            return Response(
                {'error': 'You are not authorized to reject this leave request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        leave_request.status = 'rejected'
        leave_request.rejection_reason = serializer.validated_data[
            'rejection_reason'
        ]
        leave_request.approved_by = request.user
        leave_request.actioned_at = timezone.now()
        leave_request.save()

        return Response(
            {'message': 'Leave rejected successfully.'}
        )


# ──────────────────────────────────────────────
# Delegate Approver  (#12)
# ──────────────────────────────────────────────

class DelegateApproverView(APIView):

    permission_classes = [IsManagerOrHRAdmin]

    def get(self, request):
        """List active delegations for the current manager."""
        delegations = DelegateApprover.objects.filter(
            manager=request.user,
            is_active=True
        )
        serializer = DelegateApproverSerializer(
            delegations,
            many=True
        )
        return Response(serializer.data)

    def post(self, request):
        """Assign a delegate for approvals."""
        serializer = DelegateApproverSerializer(
            data=request.data
        )

        if serializer.is_valid():
            manager = serializer.validated_data.get(
                'manager', request.user
            )

            # Only HR Admin can delegate on behalf of others
            if manager != request.user and request.user.role != 'hr_admin':
                return Response(
                    {'error': 'You can only create delegations for yourself.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            delegate = serializer.validated_data['delegate']

            if delegate == manager:
                return Response(
                    {'error': 'You cannot delegate to yourself.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if delegate.role not in ['manager', 'hr_admin']:
                return Response(
                    {'error': 'Delegate must be a manager or HR admin.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save(manager=manager)

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk=None):
        """Deactivate a delegation."""
        try:
            delegation = DelegateApprover.objects.get(
                id=pk,
                manager=request.user
            )
        except DelegateApprover.DoesNotExist:
            return Response(
                {'error': 'Delegation not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        delegation.is_active = False
        delegation.save()

        return Response(
            {'message': 'Delegation removed.'},
            status=status.HTTP_200_OK
        )


# ──────────────────────────────────────────────
# HR Dashboard
# ──────────────────────────────────────────────

class HRDashboardView(APIView):

    permission_classes = [IsAuthenticated, IsHRAdmin]

    def get(self, request):

        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)

        total_leaves_this_month = LeaveRequest.objects.filter(
            status='approved',
            start_date__gte=first_day_of_month,
            start_date__lte=today
        ).count()

        pending_approvals = LeaveRequest.objects.filter(
            status='pending'
        ).count()

        upcoming_leaves = LeaveRequest.objects.filter(
            status='approved',
            start_date__gte=today,
            start_date__lte=today + timedelta(days=7)
        ).count()

        return Response(
            {
                "total_leaves_this_month": total_leaves_this_month,
                "pending_approvals": pending_approvals,
                "upcoming_leaves_this_week": upcoming_leaves
            }
        )


# ──────────────────────────────────────────────
# HR Leave Report (with filters)  (#3 removed duplicate)
# ──────────────────────────────────────────────

def _apply_leave_filters(queryset, request):
    """Shared filter logic for report view and CSV export (#20)."""

    employee = request.GET.get('employee')
    department = request.GET.get('department')
    status_filter = request.GET.get('status')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if employee:
        queryset = queryset.filter(
            employee__name__icontains=employee
        )

    if department:
        queryset = queryset.filter(
            employee__department__name__icontains=department
        )

    if status_filter:
        queryset = queryset.filter(
            status=status_filter
        )

    if start_date:
        queryset = queryset.filter(
            start_date__gte=start_date
        )

    if end_date:
        queryset = queryset.filter(
            end_date__lte=end_date
        )

    return queryset.order_by('-created_at')


class HRLeaveReportView(APIView):

    permission_classes = [IsAuthenticated, IsHRAdmin]

    def get(self, request):

        leave_requests = _apply_leave_filters(
            LeaveRequest.objects.all(),
            request
        )

        serializer = HRLeaveRequestSerializer(
            leave_requests,
            many=True
        )

        return Response(serializer.data)


# ──────────────────────────────────────────────
# HR Leave Balance Report
# ──────────────────────────────────────────────

class HRLeaveBalanceReportView(APIView):

    permission_classes = [IsAuthenticated, IsHRAdmin]

    def get(self, request):

        balances = LeaveBalance.objects.select_related(
            'employee',
            'employee__department',
            'leave_type'
        )

        serializer = HRLeaveBalanceSerializer(
            balances,
            many=True
        )

        return Response(serializer.data)


# ──────────────────────────────────────────────
# CSV Export  (#6 null-safe, #20 filters added)
# ──────────────────────────────────────────────

class ExportLeaveReportCSVView(APIView):

    permission_classes = [IsAuthenticated, IsHRAdmin]

    def get(self, request):

        response = HttpResponse(
            content_type='text/csv'
        )

        response[
            'Content-Disposition'
        ] = 'attachment; filename="leave_report.csv"'

        writer = csv.writer(response)

        writer.writerow([
            'Employee',
            'Department',
            'Leave Type',
            'Start Date',
            'End Date',
            'Total Days',
            'Status',
            'Approved By',
            'Created At'
        ])

        # (#20) Apply same filters as the report view
        leave_requests = _apply_leave_filters(
            LeaveRequest.objects.all(),
            request
        )

        for leave in leave_requests:
            writer.writerow([
                leave.employee.name,
                # (#6) Null-safe department access
                leave.employee.department.name
                if leave.employee.department
                else '',
                leave.leave_type.name,
                leave.start_date,
                leave.end_date,
                leave.total_days,
                leave.status,
                leave.approved_by.name
                if leave.approved_by
                else '',
                leave.created_at
            ])

        return response