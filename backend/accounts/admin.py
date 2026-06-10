from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        'id',
        'username',
        'name',
        'email',
        'role',
        'department'
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            'Additional Information',
            {
                'fields': (
                    'name',
                    'role',
                    'department',
                    'joining_date',
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'Additional Information',
            {
                'fields': (
                    'name',
                    'email',
                    'role',
                    'department',
                    'joining_date',
                )
            },
        ),
    )
