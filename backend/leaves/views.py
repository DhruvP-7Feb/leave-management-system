from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import LeaveBalance
from .serializers import LeaveBalanceSerializer

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
