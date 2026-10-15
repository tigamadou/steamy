# apps/learning/models.py
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class Enrollment(models.Model):
    STATUS_CHOICES = (
        ("active", "Actif"),
        ("completed", "Terminé"),
        ("cancelled", "Annulé"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(
        "catalog.Course", on_delete=models.CASCADE, related_name="enrollments"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    progress = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )  # pourcentage 0.00 - 100.00

    class Meta:
        unique_together = ("user", "course")
        ordering = ("-started_at",)

    def __str__(self):
        return f"{self.user} → {self.course}"


class Progress(models.Model):
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="progress_items"
    )
    mission = models.ForeignKey(
        "catalog.Mission", on_delete=models.CASCADE, related_name="progress_entries"
    )
    completed = models.BooleanField(default=False)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("enrollment", "mission")

    def __str__(self):
        return f"{self.enrollment.user} - {self.mission} ({'ok' if self.completed else 'pending'})"


class Certificate(models.Model):
    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name="certificate"
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to="certificates/%Y/%m/%d/", null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Certificat {self.enrollment.user} - {self.enrollment.course}"


# Quiz system
class Quiz(models.Model):
    course = models.ForeignKey("catalog.Course", on_delete=models.CASCADE, related_name="quizzes")
    title = models.CharField(max_length=255)
    pass_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=50.0
    )  # seuil d'obtention

    def __str__(self):
        return f"{self.course} - {self.title}"


class Question(models.Model):
    KIND_CHOICES = (
        ("mcq", "QCM"),
        ("tf", "Vrai/Faux"),
        ("free", "Libre"),
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default="mcq")
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)

    def __str__(self):
        return f"Q: {self.text[:50]}"


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=512)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"Choice ({'✓' if self.is_correct else '✗'}) {self.text[:40]}"


class Attempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_attempts")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    created_at = models.DateTimeField(auto_now_add=True)
    # total score (0-100)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(default=False)
    data = models.JSONField(
        blank=True, null=True
    )  # stocke les réponses {question_id: choice_id/answer}

    class Meta:
        ordering = ("-created_at",)
        unique_together = ("user", "quiz", "created_at")

    def __str__(self):
        return f"{self.user} - {self.quiz} ({self.score})"
