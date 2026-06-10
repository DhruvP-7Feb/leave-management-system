from django.db import models

# Create your models here.
from accounts.models import User


class LeaveType(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    annual_quota = models.PositiveIntegerField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):

    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='leave_balances'
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='balances'
    )

    total_days = models.DecimalField(
        max_digits=5,
        decimal_places=1
    )

    used_days = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    @property
    def remaining_days(self):
        return self.total_days - self.used_days

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leave_type'],
                name='unique_employee_leave_type'
            )
        ]

    def __str__(self):
        return f"{self.employee.name} - {self.leave_type.name}"
    
class LeaveRequest(models.Model):

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )

    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )

    start_date = models.DateField()

    end_date = models.DateField()

    reason = models.TextField()

    is_half_day = models.BooleanField(
        default=False
    )

    proxy_employee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handover_requests'
    )

    total_days = models.DecimalField(
        max_digits=4,
        decimal_places=1
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_leave_requests'
    )

    rejection_reason = models.TextField(
        blank=True
    )

    actioned_at = models.DateTimeField(
        null=True,
        blank=True
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"#{self.id} | "
            f"{self.employee.name} | "
            f"{self.leave_type.name} | "
            f"{self.status}"
        )    
    
class PublicHoliday(models.Model):

    name = models.CharField(
        max_length=100
    )

    date = models.DateField(
        unique=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.name} - {self.date}"    