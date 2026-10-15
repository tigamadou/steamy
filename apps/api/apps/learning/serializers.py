"""
Réponses de la pédagogie (§7.4). Le contenu d'une mission (`blocks`) et les vidéos (`vimeoId` + `vimeoHash`,
`introVimeoId` + `introVimeoHash`) ne sortent que pour un inscrit, sur une étape déverrouillée (ADR 0004).

Les vues construisent des dictionnaires à partir de `Progression` ; ces serializers en fixent la forme (et le
schéma OpenAPI).
"""

from rest_framework import serializers

from apps.catalog.models import Quiz
from apps.catalog.serializers import CourseListSerializer

from .models import Enrollment, QuizAttempt

STATES = (("done", "Faite"), ("available", "Disponible"), ("locked", "Verrouillée"))


class EnrollRequestSerializer(serializers.Serializer):
    course_slug = serializers.SlugField()


class EnrollmentQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Enrollment.Status.choices, required=False)


class NextStepSerializer(serializers.Serializer):
    """Étape suivante : mission ou quiz à faire, ou certification quand tout le parcours est fait."""

    type = serializers.ChoiceField(
        choices=(("mission", "Mission"), ("quiz", "Quiz"), ("certification", "Certification"))
    )
    id = serializers.IntegerField(
        allow_null=True, help_text="Mission ou quiz ; null pour la certification"
    )
    title = serializers.CharField(allow_null=True)
    course_slug = serializers.SlugField()
    project_id = serializers.IntegerField(allow_null=True)
    level_id = serializers.IntegerField(allow_null=True, help_text="null pour une sommative")
    quiz_kind = serializers.ChoiceField(choices=Quiz.Kind.choices, allow_null=True)


class RefSerializer(serializers.Serializer):
    """Projet ou niveau cité (fil d'Ariane, position)."""

    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()


class CourseRefSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()


class EnrollmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    course = CourseListSerializer()
    source = serializers.ChoiceField(choices=Enrollment.Source.choices)
    status = serializers.ChoiceField(choices=Enrollment.Status.choices)
    progress_pct = serializers.IntegerField()
    mission_count = serializers.IntegerField()
    missions_done = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    last_activity_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    current_project = RefSerializer(allow_null=True, help_text="Projet de la prochaine étape")
    current_level = RefSerializer(allow_null=True, help_text="Niveau de la prochaine étape")
    next = NextStepSerializer()


class MissionItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_min = serializers.IntegerField()
    icon = serializers.CharField()
    state = serializers.ChoiceField(choices=STATES)


QUIZ_KINDS = Quiz.Kind.choices
ATTEMPT_STATUSES = QuizAttempt.Status.choices


class QuizItemSerializer(serializers.Serializer):
    """Quiz d'un niveau (formative) ou d'un projet (sommative), dans l'arbre."""

    id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=QUIZ_KINDS)
    title = serializers.CharField()
    threshold = serializers.IntegerField()
    state = serializers.ChoiceField(choices=STATES, help_text="`done` : réussi")


class LevelItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_min = serializers.IntegerField()
    intro_summary = serializers.CharField()
    state = serializers.ChoiceField(choices=STATES)
    mission_count = serializers.IntegerField()
    missions_done = serializers.IntegerField()
    quiz = QuizItemSerializer(allow_null=True, help_text="Formative du niveau")


class TreeLevelSerializer(LevelItemSerializer):
    missions = MissionItemSerializer(many=True)


class TreeProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_hours = serializers.IntegerField()
    state = serializers.ChoiceField(choices=STATES)
    mission_count = serializers.IntegerField()
    missions_done = serializers.IntegerField()
    quiz = QuizItemSerializer(allow_null=True, help_text="Sommative du projet")
    levels = TreeLevelSerializer(many=True)


class TreeSerializer(EnrollmentSerializer):
    """Arbre du parcours (WC06a, WC06b, WJ09) : titres, durées et états, sans contenu."""

    projects = TreeProjectSerializer(many=True)


class ProjectDetailSerializer(serializers.Serializer):
    """Projet (WJ01)."""

    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_hours = serializers.IntegerField()
    objectives = serializers.ListField(child=serializers.CharField())
    prerequisites = serializers.ListField(child=serializers.CharField())
    materials = serializers.ListField(child=serializers.CharField())
    state = serializers.ChoiceField(choices=STATES)
    mission_count = serializers.IntegerField()
    missions_done = serializers.IntegerField()
    course = CourseRefSerializer()
    quiz = QuizItemSerializer(allow_null=True, help_text="Sommative du projet")
    levels = LevelItemSerializer(many=True)


class LevelDetailSerializer(serializers.Serializer):
    """Niveau (WJ02) : introduction vidéo (identifiant et hachage, ADR 0004) et missions."""

    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_min = serializers.IntegerField()
    intro_summary = serializers.CharField()
    intro_vimeo_id = serializers.CharField(allow_null=True)
    intro_vimeo_hash = serializers.CharField(allow_null=True)
    state = serializers.ChoiceField(choices=STATES)
    course = CourseRefSerializer()
    project = RefSerializer()
    missions = MissionItemSerializer(many=True)


class MissionBlockSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=(("text", "Texte"), ("tip", "Astuce"), ("media", "Média"))
    )
    text = serializers.CharField(required=False)
    src = serializers.CharField(required=False)
    alt = serializers.CharField(required=False)
    caption = serializers.CharField(required=False)


