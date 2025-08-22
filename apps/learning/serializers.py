# apps/learning/serializers.py
from rest_framework import serializers
from .models import Enrollment, Progress, Certificate, Quiz, Question, Choice, Attempt
from apps.courses.serializers import LessonSerializer  # lecture seule


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ["id", "user", "course", "started_at", "completed", "status", "progress"]
        read_only_fields = ["started_at", "completed", "progress"]


class ProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)

    class Meta:
        model = Progress
        fields = ["id", "enrollment", "lesson", "completed", "score", "updated_at"]
        read_only_fields = ["updated_at"]


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ["id", "enrollment", "issued_at", "file", "score"]
        read_only_fields = ["issued_at"]


# Quiz & assessment
class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "question", "text", "is_correct"]


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "quiz", "text", "kind", "weight", "choices"]


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "course", "title", "pass_score", "questions"]


class AttemptCreateSerializer(serializers.ModelSerializer):
    """
    Atttempt: client envoie `data` : {question_id: choice_id} pour MCQ/TF
    On calcule le score côté serveur à la sauvegarde via create()
    """
    class Meta:
        model = Attempt
        fields = ["id", "user", "quiz", "created_at", "score", "passed", "data"]
        read_only_fields = ["created_at", "score", "passed"]

    def create(self, validated_data):
        user = validated_data.get("user")
        quiz = validated_data.get("quiz")
        data = validated_data.get("data") or {}

        attempt = Attempt.objects.create(user=user, quiz=quiz, data=data)

        # simple auto-grading: calcul pondéré
        total_weight = 0
        earned = 0
        for q in quiz.questions.all():
            total_weight += float(q.weight)
            qid = str(q.id)
            ans = data.get(qid)
            if q.kind in ("mcq", "tf"):
                # ans should be choice id or list of ids
                if ans is None:
                    continue
                # support single or list
                if isinstance(ans, list):
                    selected = Choice.objects.filter(id__in=ans, question=q)
                    correct = selected.filter(is_correct=True).count()
                    # naive: points if all selected are correct and number matches
                    correct_total = q.choices.filter(is_correct=True).count()
                    if correct_total and correct == correct_total and selected.count() == correct_total:
                        earned += float(q.weight)
                else:
                    try:
                        c = Choice.objects.get(id=ans, question=q)
                        if c.is_correct:
                            earned += float(q.weight)
                    except Choice.DoesNotExist:
                        pass
            elif q.kind == "free":
                # free responses must be graded manually (skip auto)
                pass

        score_pct = 0.0
        if total_weight > 0:
            score_pct = (earned / total_weight) * 100.0

        attempt.score = round(score_pct, 2)
        attempt.passed = attempt.score >= float(quiz.pass_score)
        attempt.save()

        return attempt


class AttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attempt
        fields = ["id", "user", "quiz", "created_at", "score", "passed", "data"]
        read_only_fields = ["created_at", "score", "passed"]
