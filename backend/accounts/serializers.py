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

class EmployeeCreateSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True
    )

    class Meta:

        model = User

        fields = [
            'username',
            'password',
            'email',
            'name',
            'department',
            'joining_date'
        ]

    def create(self, validated_data):

        return User.objects.create_user(
        username=validated_data['username'],
        password=validated_data['password'],
        email=validated_data['email'],
        name=validated_data['name'],
        role='employee',
        department=validated_data.get('department')
    )        