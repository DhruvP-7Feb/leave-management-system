from django.shortcuts import render
from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.permissions import IsAuthenticated

from .serializers import (
    LoginSerializer,
    ProfileSerializer,
    EmployeeCreateSerializer
)

from .permissions import IsHRAdmin
from .models import User
from leaves.models import LeaveType, LeaveBalance
import math
# Create your views here.
class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        username = serializer.validated_data['username']

        password = serializer.validated_data['password']

        user = authenticate(
            username=username,
            password=password
        )

        if user is None:

            return Response(
                {
                    "error": "Invalid username or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": user.role,
                "name": user.name
            },
            status=status.HTTP_200_OK
        )
    
class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        serializer = ProfileSerializer(
            request.user
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

class HRDashboardView(APIView):

    permission_classes = [IsHRAdmin]

    def get(self, request):

        return Response(
            {
                'message': 'Welcome HR Admin'
            },
            status=status.HTTP_200_OK
        )

class EmployeeCreateView(APIView):

    permission_classes = [IsHRAdmin]

    def post(self, request):

        serializer = EmployeeCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():

            employee = serializer.save()
            joining_month = employee.joining_date.month

            remaining_months = 12 - joining_month + 1

            leave_types = LeaveType.objects.all()
            for leave_type in leave_types:

                prorated_days = math.ceil(
                    leave_type.annual_quota * remaining_months / 12
                )

                LeaveBalance.objects.create(
                    employee=employee,
                    leave_type=leave_type,
                    total_days=prorated_days
                )
            return Response(
                {
                    'message': 'Employee created successfully'
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )    
    
class DeactivateEmployeeView(APIView):

    permission_classes = [IsHRAdmin]

    def patch(self, request, user_id):

        try:

            user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    'error': 'User not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        user.is_active = False

        user.save()

        return Response(
            {
                'message': 'Employee deactivated successfully'
            },
            status=status.HTTP_200_OK
        )    
    
class ReactivateEmployeeView(APIView):

    permission_classes = [IsHRAdmin]

    def patch(self, request, user_id):

        try:

            user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    'error': 'User not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if user.is_active:

            return Response(
                {
                    'error': 'Employee is already active'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = True

        user.save()

        return Response(
            {
                'message': 'Employee reactivated successfully'
            },
            status=status.HTTP_200_OK
        )    