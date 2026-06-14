from rest_framework.permissions import BasePermission


class IsHRAdmin(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        return (
            request.user.is_authenticated
            and request.user.role == 'hr_admin'
        )


class IsManager(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        return (
            request.user.is_authenticated
            and request.user.role == 'manager'
        )


class IsManagerOrHRAdmin(BasePermission):

    def has_permission(
        self,
        request,
        view
    ):

        return (
            request.user.is_authenticated
            and request.user.role in ['manager', 'hr_admin']
        )