from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from departments.models import Department


class LoginTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Engineering')
        self.user = User.objects.create_user(
            username='john',
            email='john@example.com',
            password='testpass123',
            name='John Doe',
            role='employee',
            department=self.department,
        )

    def test_login_with_email_success(self):
        response = self.client.post('/api/accounts/login/', {
            'email': 'john@example.com',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'employee')

    def test_login_with_wrong_password(self):
        response = self.client.post('/api/accounts/login/', {
            'email': 'john@example.com',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_nonexistent_email(self):
        response = self.client.post('/api/accounts/login/', {
            'email': 'nonexistent@example.com',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_deactivated_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/accounts/login/', {
            'email': 'john@example.com',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='john',
            email='john@example.com',
            password='testpass123',
            name='John Doe',
            role='employee',
        )
        response = self.client.post('/api/accounts/login/', {
            'email': 'john@example.com',
            'password': 'testpass123',
        })
        self.access = response.data['access']
        self.refresh = response.data['refresh']

    def test_logout_success(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.access}'
        )
        response = self.client.post('/api/accounts/logout/', {
            'refresh': self.refresh
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_without_token(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.access}'
        )
        response = self.client.post('/api/accounts/logout/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.user = User.objects.create_user(
            username='john',
            email='john@example.com',
            password='testpass123',
            name='John Doe',
            role='employee',
            department=self.dept,
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'John Doe')
        self.assertEqual(response.data['department'], 'Engineering')

    def test_profile_requires_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EmployeeManagementTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.hr = User.objects.create_user(
            username='hradmin',
            email='hr@example.com',
            password='testpass123',
            name='HR Admin',
            role='hr_admin',
        )
        self.employee = User.objects.create_user(
            username='emp1',
            email='emp1@example.com',
            password='testpass123',
            name='Employee One',
            role='employee',
        )

    def test_hr_can_list_employees(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/accounts/employees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_employee_cannot_list_employees(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/accounts/employees/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_create_employee(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/accounts/employees/create/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass123',
            'name': 'New Employee',
            'role': 'employee',
            'department': self.dept.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_hr_can_create_manager(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/accounts/employees/create/', {
            'username': 'mgr1',
            'email': 'mgr@example.com',
            'password': 'mgrpass123',
            'name': 'Manager One',
            'role': 'manager',
            'department': self.dept.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='mgr@example.com')
        self.assertEqual(user.role, 'manager')

    def test_hr_can_deactivate_employee(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(
            f'/api/accounts/employees/{self.employee.id}/deactivate/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

    def test_hr_can_reactivate_employee(self):
        self.employee.is_active = False
        self.employee.save()
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(
            f'/api/accounts/employees/{self.employee.id}/reactivate/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertTrue(self.employee.is_active)


class PermissionTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.employee = User.objects.create_user(
            username='emp',
            email='emp@example.com',
            password='pass123',
            name='Employee',
            role='employee',
        )
        self.manager = User.objects.create_user(
            username='mgr',
            email='mgr@example.com',
            password='pass123',
            name='Manager',
            role='manager',
        )

    def test_employee_cannot_create_employee(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/accounts/employees/create/', {
            'username': 'x',
            'email': 'x@example.com',
            'password': 'pass',
            'name': 'X',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_cannot_create_employee(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.post('/api/accounts/employees/create/', {
            'username': 'x',
            'email': 'x@example.com',
            'password': 'pass',
            'name': 'X',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
