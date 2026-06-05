from django.contrib import admin

# Register your models here.
from .models import LeaveType, LeaveBalance


admin.site.register(LeaveType)
admin.site.register(LeaveBalance)