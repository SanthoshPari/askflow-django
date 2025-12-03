from django.urls import path
from . import views
from .views import home,project_tasks,ProjectDetail,ProjectViewSet,TaskViewSet,ProjectOverview,ProjectBOMList,BOMItemDetail,BOMImportView,BOMExportView,LoginView,LogoutView,CurrenUserView
from rest_framework.routers import DefaultRouter

app_name = "core"

router = DefaultRouter()
router.register(r"api/ver3/projects",ProjectViewSet
                ,basename="project")
router.register(r"api/ver3/tasks",TaskViewSet
                ,basename="task")
urlpatterns = [
    path('',views.home,name="home"),
    path("api/projects/<int:project_id>/tasks/",
         views.project_tasks,name="project_tasks",
         ),
    path("api/ver2/projects/<int:project_id>/",
         views.ProjectDetail.as_view(),
        name="project-detail",
         ),    
    path("api/ver2/projects/",
         views.ProjectList.as_view(),name="project-list"),
    
    path("api/ver2/tasks/",views.TaskList.as_view(),
         name = "task-list"),
    path("api/ver2/tasks/<int:task_id>/",
         views.TaskDetail.as_view(),
         name="task-detail"),
    path("api/ver2/projects/<int:project_id>/overview/",
         views.ProjectOverview.as_view(),name="project-overview"),
    path("api/ver2/projects/<int:project_id>/bom/",views.ProjectBOMList.as_view(),name="project-bom"),
    path("api/ver2/bom/<int:item_id>/",views.BOMItemDetail.as_view(),
         name="bom-detail"),
    path("api/ver2/projects/<int:project_id>/bom/export/",views.BOMExportView.as_view(),
              name = "project-bom-export"),
    path("api/ver2/projects/<int:project_id>/bom/import/",
         views.BOMImportView.as_view(),
         name="project-bom-import"),
         # BOM detail – keep as is
    path(
    "api/ver2/bom/<int:item_id>/",
    views.BOMItemDetail.as_view(),
    name="bom-detail",
        ),
    # Auth endpoint
    path("api/auth/login/",views.LoginView.as_view(),
         name = "api-login"),
    path("api/auth/logout/",views.LogoutView.as_view(),
         name = "api=logout"),
    path("api/auth/me/",views.CurrenUserView.as_view(),
         name="api-me")
]

urlpatterns += router.urls