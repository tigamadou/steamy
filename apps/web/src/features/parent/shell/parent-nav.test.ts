import { describe, expect, it } from "vitest";

import { PARENT_PROFILE_HREF, parentNav, parentSection } from "./parent-nav";

describe("parentNav", () => {
  it("a les 6 entrées de §5.11, seules les entrées livrées sont visibles", () => {
    expect(parentNav.map((entry) => [entry.id, entry.icon, entry.label])).toEqual([
      ["home", "home", "Accueil"],
      ["children", "user", "Mes enfants"],
      ["events", "trophy", "Événements"],
      ["orders", "cart", "Commandes"],
      ["help", "book", "Aide"],
      ["settings", "gear", "Paramètres"],
    ]);
    expect(parentNav.filter((entry) => !entry.hidden).map((entry) => entry.href)).toEqual([
      "/parent",
      "/parent/commandes",
      "/parent/aide",
      "/parent/parametres",
    ]);
    expect(PARENT_PROFILE_HREF).toBe("/parent/parametres");
  });
});

describe("parentSection", () => {
  it.each([
    ["/parent", "home", "Bonjour Marie 👋"],
    ["/parent/consentements/ab12", "home", "Demande de consentement"],
    ["/parent/demandes/12", "home", "Demande de paiement"],
    ["/parent/notifications", null, "Notifications"],
    ["/parent/enfants", "children", "Mes enfants"],
    ["/parent/enfants/ajouter", "children", "Ajouter un enfant"],
    ["/parent/enfants/7", "children", "Mes enfants"],
    ["/parent/enfants/7/modifier", "children", "Modifier le profil"],
    ["/parent/enfants/7/rapport", "children", "Rapport hebdomadaire"],
    ["/parent/enfants/7/supprimer", "children", "Supprimer le compte"],
    ["/parent/evenements", "events", "Steamy Events"],
    ["/parent/evenements/robot-cup", "events", "Steamy Events"],
    ["/parent/evenements/robot-cup/inscription", "events", "Inscrire un enfant"],
    ["/parent/commandes", "orders", "Commandes"],
    ["/parent/commandes/STM-2026-0001", "orders", "Commandes"],
    ["/parent/boutique", "orders", "Boutique de kits"],
    ["/parent/boutique/kit-zeti", "orders", "Boutique de kits"],
    ["/parent/boutique/panier", "orders", "Mon panier"],
    ["/parent/boutique/commande", "orders", "Commande de kits"],
    ["/parent/aide", "help", "Aide & support"],
    ["/parent/parametres", "settings", "Paramètres"],
  ])("%s → %s", (pathname, active, title) => {
    expect(parentSection(pathname, "Marie")).toEqual({ active, title });
  });

  it("ne confond pas un préfixe de mot (« /parent/enfantsX ») et retombe sur l'accueil", () => {
    expect(parentSection("/parent/enfantsX", "Marie").active).toBe("home");
  });

  it("titre neutre sans prénom", () => {
    expect(parentSection("/parent", "")).toEqual({ active: "home", title: "Accueil" });
  });
});
