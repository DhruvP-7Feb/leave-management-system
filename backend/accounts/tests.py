from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from .models import User
from departments.models import Department
from leaves.models import LeaveType, LeaveBalance


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


class GoogleOAuthTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.existing_user = User.objects.create_user(
            username='existing',
            email='existing@example.com',
            password='testpass123',
            name='Existing User',
            role='manager',
            department=self.dept,
        )
        self.leave_type = LeaveType.objects.create(
            name='Annual Leave',
            annual_quota=20,
            is_active=True
        )

    def test_google_login_missing_token(self):
        response = self.client.post('/api/accounts/google/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_invalid_token(self, mock_verify):
        mock_verify.side_effect = ValueError("Token signature is invalid")
        response = self.client.post('/api/accounts/google/', {'credential': 'fake-invalid-token'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid Google token', response.data['error'])

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_unverified_email(self, mock_verify):
        mock_verify.return_value = {
            'email': 'unverified@example.com',
            'email_verified': False,
            'name': 'Unverified User'
        }
        response = self.client.post('/api/accounts/google/', {'credential': 'valid-token-unverified'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not verified', response.data['error'])

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_existing_user_success(self, mock_verify):
        mock_verify.return_value = {
            'email': 'existing@example.com',
            'email_verified': True,
            'name': 'Existing User'
        }
        response = self.client.post('/api/accounts/google/', {'credential': 'valid-google-token'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'manager')
        self.assertEqual(response.data['name'], 'Existing User')
        self.assertEqual(response.data['email'], 'existing@example.com')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_deactivated_user(self, mock_verify):
        self.existing_user.is_active = False
        self.existing_user.save()
        mock_verify.return_value = {
            'email': 'existing@example.com',
            'email_verified': True,
            'name': 'Existing User'
        }
        response = self.client.post('/api/accounts/google/', {'credential': 'valid-google-token'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('deactivated', response.data['error'])

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_new_user_auto_provision_and_seed_balances(self, mock_verify):
        mock_verify.return_value = {
            'email': 'newemployee@company.com',
            'email_verified': True,
            'name': 'New Employee'
        }
        response = self.client.post('/api/accounts/google/', {'credential': 'valid-new-token'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'employee')
        self.assertEqual(response.data['name'], 'New Employee')

        # Check DB was populated
        created_user = User.objects.get(email='newemployee@company.com')
        self.assertEqual(created_user.role, 'employee')
        self.assertTrue(created_user.is_active)

        # Check leave balance was seeded
        balances = LeaveBalance.objects.filter(employee=created_user)
        self.assertEqual(balances.count(), 1)
        self.assertGreater(balances.first().total_days, 0)
