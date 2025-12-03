from django.db import models
from django.conf import settings

# Create your models here.
class Project(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name = "projects",
    )
    name = models.CharField(max_length=200,unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"] # newest first

    def __str__(self):
        return self.name
class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "TODO","To Do"
        IN_PROGRESS = "INPR","In Progress"
        DONE = "DONE","Done"
        BLOCKED = "BLKD","Blocked"
    class Priority(models.TextChoices):
        LOW = "LOW","Low"
        MEDIUM="MED","Medium"
        HIGH= "HIGH","High"

    project = models.ForeignKey(Project,
                on_delete=models.CASCADE,related_name="tasks")
    title = models.CharField(max_length=200)
    priority = models.CharField(
        max_length=4,choices=Priority.choices,
        default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=4,choices=Status.choices,
        default=Status.TODO
    )
    due_date = models.DateField(null=True,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
    def __str__(self):
        return f"{self.title}[{self.get_status_display()}]"
class BOM(models.Model):
    # Link BOM to Project (1 Project = Many BOMs)
    project = models.ForeignKey(Project,on_delete=models.CASCADE,related_name="bom_items")
    """
    One row in the Bill Of Materials for a Project.
    Example columns: Category | Model | Description | Qty | Param1 | Param2 | Price
    """
    category = models.CharField(max_length=200)
    model = models.CharField(max_length=199)
    description = models.TextField(blank=True)
    qty = models.PositiveIntegerField(default=1)
    param1 = models.CharField(max_length=100, blank=True)
    param2 = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=13,decimal_places=3,null=True,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["category","model"]
    def __str__(self):
        return f"{self.category} - {self.model} (x{self.qty})"

    

