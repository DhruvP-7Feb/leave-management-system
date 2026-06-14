from rest_framework import serializers
from .models import User


class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True
    )


class ProfileSerializer(serializers.ModelSerializer):

    department = serializers.CharField(
        source='department.name',
        read_only=True,
        default=None
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

    role = serializers.ChoiceField(
        choices=[
            ('employee', 'Employee'),
            ('manager', 'Manager'),
        ],
        default='employee'
    )

    class Meta:

        model = User

        fields = [
            'username',
            'password',
            'email',
            'name',
            'role',
            'department',
            'joining_date'
        ]

    def create(self, validated_data):

        kwargs = {
            'username': validated_data['username'],
            'password': validated_data['password'],
            'email': validated_data['email'],
            'name': validated_data['name'],
            'role': validated_data.get('role', 'employee'),
            'department': validated_data.get('department'),
        }

        if validated_data.get('joining_date'):
            kwargs['joining_date'] = validated_data['joining_date']

        return User.objects.create_user(**kwargs)


class EmployeeListSerializer(serializers.ModelSerializer):

    department = serializers.CharField(
        source='department.name',
        read_only=True,
        default=None
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
            'joining_date',
            'is_active',
        ]