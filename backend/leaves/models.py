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

    total_days = models.PositiveIntegerField()

    used_days = models.PositiveIntegerField(
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