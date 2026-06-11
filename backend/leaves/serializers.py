from rest_framework import serializers
from .models import LeaveBalance
from .models import LeaveRequest
from django.utils import timezone
class LeaveBalanceSerializer(serializers.ModelSerializer):

    leave_type = serializers.CharField(
        source='leave_type.name',
        read_only=True
    )

    remaining_days = serializers.ReadOnlyField()

    class Meta:

        model = LeaveBalance

        fields = [
            'leave_type',
            'total_days',
            'used_days',
            'remaining_days'
        ]

""" class LeaveRequestSerializer(serializers.ModelSerializer):

    class Meta:

        model = LeaveRequest

        fields = [
            'id',
            'leave_type',
            'start_date',
            'end_date',
            'reason',
            'is_half_day',
            'proxy_employee',
            'total_days',
            'status',
            'created_at'
        ]

        read_only_fields = [
            'total_days',
            'status',
            'created_at'
        ]        

    def validate(self, data):

        start_date = data['start_date']
        end_date = data['end_date']
        proxy_employee = data['proxy_employee']

        if start_date < timezone.now().date():

            raise serializers.ValidationError(
                "Start date cannot be in the past."
            )

        if end_date < start_date:

            raise serializers.ValidationError(
                "End date cannot be before start date."
            )

        request_user = self.context['request'].user

        if proxy_employee == request_user:

            raise serializers.ValidationError(
                "You cannot assign yourself as proxy employee."
            )

        if (
            data.get('is_half_day')
            and start_date != end_date
        ):

            raise serializers.ValidationError(
                "Half-day leave can only be applied for a single day."
            )

        return data """

class LeaveRequestSerializer(serializers.ModelSerializer):

    class Meta:

        model = LeaveRequest

        fields = [
            'id',
            'leave_type',
            'start_date',
            'end_date',
            'reason',
            'is_half_day',
            'proxy_employee',
            'total_days',
            'status',
            'created_at'
        ]

        read_only_fields = [
            'total_days',
            'status',
            'created_at'
        ]

    def validate(self, data):

        start_date = data['start_date']
        end_date = data['end_date']
        proxy_employee = data['proxy_employee']

        if start_date < timezone.now().date():

            raise serializers.ValidationError(
                "Start date cannot be in the past."
            )

        if end_date < start_date:

            raise serializers.ValidationError(
                "End date cannot be before start date."
            )

        request_user = self.context['request'].user

        if proxy_employee == request_user:

            raise serializers.ValidationError(
                "You cannot assign yourself as proxy employee."
            )

        if proxy_employee.role != 'employee':

            raise serializers.ValidationError(
                "Proxy employee must have employee role."
            )

        if proxy_employee.department != request_user.department:

            raise serializers.ValidationError(
                "Proxy employee must belong to your department."
            )

        if (
            data.get('is_half_day')
            and start_date != end_date
        ):

            raise serializers.ValidationError(
                "Half-day leave can only be applied for a single day."
            )

        return data
    
class LeaveRequestListSerializer(serializers.ModelSerializer):

    leave_type = serializers.CharField(
        source='leave_type.name'
    )

    class Meta:

        model = LeaveRequest

        fields = [
            'id',
            'leave_type',
            'start_date',
            'end_date',
            'total_days',
            'status',
            'created_at'
        ]    

class ManagerLeaveRequestSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        source='employee.name'
    )

    department = serializers.CharField(
        source='employee.department.name'
    )

    leave_type = serializers.CharField(
        source='leave_type.name'
    )

    class Meta:

        model = LeaveRequest

        fields = [
            'id',
            'employee_name',
            'department',
            'leave_type',
            'start_date',
            'end_date',
            'total_days',
            'reason',
            'status',
            'created_at'
        ]

class RejectLeaveSerializer(serializers.Serializer):

    rejection_reason = serializers.CharField(
        required=True
    )

class HRLeaveRequestSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        source='employee.name',
        read_only=True
    )

    department = serializers.CharField(
        source='employee.department.name',
        read_only=True
    )

    leave_type = serializers.CharField(
        source='leave_type.name',
        read_only=True
    )

    approved_by = serializers.CharField(
        source='approved_by.name',
        read_only=True
    )

    class Meta:

        model = LeaveRequest

        fields = [
            'id',
            'employee_name',
            'department',
            'leave_type',
            'start_date',
            'end_date',
            'total_days',
            'status',
            'approved_by',
            'rejection_reason',
            'created_at'
        ]

class HRLeaveBalanceSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        source='employee.name',
        read_only=True
    )

    department = serializers.CharField(
        source='employee.department.name',
        read_only=True
    )

    leave_type = serializers.CharField(
        source='leave_type.name',
        read_only=True
    )

    remaining_days = serializers.DecimalField(
        max_digits=5,
        decimal_places=1,
        read_only=True
    )

    class Meta:

        model = LeaveBalance

        fields = [
            'id',
            'employee_name',
            'department',
            'leave_type',
            'total_days',
            'used_days',
            'remaining_days'
        ]            