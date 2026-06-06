from django.contrib import admin

# Register your models here.python manage.py runserver
from .models import LeaveType, LeaveBalance


admin.site.register(LeaveType)
admin.site.register(LeaveBalance)