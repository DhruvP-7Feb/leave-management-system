from rest_framework import serializers

from accounts.models import User


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