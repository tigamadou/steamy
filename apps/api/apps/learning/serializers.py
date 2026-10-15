"""
Réponses de la pédagogie (§7.4). Le contenu d'une mission (`blocks`) et les vidéos (`vimeoId` + `vimeoHash`,
`introVimeoId` + `introVimeoHash`) ne sortent que pour un inscrit, sur une étape déverrouillée (ADR 0004).

Les vues construisent des dictionnaires à partir de `Progression` ; ces serializers en fixent la forme (et le
schéma OpenAPI).
"""

from rest_framework import serializers

from apps.catalog.serializers import CourseListSerializer

STATES = (("done", "Faite"), ("available", "Disponible"), ("locked", "Verrouillée"))


class EnrollRequestSerializer(serializers.Serializer):
    course_slug = serializers.SlugField()


class EnrollmentQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(("active", "En cours"), ("completed", "Terminés")), required=False
    )


class NextStepSerializer(serializers.Serializer):
    """Étape suivante : mission à faire, ou certification quand tout le parcours est fait."""

    type = serializers.ChoiceField(
        choices=(("mission", "Mission"), ("certification", "Certification"))
    )
    id = serializers.IntegerField(allow_null=True, help_text="Mission ; null pour la certification")
    title = serializers.CharField(allow_null=True)
    course_slug = serializers.SlugField()
    project_id = serializers.IntegerField(allow_null=True)
    level_id = serializers.IntegerField(allow_null=True)


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
    source = serializers.ChoiceField(
        choices=(
            ("free", "Gratuit"),
            ("order", "Commande"),
            ("kit_code", "Kit Code"),
            ("classroom", "Classe"),
        )
    )
    status = serializers.ChoiceField(choices=(("active", "En cours"), ("completed", "Terminé")))
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


class LevelItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    duration_min = serializers.IntegerField()
    intro_summary = serializers.CharField()
    state = serializers.ChoiceField(choices=STATES)
    mission_count = serializers.IntegerField()
    missions_done = serializers.IntegerField()


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
