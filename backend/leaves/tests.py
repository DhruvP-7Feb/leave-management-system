from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from departments.models import Department
from .models import (
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    DelegateApprover,
)
from .utils import calculate_working_days


class WorkingDayCalculationTests(TestCase):

    def test_full_week(self):
        """Mon-Fri should be 5 working days."""
        # Find next Monday
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        monday = today + timedelta(days=days_until_monday)
        friday = monday + timedelta(days=4)
        self.assertEqual(calculate_working_days(monday, friday), 5)

    def test_weekend_excluded(self):
        """Sat-Sun should be 0 working days."""
        today = date.today()
        days_until_saturday = (5 - today.weekday()) % 7
        saturday = today + timedelta(days=days_until_saturday)
        sunday = saturday + timedelta(days=1)
        self.assertEqual(calculate_working_days(saturday, sunday), 0)

    def test_public_holiday_excluded(self):
        """A public holiday on a weekday should not be counted."""
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        monday = today + timedelta(days=days_until_monday)
        PublicHoliday.objects.create(
            name='Test Holiday',
            date=monday
        )
        tuesday = monday + timedelta(days=1)
        self.assertEqual(calculate_working_days(monday, tuesday), 1)


class LeaveTypeTests(TestCase):

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

    def test_hr_can_create_leave_type(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/leaves/leave-types/', {
            'name': 'Sick Leave',
            'annual_quota': 10,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LeaveType.objects.count(), 1)

    def test_any_user_can_list_leave_types(self):
        LeaveType.objects.create(name='Casual', annual_quota=12)
        self.client.force_authenticate(user=self.emp)
        response = self.client.get('/api/leaves/leave-types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_employee_cannot_create_leave_type(self):
        self.client.force_authenticate(user=self.emp)
        response = self.client.post('/api/leaves/leave-types/', {
            'name': 'Hack Leave',
            'annual_quota': 99,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_auto_balance_creation_on_new_leave_type(self):
        """#27: Creating a leave type should auto-create balances for existing employees."""
        self.client.force_authenticate(user=self.hr)
        self.client.post('/api/leaves/leave-types/', {
            'name': 'Sick Leave',
            'annual_quota': 12,
        })
        balance = LeaveBalance.objects.filter(
            employee=self.emp
        )
        self.assertEqual(balance.count(), 1)
        self.assertGreater(balance.first().total_days, 0)


class PublicHolidayTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )

    def test_hr_can_create_holiday(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post('/api/leaves/holidays/', {
            'name': 'Independence Day',
            'date': '2026-08-15',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        holiday = PublicHoliday.objects.first()
        self.assertEqual(holiday.year, 2026)

    def test_hr_can_delete_holiday(self):
        holiday = PublicHoliday.objects.create(
            name='Test', date=date(2026, 1, 1)
        )
        self.client.force_authenticate(user=self.hr)
        response = self.client.delete(
            f'/api/leaves/holidays/{holiday.id}/delete/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PublicHoliday.objects.count(), 0)


class ApplyLeaveTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.mgr = User.objects.create_user(
            username='mgr', email='mgr@test.com',
            password='pass123', name='Manager', role='manager',
            department=self.dept
        )
        self.dept.manager = self.mgr
        self.dept.save()

        self.emp = User.objects.create_user(
            username='emp', email='emp@test.com',
            password='pass123', name='Employee', role='employee',
            department=self.dept
        )
        self.proxy = User.objects.create_user(
            username='proxy', email='proxy@test.com',
            password='pass123', name='Proxy', role='employee',
            department=self.dept
        )
        self.leave_type = LeaveType.objects.create(
            name='Casual Leave', annual_quota=12
        )
        LeaveBalance.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            total_days=12
        )

    def _future_weekday(self, days_ahead=14):
        """Get a future date that's a weekday."""
        d = date.today() + timedelta(days=days_ahead)
        while d.weekday() >= 5:
            d += timedelta(days=1)
        return d

    def test_apply_leave_success(self):
        self.client.force_authenticate(user=self.emp)
        start = self._future_weekday()
        response = self.client.post('/api/leaves/apply/', {
            'leave_type': self.leave_type.id,
            'start_date': str(start),
            'end_date': str(start),
            'reason': 'Personal work',
            'is_half_day': False,
            'proxy_employee': self.proxy.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')

    def test_cannot_apply_past_date(self):
        self.client.force_authenticate(user=self.emp)
        past = date.today() - timedelta(days=5)
        response = self.client.post('/api/leaves/apply/', {
            'leave_type': self.leave_type.id,
            'start_date': str(past),
            'end_date': str(past),
            'reason': 'Test',
            'proxy_employee': self.proxy.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_balance(self):
        self.client.force_authenticate(user=self.emp)
        balance = LeaveBalance.objects.get(
            employee=self.emp,
            leave_type=self.leave_type
        )
        balance.used_days = 12
        balance.save()

        start = self._future_weekday()
        response = self.client.post('/api/leaves/apply/', {
            'leave_type': self.leave_type.id,
            'start_date': str(start),
            'end_date': str(start),
            'reason': 'Test',
            'proxy_employee': self.proxy.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('balance', response.data['error'].lower())


class ApprovalTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.hr = User.objects.create_user(
            username='hr', email='hr@test.com',
            password='pass123', name='HR', role='hr_admin'
        )
        self.mgr = User.objects.create_user(
            username='mgr', email='mgr@test.com',
            password='pass123', name='Manager', role='manager',
            department=self.dept
        )
        self.dept.manager = self.mgr
        self.dept.save()

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
            total_days=12
        )
        LeaveBalance.objects.create(
            employee=self.mgr,
            leave_type=self.leave_type,
            total_days=12
        )

        start = date.today() + timedelta(days=30)
        while start.weekday() >= 5:
            start += timedelta(days=1)

        self.emp_leave = LeaveRequest.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test leave',
            total_days=1,
        )

        self.mgr_leave = LeaveRequest.objects.create(
            employee=self.mgr,
            leave_type=self.leave_type,
            start_date=start + timedelta(days=7),
            end_date=start + timedelta(days=7),
            reason='Manager leave',
            total_days=1,
        )

    def test_manager_can_approve_team_leave(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post(
            f'/api/leaves/{self.emp_leave.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.emp_leave.refresh_from_db()
        self.assertEqual(self.emp_leave.status, 'approved')

    def test_manager_cannot_approve_own_leave(self):
        """#1: Manager cannot approve their own leave."""
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post(
            f'/api/leaves/{self.mgr_leave.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_approve_manager_leave(self):
        """Manager leave goes to HR Admin."""
        self.client.force_authenticate(user=self.hr)
        response = self.client.post(
            f'/api/leaves/{self.mgr_leave.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reject_requires_reason(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post(
            f'/api/leaves/{self.emp_leave.id}/reject/',
            {}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_with_reason(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post(
            f'/api/leaves/{self.emp_leave.id}/reject/',
            {'rejection_reason': 'Project deadline'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.emp_leave.refresh_from_db()
        self.assertEqual(self.emp_leave.status, 'rejected')
        self.assertEqual(
            self.emp_leave.rejection_reason,
            'Project deadline'
        )

    def test_employee_sees_rejection_reason(self):
        """#13: rejection_reason must appear in my-leaves."""
        self.emp_leave.status = 'rejected'
        self.emp_leave.rejection_reason = 'Not enough coverage'
        self.emp_leave.save()

        self.client.force_authenticate(user=self.emp)
        response = self.client.get('/api/leaves/my-leaves/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leave_data = response.data[0]
        self.assertIn('rejection_reason', leave_data)
        self.assertEqual(
            leave_data['rejection_reason'],
            'Not enough coverage'
        )

    def test_balance_deducted_on_approval(self):
        self.client.force_authenticate(user=self.mgr)
        self.client.post(
            f'/api/leaves/{self.emp_leave.id}/approve/'
        )
        balance = LeaveBalance.objects.get(
            employee=self.emp,
            leave_type=self.leave_type
        )
        self.assertEqual(balance.used_days, Decimal('1.0'))

    def test_balance_restored_on_cancellation(self):
        # Approve first
        self.emp_leave.status = 'approved'
        self.emp_leave.save()
        balance = LeaveBalance.objects.get(
            employee=self.emp,
            leave_type=self.leave_type
        )
        balance.used_days = Decimal('1.0')
        balance.save()

        self.client.force_authenticate(user=self.emp)
        response = self.client.post(
            f'/api/leaves/{self.emp_leave.id}/cancel/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        balance.refresh_from_db()
        self.assertEqual(balance.used_days, Decimal('0.0'))


class DelegateTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Engineering')
        self.mgr = User.objects.create_user(
            username='mgr', email='mgr@test.com',
            password='pass123', name='Manager', role='manager',
            department=self.dept
        )
        self.dept.manager = self.mgr
        self.dept.save()

        self.delegate_mgr = User.objects.create_user(
            username='delegate', email='delegate@test.com',
            password='pass123', name='Delegate Mgr', role='manager',
        )
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
            total_days=12
        )

    def test_manager_can_create_delegation(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post('/api/leaves/delegate/', {
            'manager': self.mgr.id,
            'delegate': self.delegate_mgr.id,
            'start_date': str(date.today()),
            'end_date': str(date.today() + timedelta(days=7)),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delegate_can_approve(self):
        """#12: Delegate should be able to approve on behalf of manager."""
        today = date.today()
        DelegateApprover.objects.create(
            manager=self.mgr,
            delegate=self.delegate_mgr,
            start_date=today,
            end_date=today + timedelta(days=30),
            is_active=True,
        )

        start = today + timedelta(days=14)
        while start.weekday() >= 5:
            start += timedelta(days=1)

        leave = LeaveRequest.objects.create(
            employee=self.emp,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test',
            total_days=1,
        )

        self.client.force_authenticate(user=self.delegate_mgr)
        response = self.client.post(
            f'/api/leaves/{leave.id}/approve/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ManagerPendingViewTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.dept_a = Department.objects.create(name='Dept A')
        self.dept_b = Department.objects.create(name='Dept B')

        self.mgr_a = User.objects.create_user(
            username='mgra', email='mgra@test.com',
            password='pass123', name='Manager A', role='manager',
            department=self.dept_a
        )
        self.dept_a.manager = self.mgr_a
        self.dept_a.save()

        self.emp_a = User.objects.create_user(
            username='empa', email='empa@test.com',
            password='pass123', name='Emp A', role='employee',
            department=self.dept_a
        )
        self.emp_b = User.objects.create_user(
            username='empb', email='empb@test.com',
            password='pass123', name='Emp B', role='employee',
            department=self.dept_b
        )

        self.leave_type = LeaveType.objects.create(
            name='Casual', annual_quota=12
        )

        start = date.today() + timedelta(days=30)

        LeaveRequest.objects.create(
            employee=self.emp_a,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test A',
            total_days=1,
        )
        LeaveRequest.objects.create(
            employee=self.emp_b,
            leave_type=self.leave_type,
            start_date=start,
            end_date=start,
            reason='Test B',
            total_days=1,
        )

    def test_manager_only_sees_own_team(self):
        """#2: Manager should only see requests from their managed department."""
        self.client.force_authenticate(user=self.mgr_a)
        response = self.client.get('/api/leaves/pending-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see Dept A employee's request
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['employee_name'], 'Emp A')
