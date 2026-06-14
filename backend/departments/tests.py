from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from .models import Department


class DepartmentTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            username='hradmin',
            email='hr@example.com',
            password='testpass123',
            name='HR Admin',
            role='hr_admin',
        )
        self.manager = User.objects.create_user(
            username='mgr',
            email='mgr@example.com',
            password='testpass123',
            name='Manager One',
            role='manager',
        )
        self.employee = User.objects.create_user(
            username='emp',
            email='emp@example.com',
            password='testpass123',
            name='Employee One',
            role='employee',
        )
        self.dept = Department.objects.create(name='Engineering')

    def test_hr_can_list_departments(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/departments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_hr_can_create_department(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/departments/', {
            'name': 'Marketing'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Department.objects.count(), 2)

    def test_hr_can_assign_manager(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(
            f'/api/departments/{self.dept.id}/assign-manager/',
            {'manager': self.manager.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dept.refresh_from_db()
        self.assertEqual(self.dept.manager, self.manager)

    def test_cannot_assign_employee_as_manager(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(
            f'/api/departments/{self.dept.id}/assign-manager/',
            {'manager': self.employee.id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_cannot_create_department(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/departments/', {
            'name': 'Sales'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_department_name(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/departments/', {
            'name': 'Engineering'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
