from django.contrib import admin
from .models import Project,Task,BOM
# Register your models here.

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id","name","created_at")
    search_fields= ("name",)
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id","title",
                    "project","status","due_date",
                    "created_at")
    list_filter = ("status","project")
    search_fields = ("project",)

@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ("project", "category", "model", "qty", "price", "created_at")
    list_filter = ("project", "category")
    search_fields = ("model", "description")

