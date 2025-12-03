from rest_framework import serializers
from .models import Project,Task,BOM

class TaskSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Task
        fields = "__all__"

class BOMSerializer(serializers.ModelSerializer):
    # Mark project as read-only: client doesn't need to send it
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = BOM
        fields= "__all__"

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True,read_only=True)
    bom_items = BOMSerializer(many=True,read_only=True)
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Project
        fields ="__all__"

