from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import (
    LeaveRequest,
    LeaveBalance
)
from .serializers import (
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveRequestListSerializer,
    ManagerLeaveRequestSerializer,
    RejectLeaveSerializer
)
from .utils import calculate_working_days
from django.db.models import Q
from django.utils import timezone

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

        return Response(
            serializer.data
        )


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

            is_half_day = serializer.validated_data['is_half_day']

            total_days = calculate_working_days(
                start_date,
                end_date
            )

            if is_half_day:

                total_days = 0.5

            leave_balance = LeaveBalance.objects.get(
                employee=request.user,
                leave_type=leave_type
            )

            if leave_balance.remaining_days < total_days:

                return Response(
                    {
                        'error': 'Insufficient leave balance.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            overlapping_leave = LeaveRequest.objects.filter(
                employee=request.user
            ).filter(
                Q(status='pending') |
                Q(status='approved')
            ).filter(
                start_date__lte=end_date,
                end_date__gte=start_date
            ).exists()

            if overlapping_leave:

                return Response(
                    {
                        'error': 'You already have an overlapping leave request.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            leave_request = LeaveRequest.objects.create(
                employee=request.user,
                leave_type=leave_type,
                start_date=start_date,
                end_date=end_date,
                reason=serializer.validated_data['reason'],
                is_half_day=is_half_day,
                proxy_employee=serializer.validated_data['proxy_employee'],
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

        return Response(
            serializer.data
        )

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
                {
                    'error': 'Leave request not found.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if leave_request.status == 'rejected':

            return Response(
                {
                    'error': 'Rejected leave cannot be cancelled.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if leave_request.status == 'cancelled':

            return Response(
                {
                    'error': 'Leave is already cancelled.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.now().date()

        if today >= leave_request.start_date:

            return Response(
                {
                    'error': 'Leave cannot be cancelled after it has started.'
                },
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
            {
                'message': 'Leave cancelled successfully.'
            }
        )

class ManagerPendingLeavesView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if request.user.role not in ['manager', 'hr_admin']:

            return Response(
                {
                    'error': 'You are not authorized to view leave requests.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if request.user.role == 'hr_admin':

            pending_requests = LeaveRequest.objects.filter(
                status='pending'
            )

        else:

            pending_requests = LeaveRequest.objects.filter(
                employee__department=request.user.department,
                status='pending'
            )

        serializer = ManagerLeaveRequestSerializer(
            pending_requests,
            many=True
        )

        return Response(
            serializer.data
        )
    
class ApproveLeaveView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):

        if request.user.role not in ['manager', 'hr_admin']:

            return Response(
                {
                    'error': 'You are not authorized to approve leaves.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:

            leave_request = LeaveRequest.objects.get(
                id=leave_id,
                status='pending'
            )

        except LeaveRequest.DoesNotExist:

            return Response(
                {
                    'error': 'Pending leave request not found.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if (
            request.user.role == 'manager'
            and
            leave_request.employee.department != request.user.department
        ):

            return Response(
                {
                    'error': 'You can approve only your department employees.'
                },
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
            {
                'message': 'Leave approved successfully.'
            }
        )
    
class RejectLeaveView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, leave_id):

        if request.user.role not in ['manager', 'hr_admin']:

            return Response(
                {
                    'error': 'You are not authorized to reject leaves.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

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
                {
                    'error': 'Pending leave request not found.'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if (
            request.user.role == 'manager'
            and
            leave_request.employee.department != request.user.department
        ):

            return Response(
                {
                    'error': 'You can reject only your department employees.'
                },
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
            {
                'message': 'Leave rejected successfully.'
            }
        )    