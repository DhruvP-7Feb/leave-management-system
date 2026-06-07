from rest_framework import serializers
from .models import LeaveBalance


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