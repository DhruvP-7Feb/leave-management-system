from django.urls import path

from .views import (
    DepartmentListCreateView,
    AssignManagerView,
)

urlpatterns = [

    path(
        '',
        DepartmentListCreateView.as_view(),
        name='department-list-create'
    ),

    path(
        '<int:department_id>/assign-manager/',
        AssignManagerView.as_view(),
        name='assign-manager'
    ),

]