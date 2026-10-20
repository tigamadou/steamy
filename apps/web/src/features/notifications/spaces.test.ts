import { describe, expect, it } from "vitest";

import { NOTIFICATION_SPACES, notificationHref } from "./spaces";

describe("notificationHref (WPD14, types de §5.11)", () => {
  it.each([
    // Types émis par l'API, avec leur url
    ["payment_request", "/parent/demandes/12", "/parent/demandes/12"],
    ["event_application", "/parent/evenements", "/parent/evenements"],
    ["deletion_request", "/parent/enfants/8/supprimer?demande=9", "/parent/enfants/8/supprimer?demande=9"],
    ["weekly_report", "/parent/enfants/7/rapport?semaine=2026-W42", "/parent/enfants/7/rapport?semaine=2026-W42"],
    ["order", "/parent/commandes/STM-1", "/parent/commandes/STM-1"],
    ["announcement", "/evenements/robot-cup", "/evenements/robot-cup"],
    // Sans url utilisable : la cible de son type
    ["consent", "", "/parent"],
    ["payment_request", "", "/parent"],
    ["event_application", "", "/parent/evenements"],
    ["deletion_request", "", "/parent/enfants"],
    ["badge_unlocked", "", "/parent/enfants"],
    ["progress", "/apprenant/parcours/robot", "/parent/enfants"],
    ["teacher_comment", "", "/parent/enfants"],
    ["weekly_report", "", "/parent/enfants"],
    ["order", "https://ailleurs.test", "/parent/commandes"],
    ["kit_shipped", "", "/parent/commandes"],
  ])("%s (%s) → %s", (type, url, expected) => {
    expect(notificationHref({ type, url })).toBe(expected);
  });

  it("type inconnu sans url : aucune cible ; lien vers un autre espace écarté", () => {
    expect(notificationHref({ type: "nouveau", url: "" })).toBeNull();
    expect(notificationHref({ type: "nouveau", url: "/enseignant" })).toBeNull();
    expect(notificationHref({ type: "nouveau", url: "/backoffice/impact" })).toBeNull();
  });
});

describe("NOTIFICATION_SPACES", () => {
  it("apprenant au tutoiement, parent au vouvoiement, chacun ses routes", () => {
    expect(NOTIFICATION_SPACES.learner.register).toBe("tu");
    expect(NOTIFICATION_SPACES.learner.href({ type: "x", url: "/apprenant/catalogue" })).toBe("/apprenant/catalogue");
    expect(NOTIFICATION_SPACES.parent.register).toBe("vous");
    expect(NOTIFICATION_SPACES.parent.list("non-lues")).toBe("/parent/notifications?onglet=non-lues");
    expect(NOTIFICATION_SPACES.parent.preferences).toBe("/parent/parametres#notifications");
  });
});
