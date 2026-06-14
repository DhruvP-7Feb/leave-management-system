from rest_framework import serializers

from accounts.models import User
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):

    manager_name = serializers.CharField(
        source='manager.name',
        read_only=True,
        default=None
    )

    class Meta:
        model = Department

        fields = [
            'id',
            'name',
            'manager',
            'manager_name',
            'created_at',
        ]

        read_only_fields = ['created_at']


class AssignManagerSerializer(
    serializers.Serializer
):

    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all()
    )

    def validate_manager(
        self,
        value
    ):

        if value.role != 'manager':

            raise serializers.ValidationError(
                'Selected user is not a manager.'
            )

        return value