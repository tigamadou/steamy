import type { Schemas } from "@steamy/api-client";

// Données factices de l'espace enseignant (formes du client généré), d'après le jeu D2 : M. Koffi, ses classes et
// ses élèves.

export function classroom(overrides: Partial<Schemas["Classroom"]> = {}): Schemas["Classroom"] {
  return {
    id: 3,
    name: "4ᵉ B · Robotique",
    color: "#7c3aed",
    course: {
      slug: "robot-bluetooth",
      title: "Robot Bluetooth",
      emoji: "🤖",
      category: { slug: "robotique", label: "Robotique", color: "#7c3aed", icon: "🤖" },
      difficulty: "beginner",
      durationHours: 12,
    },
    schoolGrade: null,
    memberCount: 12,
    pendingInvitationCount: 2,
    hasMembers: true,
    averageProgress: 42,
    createdAt: "2026-09-01T09:00:00Z",
    ...overrides,
  } as Schemas["Classroom"];
}

export function memberLearner(overrides: Partial<Schemas["MemberLearner"]> = {}): Schemas["MemberLearner"] {
  return {
    id: 21,
    firstName: "Yao",
    lastName: "Kpadé",
    avatar: { id: 1, code: "renard", label: "Renard", emoji: "🦊", color: "primary-500" },
    ...overrides,
  } as Schemas["MemberLearner"];
}

export function review(overrides: Partial<Schemas["Review"]> = {}): Schemas["Review"] {
  return {
    id: 90,
    quiz: { id: 5, kind: "level", title: "Quiz du niveau 2", projectTitle: "Robot suiveur", levelTitle: "Niveau 2" },
    percentage: 33,
    status: "ko",
    passed: false,
    createdAt: "2026-10-20T10:00:00Z",
    commented: false,
    learner: memberLearner(),
    classroom: { id: 3, name: "4ᵉ B · Robotique" },
    ...overrides,
  } as Schemas["Review"];
}

export function dropout(overrides: Partial<Schemas["Dropout"]> = {}): Schemas["Dropout"] {
  return {
    learner: memberLearner({ id: 22, firstName: "Sena", lastName: "Kpadé", avatar: null }),
    classroom: { id: 3, name: "4ᵉ B · Robotique" },
    lastActivityAt: "2026-10-10T10:00:00Z",
    ...overrides,
  };
}

export function dashboard(overrides: Partial<Schemas["TeacherDashboard"]> = {}): Schemas["TeacherDashboard"] {
  return {
    classroomCount: 2,
    learnerCount: 15,
    pendingInvitationCount: 3,
    toReviewCount: 6,
    dropoutCount: 1,
    classrooms: [classroom(), classroom({ id: 4, name: "3ᵉ A", memberCount: 1, pendingInvitationCount: 0, averageProgress: 0 })],
    toReview: [review()],
    dropouts: [dropout()],
    ...overrides,
  };
}

export function supervisedCourse(overrides: Partial<Schemas["SupervisedCourse"]> = {}): Schemas["SupervisedCourse"] {
  return {
    slug: "robot-bluetooth",
    title: "Robot Bluetooth",
    emoji: "🤖",
    category: { slug: "robotique", label: "Robotique", color: "#7c3aed", icon: "🤖" },
    difficulty: "beginner",
    durationHours: 12,
    classroomCount: 2,
    learnerCount: 15,
    ...overrides,
  } as Schemas["SupervisedCourse"];
}

export function supervisedCourseDetail(
  overrides: Partial<Schemas["SupervisedCourseDetail"]> = {},
): Schemas["SupervisedCourseDetail"] {
  return {
    ...supervisedCourse(),
    description: "Un robot piloté par téléphone.",
    classrooms: [classroom(), classroom({ id: 4, name: "3ᵉ A", averageProgress: 10 })],
    formativePassRate: 75,
    summativePassRate: null,
    projects: [
      {
        id: 1,
        order: 0,
        title: "Robot suiveur",
        durationHours: 4,
        passRate: 50,
        levels: [
          {
            id: 11,
            order: 0,
            title: "Les moteurs",
            durationMin: 90,
            passRate: 25,
            missions: [
              { id: 101, order: 0, title: "Allumer une LED", durationMin: 10, icon: "💡", completedCount: 12 },
              { id: 102, order: 1, title: "Faire tourner un moteur", durationMin: 75, completedCount: 1 },
              { id: 103, order: 2, title: "Câbler le pont en H", durationMin: 20, completedCount: 0 },
            ],
          },
          { id: 12, order: 1, title: "Les capteurs", durationMin: 60, passRate: 100, missions: [] },
        ],
      },
      { id: 2, order: 1, title: "Robot dessinateur", durationHours: 3, passRate: null, levels: [] },
    ],
    ...overrides,
  } as Schemas["SupervisedCourseDetail"];
}

export function missionRead(overrides: Partial<Schemas["MissionRead"]> = {}): Schemas["MissionRead"] {
  return {
    id: 101,
    order: 0,
    title: "Allumer une LED",
    durationMin: 10,
    icon: "💡",
    vimeoId: "",
    vimeoHash: "",
    blocks: [
      { type: "text", text: "Branchez la LED sur la broche 13." },
      { type: "tip", text: "Le côté long est l'anode." },
    ],
    level: { id: 11, title: "Les moteurs" },
    project: { id: 1, title: "Robot suiveur" },
    ...overrides,
  } as Schemas["MissionRead"];
}
