from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsHRAdmin

from .models import Department
from .serializers import AssignManagerSerializer


class AssignManagerView(APIView):

    permission_classes = [IsHRAdmin]

    def patch(
        self,
        request,
        department_id
    ):

        try:

            department = Department.objects.get(
                id=department_id
            )

        except Department.DoesNotExist:

            return Response(
                {
                    "error": "Department not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if department.manager:

            return Response(
                {
                    "error": (
                        "Department already has "
                        "a manager assigned."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AssignManagerSerializer(
            data=request.data
        )

        if serializer.is_valid():

            manager = serializer.validated_data[
                'manager'
            ]

            department.manager = manager

            department.save()

            return Response(
                {
                    "message":
                    "Manager assigned successfully",

                    "department":
                    department.name,

                    "manager":
                    manager.name
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )