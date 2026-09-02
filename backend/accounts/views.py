from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from rest_framework.permissions import IsAuthenticated, AllowAny

from .serializers import (
    LoginSerializer,
    ProfileSerializer,
    EmployeeCreateSerializer,
    EmployeeListSerializer,
)

from .permissions import IsHRAdmin
from .models import User
from leaves.models import LeaveType, LeaveBalance
import math
from django.conf import settings
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests


class LoginView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']

        password = serializer.validated_data['password']

        user = authenticate(
            request,
            email=email,
            password=password
        )

        if user is None:

            return Response(
                {
                    "error": "Invalid email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:

            return Response(
                {
                    "error": "This account has been deactivated."
                },
                status=status.HTTP_403_FORBIDDEN
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


class GoogleLoginView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        token = request.data.get('credential') or request.data.get('id_token')

        if not token:
            return Response(
                {
                    "error": "Google ID token (credential) is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')

        try:
            id_info = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=client_id if client_id else None
            )
        except Exception as e:
            return Response(
                {
                    "error": f"Invalid Google token: {str(e)}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email = id_info.get('email')
        if not email:
            return Response(
                {
                    "error": "Email not found in Google token."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email_verified = id_info.get('email_verified', False)
        if not email_verified:
            return Response(
                {
                    "error": "Google email address is not verified."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        name = id_info.get('name') or id_info.get('given_name') or email.split('@')[0]

        user = User.objects.filter(email=email).first()

        if user:
            if not user.is_active:
                return Response(
                    {
                        "error": "This account has been deactivated."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update name if user didn't have one set
            if not user.name and name:
                user.name = name
                user.save(update_fields=['name'])
        else:
            # Auto-provision employee account
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                name=name,
                role='employee'
            )
            user.set_unusable_password()
            user.save()

            # Seed prorated leave balances for all active leave types
            joining_month = user.joining_date.month
            remaining_months = 12 - joining_month + 1
            active_leave_types = LeaveType.objects.filter(is_active=True)

            for leave_type in active_leave_types:
                prorated_days = math.ceil(
                    leave_type.annual_quota * remaining_months / 12
                )
                LeaveBalance.objects.create(
                    employee=user,
                    leave_type=leave_type,
                    total_days=prorated_days
                )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": user.role,
                "name": user.name,
                "email": user.email
            },
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        try:

            refresh_token = request.data.get('refresh')

            if not refresh_token:
                return Response(
                    {
                        'error': 'Refresh token is required.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {
                    'message': 'Logged out successfully.'
                },
                status=status.HTTP_200_OK
            )

        except TokenError:

            return Response(
                {
                    'error': 'Invalid or expired token.'
                },
                status=status.HTTP_400_BAD_REQUEST
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



class PublicEmployeeListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = User.objects.filter(is_active=True).order_by('name')
        data = [{'id': emp.id, 'name': emp.name, 'email': emp.email} for emp in employees]
        return Response(data, status=status.HTTP_200_OK)


class EmployeeListView(APIView):

    permission_classes = [IsHRAdmin]

    def get(self, request):

        employees = User.objects.select_related(
            'department'
        ).all().order_by('id')

        serializer = EmployeeListSerializer(
            employees,
            many=True
        )

        return Response(
            serializer.data,
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

            leave_types = LeaveType.objects.filter(
                is_active=True
            )
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