class MissionDetailSerializer(serializers.Serializer):
    """Mission (WJ03) : vidéo (identifiant et hachage, ADR 0004) et blocs de contenu."""

    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_min = serializers.IntegerField()
    icon = serializers.CharField()
    vimeo_id = serializers.CharField(allow_null=True)
    vimeo_hash = serializers.CharField(allow_null=True)
    blocks = MissionBlockSerializer(many=True)
    state = serializers.ChoiceField(choices=STATES)
    course = CourseRefSerializer()
    project = RefSerializer()
    level = RefSerializer()
    next = NextStepSerializer(help_text="Étape à proposer après cette mission")


class MissionCompleteSerializer(serializers.Serializer):
    mission_id = serializers.IntegerField()
    progress_pct = serializers.IntegerField()
    next = NextStepSerializer(
        help_text="Mission suivante, ou certification si le parcours est fait"
    )


# --- Quiz et tentatives (D31, D32) ---------------------------------------------------------------


class ChoiceSerializer(serializers.Serializer):
    """Réponse proposée, sans le corrigé."""

    id = serializers.IntegerField()
    text = serializers.CharField()


class QuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    text = serializers.CharField()
    choices = ChoiceSerializer(many=True)


class QuizDetailSerializer(serializers.Serializer):
    """Quiz à passer (WJ04, WJ10) : questions et réponses proposées, jamais le corrigé (§4.4)."""

    id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=QUIZ_KINDS)
    title = serializers.CharField()
    threshold = serializers.IntegerField(help_text="Score minimal pour réussir (%)")
    time_limit_sec = serializers.IntegerField(allow_null=True)
    question_count = serializers.IntegerField()
    state = serializers.ChoiceField(choices=STATES, help_text="`done` : déjà réussi")
    retry_in_sec = serializers.IntegerField(
        help_text="Secondes avant de pouvoir le repasser (sommative ratée, D32), 0 sinon"
    )
    course = CourseRefSerializer()
    project = RefSerializer()
    level = RefSerializer(allow_null=True, help_text="null pour une sommative")
    questions = QuestionSerializer(many=True)


class AnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choice_id = serializers.IntegerField()


class AttemptRequestSerializer(serializers.Serializer):
    """Envoi groupé de toutes les réponses ; une question sans réponse compte comme fausse."""

    answers = AnswerSerializer(many=True)
    duration_sec = serializers.IntegerField(min_value=0, required=False, allow_null=True)

    def validate_answers(self, answers):
        questions = self.context["questions"]  # {questionId: {choiceId…}}
        seen = set()
        for answer in answers:
            question, choice = answer["question_id"], answer["choice_id"]
            if question not in questions:
                raise serializers.ValidationError(
                    f"La question {question} n'appartient pas à ce quiz."
                )
            if question in seen:
                raise serializers.ValidationError(f"Une seule réponse par question ({question}).")
            if choice not in questions[question]:
                raise serializers.ValidationError(
                    f"La réponse {choice} ne correspond pas à la question {question}."
                )
            seen.add(question)
        return {answer["question_id"]: answer["choice_id"] for answer in answers}


class AttemptQuizSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=QUIZ_KINDS)
    title = serializers.CharField()
    course_slug = serializers.SlugField()
    project_id = serializers.IntegerField()
    level_id = serializers.IntegerField(allow_null=True)


class RemediationSerializer(serializers.Serializer):
    """Mission à revoir (WJ08) : lien vers WJ03."""

    mission_id = serializers.IntegerField()
    title = serializers.CharField()
    concept = serializers.CharField()


class QuestionReviewSerializer(serializers.Serializer):
    """Résultat d'une question : juste ou non, sans dévoiler la bonne réponse."""

    question_id = serializers.IntegerField()
    text = serializers.CharField()
    concept = serializers.CharField()
    correct = serializers.BooleanField()
    chosen_choice_id = serializers.IntegerField(allow_null=True)
    remediation_mission_id = serializers.IntegerField(allow_null=True)


class AttemptListItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    quiz = AttemptQuizSerializer()
    score = serializers.IntegerField()
    total = serializers.IntegerField()
    percentage = serializers.IntegerField()
    threshold = serializers.IntegerField(help_text="Seuil appliqué à cette tentative (%)")
    status = serializers.ChoiceField(choices=ATTEMPT_STATUSES)
    passed = serializers.BooleanField()
    duration_sec = serializers.IntegerField(allow_null=True)
    points_earned = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class AttemptDetailSerializer(AttemptListItemSerializer):
    """Résultat d'une tentative (WJ05, WJ08, WD08)."""

    failed_concepts = serializers.ListField(child=serializers.CharField())
    remediation = RemediationSerializer(many=True)
    questions = QuestionReviewSerializer(many=True)
    retry_in_sec = serializers.IntegerField(
        help_text="Secondes avant de pouvoir repasser le quiz (sommative ratée, D32)"
    )
    next = NextStepSerializer(
        allow_null=True,
        help_text="Après une réussite : étape suivante (après le badge) ; sinon null",
    )


class AttemptQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ATTEMPT_STATUSES, required=False)
    quiz = serializers.IntegerField(required=False)


class AttemptSummarySerializer(serializers.Serializer):
    """Bandeau de WD07, sur toutes les tentatives de l'apprenant (filtres ignorés)."""

    attempt_count = serializers.IntegerField()
    success_rate = serializers.IntegerField(help_text="Part des tentatives réussies (%)")
    perfect_count = serializers.IntegerField(help_text="Tentatives à 100 %")
    streak_days = serializers.IntegerField()
