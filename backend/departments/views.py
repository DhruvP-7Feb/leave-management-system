from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsHRAdmin

from .models import Department
from .serializers import (
    DepartmentSerializer,
    AssignManagerSerializer,
)


class DepartmentListCreateView(APIView):

    permission_classes = [IsHRAdmin]

    def get(self, request):

        departments = Department.objects.select_related(
            'manager'
        ).all().order_by('id')

        serializer = DepartmentSerializer(
            departments,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self, request):

        serializer = DepartmentSerializer(
            data=request.data
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


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