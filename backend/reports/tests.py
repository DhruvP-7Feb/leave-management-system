from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from departments.models import Department
from leaves.models import (
    LeaveType,
    LeaveBalance,
    LeaveRequest,
)


class HRDashboardTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )
        self.emp = User.objects.create_user(
            username='emp', email='emp@test.com',
            password='pass123', name='Employee', role='employee'
        )

    def test_hr_can_access_dashboard(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_leaves_this_month', response.data)
        self.assertIn('pending_approvals', response.data)
        self.assertIn('upcoming_leaves_this_week', response.data)

    def test_employee_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.emp)
        response = self.client.get('/api/reports/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HRLeaveReportTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )
        self.emp = User.objects.create_user(
            username='emp', email='emp@test.com',
            password='pass123', name='Employee', role='employee',
            department=self.dept
        )
        self.leave_type = LeaveType.objects.create(
            name='Casual Leave', annual_quota=12
        )

        start = date.today() + timedelta(days=30)
        LeaveRequest.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test',
            total_days=1,
            status='pending',
        )

    def test_hr_can_view_leave_report(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/reports/leaves/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(
            '/api/reports/leaves/?status=pending'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        response = self.client.get(
            '/api/reports/leaves/?status=approved'
        )
        self.assertEqual(len(response.data), 0)

    def test_filter_by_employee(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get(
            '/api/reports/leaves/?employee=Employee'
        )
        self.assertEqual(len(response.data), 1)

        response = self.client.get(
            '/api/reports/leaves/?employee=Nobody'
        )
        self.assertEqual(len(response.data), 0)


class HRBalanceReportTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )
        self.dept = Department.objects.create(name='Engineering')
        self.emp = User.objects.create_user(
            username='emp', email='emp@test.com',
            password='pass123', name='Employee', role='employee',
            department=self.dept
        )
        self.leave_type = LeaveType.objects.create(
            name='Casual Leave', annual_quota=12
        )
        LeaveBalance.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            total_days=12,
            used_days=3,
        )

    def test_hr_can_view_balances(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/reports/balances/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]['employee_name'],
            'Employee'
        )


class CSVExportTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )
        self.dept = Department.objects.create(name='Engineering')
        self.emp = User.objects.create_user(
            username='emp', email='emp@test.com',
            password='pass123', name='Employee', role='employee',
            department=self.dept
        )
        # Employee with NO department (null-safety test #6)
        self.emp_no_dept = User.objects.create_user(
            username='emp2', email='emp2@test.com',
            password='pass123', name='NoDeptEmp', role='employee',
        )
        self.leave_type = LeaveType.objects.create(
            name='Casual Leave', annual_quota=12
        )

        start = date.today() + timedelta(days=30)
        LeaveRequest.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test',
            total_days=1,
        )
        LeaveRequest.objects.create(
            employee=self.emp_no_dept,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='No dept test',
            total_days=1,
        )

    def test_csv_export_works(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/reports/leaves/export-csv/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')

    def test_csv_does_not_crash_on_null_department(self):
        """#6: Should not crash when employee has no department."""
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/reports/leaves/export-csv/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8')
        self.assertIn('NoDeptEmp', content)
