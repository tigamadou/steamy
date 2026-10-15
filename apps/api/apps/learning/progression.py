"""
Progression séquentielle (§4.4, WJ01) : un parcours est une suite d'étapes, dans l'ordre des projets, niveaux et
missions. Une étape n'est accessible que si toutes les précédentes sont faites : le contenu d'une étape verrouillée
est refusé par l'API (`CONTENT_LOCKED`), pas seulement masqué.

États : `done` (faite), `available` (la première étape non faite), `locked` (après elle). Un niveau ou un projet est
`done` si toutes ses étapes le sont, `available` s'il contient l'étape disponible ou des étapes faites, `locked`
sinon. Une étape faite reste accessible, même si du contenu a été inséré avant elle depuis.
"""

from dataclasses import dataclass, field

from django.db.models import Prefetch

from apps.catalog.models import Course, Level, Mission, Project

DONE = "done"
AVAILABLE = "available"
LOCKED = "locked"


@dataclass(frozen=True)
class Step:
    type: str  # "mission"
    id: int
    title: str
    project_id: int
    level_id: int


@dataclass
class Container:
    """Projet ou niveau : l'intervalle de ses étapes dans la suite du parcours."""

    obj: object
    start: int
    end: int  # exclu
    levels: list["Container"] = field(default_factory=list)


def load_course(course_id: int) -> Course:
    """Parcours avec ses projets, niveaux et missions, dans l'ordre."""
    missions = Mission.objects.order_by("order", "id")
    levels = Level.objects.order_by("order", "id").prefetch_related(
        Prefetch("missions", queryset=missions)
    )
    projects = Project.objects.order_by("order", "id").prefetch_related(
        Prefetch("levels", queryset=levels)
    )
    return (
        Course.objects.select_related("category")
        .prefetch_related(Prefetch("projects", queryset=projects))
        .get(pk=course_id)
    )


class Progression:
    """État de chaque étape d'un parcours pour une inscription."""

    def __init__(self, enrollment, course: Course | None = None):
        self.enrollment = enrollment
        self.course = course or load_course(enrollment.course_id)
        self.steps: list[Step] = []
        self.projects: list[Container] = []
        for project in self.course.projects.all():
            project_box = Container(project, len(self.steps), 0)
            for level in project.levels.all():
                level_box = Container(level, len(self.steps), 0)
                for mission in level.missions.all():
                    self.steps.append(
                        Step("mission", mission.id, mission.title, project.id, level.id)
                    )
                level_box.end = len(self.steps)
                project_box.levels.append(level_box)
            project_box.end = len(self.steps)
            self.projects.append(project_box)
        self.done_missions = set(enrollment.mission_progress.values_list("mission_id", flat=True))
        self._index = {(step.type, step.id): i for i, step in enumerate(self.steps)}
        self.first_open = next(
            (i for i, step in enumerate(self.steps) if not self.is_done(step)), len(self.steps)
        )

    # --- Étapes ------------------------------------------------------------------------------------

    def is_done(self, step: Step) -> bool:
        return step.id in self.done_missions

    def step_state(self, index: int) -> str:
        if self.is_done(self.steps[index]):
            return DONE
        return AVAILABLE if index == self.first_open else LOCKED

    def mission_state(self, mission_id: int) -> str:
        return self.step_state(self._index[("mission", mission_id)])

    def next_step(self) -> Step | None:
        """Première étape non faite ; `None` quand tout est fait."""
        return self.steps[self.first_open] if self.first_open < len(self.steps) else None

    def step_after(self, step_type: str, step_id: int) -> Step | None:
        """Étape à proposer après celle-ci : la prochaine non faite qui la suit, sinon la première non faite."""
        index = self._index[(step_type, step_id)]
        following = (s for s in self.steps[index + 1 :] if not self.is_done(s))
        return next(following, None) or self.next_step()

    # --- Projets et niveaux ------------------------------------------------------------------------

    def container_state(self, box: Container) -> str:
        if box.start == box.end:  # sans étape : franchi dès que tout ce qui précède est fait
            return DONE if box.start <= self.first_open else LOCKED
        states = {self.step_state(i) for i in range(box.start, box.end)}
        if states == {DONE}:
            return DONE
        return LOCKED if states == {LOCKED} else AVAILABLE

    def project_box(self, project_id: int) -> Container:
        return next(box for box in self.projects if box.obj.id == project_id)

    def level_box(self, level_id: int) -> Container:
        return next(
            level for box in self.projects for level in box.levels if level.obj.id == level_id
        )

    # --- Synthèse ----------------------------------------------------------------------------------

    @property
    def mission_count(self) -> int:
        return sum(1 for step in self.steps if step.type == "mission")

    @property
    def missions_done(self) -> int:
        return sum(1 for step in self.steps if step.type == "mission" and self.is_done(step))

    @property
    def progress_pct(self) -> int:
        total = self.mission_count
        return self.missions_done * 100 // total if total else 0

    def position(self) -> tuple[Container, Container] | None:
        """Projet et niveau de la prochaine étape (« Projet n · Niveau n » de WD23)."""
        step = self.next_step()
        if step is None:
            return None
        project = self.project_box(step.project_id)
        return project, self.level_box(step.level_id)
