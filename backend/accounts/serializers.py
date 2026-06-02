from rest_framework import serializers
from .models import User


class LoginSerializer(serializers.Serializer):

    username = serializers.CharField()

    password = serializers.CharField(
        write_only=True
    )


class ProfileSerializer(serializers.ModelSerializer):

    department = serializers.CharField(
        source='department.name',
        read_only=True
    )

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'name',
            'email',
            'role',
            'department',
            'joining_date'
        ]