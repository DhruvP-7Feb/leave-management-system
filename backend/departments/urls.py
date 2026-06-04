from django.urls import path

from .views import AssignManagerView

urlpatterns = [

    path(
        '<int:department_id>/assign-manager/',
        AssignManagerView.as_view(),
        name='assign-manager'
    ),

]