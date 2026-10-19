import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { child, pendingAction } from "@/test/parent-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { PendingActionRow, pendingActionHref } = await import("./PendingActionRow");
const { PendingActionList } = await import("./PendingActionList");
const { ChildCard, activeCoursesLabel, childMeta } = await import("./ChildCard");
const { ParentHome, ParentHomeSkeleton, ParentHomeView, childrenHeadline, HOME_CHILDREN_PAGE_SIZE } = await import(
  "./ParentHome"
);

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

const ACTIONS = [
  pendingAction({ type: "consent", id: "c3f1", childId: null, childFirstName: "Kossi", childLastName: "Houngbo", url: "/parent/consentements/c3f1" }),
  pendingAction({ type: "payment_request", id: "12", url: "/parent/demandes/12" }),
  pendingAction({ type: "event_application", id: "5", url: "/parent/evenements" }),
  pendingAction({ type: "deletion_request", id: "9", childId: 8, childFirstName: "Noé", url: "/parent/enfants/8/supprimer?demande=9" }),
];

describe("PendingActionRow (WPD01, 4 types)", () => {
  it.each([
    ["consent", "Demande de consentement · Kossi Houngbo", "Examiner", "/parent/consentements/c3f1", /Kossi souhaite s'inscrire/],
    ["payment_request", "Demande de paiement · Léa Adjovi", "Payer", "/parent/demandes/12", /Léa vous demande de régler/],
    ["event_application", "Candidature à un Steamy Event · Léa Adjovi", "Examiner", "/parent/evenements", /Léa souhaite participer/],
    ["deletion_request", "Demande de suppression du compte · Noé Adjovi", "Examiner", "/parent/enfants/8/supprimer?demande=9", /Noé demande la suppression/],
  ] as const)("%s : objet, enfant, date et CTA vers son écran", async (type, title, cta, href, body) => {
    const action = ACTIONS.find((a) => a.type === type)!;
    const { container } = render(<PendingActionRow action={action} />);
    const row = screen.getByRole("article", { name: title });
    expect(within(row).getByText(body)).toBeInTheDocument();
    expect(within(row).getByText("15 octobre 2026")).toHaveAttribute("datetime", action.createdAt);
    const link = within(row).getByRole("link", { name: new RegExp(`^${cta}`) });
    expect(link).toHaveAttribute("href", href);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("« Payer » est l'action primaire magenta (C1), « Examiner » secondaire", () => {
    render(<PendingActionList actions={ACTIONS} />);
    expect(screen.getByRole("link", { name: /^Payer/ }).className).toContain("bg-primary-500");
    expect(screen.getAllByRole("link", { name: /^Examiner/ })[0].className).not.toContain("bg-primary-500");
  });

  it("sans prénom connu : « Votre enfant »", () => {
    render(<PendingActionRow action={pendingAction({ childFirstName: "", childLastName: "" })} />);
    expect(screen.getByRole("article", { name: "Demande de paiement" })).toHaveTextContent("Votre enfant vous demande");
  });
});

describe("pendingActionHref", () => {
  it("prend l'url de l'API, sinon la route de son type", () => {
    expect(pendingActionHref(pendingAction({ url: "/parent/demandes/12" }))).toBe("/parent/demandes/12");
    expect(pendingActionHref(pendingAction({ type: "consent", id: "ab", url: "" }))).toBe("/parent/consentements/ab");
    expect(pendingActionHref(pendingAction({ type: "payment_request", id: "4", url: "https://ailleurs.test" }))).toBe(
      "/parent/demandes/4",
    );
    expect(pendingActionHref(pendingAction({ type: "event_application", url: "" }))).toBe("/parent/evenements");
    expect(pendingActionHref(pendingAction({ type: "deletion_request", id: "9", childId: 8, url: "" }))).toBe(
      "/parent/enfants/8/supprimer?demande=9",
    );
    expect(pendingActionHref(pendingAction({ type: "deletion_request", childId: null, url: "" }))).toBe("/parent/enfants");
  });
});

describe("PendingActionList", () => {
  it("une ligne par demande, dans l'ordre de l'API", () => {
    render(<PendingActionList actions={ACTIONS} />);
    const list = screen.getByRole("list", { name: "Demandes à valider" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("aucune demande : message rassurant", () => {
    render(<PendingActionList actions={[]} />);
    expect(screen.getByText(/Aucune demande en attente/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("ChildCard", () => {
  it("avatar, nom, âge · classe, parcours en cours, lien vers WPD03", async () => {
    const { container } = render(<ChildCard child={child()} />);
    const link = screen.getByRole("link", { name: /Léa Adjovi/ });
    expect(link).toHaveAttribute("href", "/parent/enfants/7");
    expect(link).toHaveTextContent("13 ans · 4ᵉ");
    expect(link).toHaveTextContent("2 parcours en cours");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans âge, classe ni avatar", () => {
    render(<ChildCard child={child({ age: null, schoolGrade: null, avatar: null, activeCourses: 0 })} />);
    expect(screen.getByRole("link")).toHaveTextContent("Aucun parcours en cours");
    expect(childMeta({ age: null, schoolGrade: null })).toBe("");
    expect(childMeta({ age: 11, schoolGrade: null })).toBe("11 ans");
    expect(activeCoursesLabel(1)).toBe("1 parcours en cours");
  });
});

describe("ParentHomeView", () => {
  it("hero, « À valider », statistiques serveur et cartes des enfants", async () => {
    const kids = [child(), child({ id: 8, firstName: "Noé", activeCourses: 1 })];
    const { container } = render(<ParentHomeView kids={kids} count={2} actions={ACTIONS} />);
    expect(screen.getByRole("heading", { level: 2, name: "2 enfants accompagnés sur Steamy" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ajouter un enfant" })[0]).toHaveAttribute("href", "/parent/enfants/ajouter");
    const stats = screen.getByRole("region", { name: "Vos statistiques" });
    expect(within(stats).getByText("Enfants").nextSibling).toHaveTextContent("2");
    expect(within(stats).getByText("Parcours en cours").nextSibling).toHaveTextContent("3");
    // Stat « À valider » = longueur de la liste renvoyée
    expect(within(stats).getByText("À valider").nextSibling).toHaveTextContent("4");
    expect(screen.getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", "/parent/enfants");
    expect(within(screen.getByRole("list", { name: "Mes enfants" })).getAllByRole("listitem")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("état vide sans enfant : CTA « Ajouter un enfant », pas de « Voir tout »", () => {
    render(<ParentHomeView kids={[]} count={0} actions={[]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Aucun enfant accompagné pour l'instant" })).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "Mes enfants" });
    expect(within(section).getByRole("link", { name: "Ajouter un enfant" })).toHaveAttribute("href", "/parent/enfants/ajouter");
    expect(screen.queryByRole("link", { name: "Voir tout" })).toBeNull();
  });

  it("confirmation après l'acceptation d'une demande (WPD05)", async () => {
    const { container } = render(<ParentHomeView kids={[]} count={0} actions={[]} acceptedFirstName="Kemi" />);
    expect(screen.getByRole("status")).toHaveTextContent("Demande acceptée : Kemi peut terminer son inscription.");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("childrenHeadline : singulier et pluriel", () => {
    expect(childrenHeadline(1)).toBe("1 enfant accompagné sur Steamy");
    expect(childrenHeadline(3)).toBe("3 enfants accompagnés sur Steamy");
  });
});

describe("ParentHome (WPD01)", () => {
  beforeEach(() => GET.mockReset());

  const home = (query: Record<string, string | string[]> = {}) => ({ searchParams: Promise.resolve(query) });

  function routeApi(
    children: ReturnType<typeof respond>,
    actions: ReturnType<typeof respond>,
    consent: ReturnType<typeof respond> = respond(404),
  ) {
    GET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/"
        ? children
        : path === "/api/accounts/consent-requests/{id}/"
          ? consent
          : actions,
    );
  }

  it("?consentement=<id> d'une demande acceptée : prénom relu dans l'API pour la confirmation", async () => {
    routeApi(
      respond(200, { count: 0, results: [] }),
      respond(200, []),
      respond(200, { id: 9, status: "accepted", firstName: "Kemi" }),
    );
    const tree = (await ParentHome(home({ consentement: "9" }))) as ReactElement<Parameters<typeof ParentHomeView>[0]>;
    expect(GET).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/", { params: { path: { id: "9" } } });
    expect(tree.props.acceptedFirstName).toBe("Kemi");
  });

  it("aucune confirmation pour une demande non acceptée, inconnue ou un paramètre invalide", async () => {
    routeApi(respond(200, { count: 0, results: [] }), respond(200, []), respond(200, { status: "refused", firstName: "Kemi" }));
    let tree = (await ParentHome(home({ consentement: "9" }))) as ReactElement<Parameters<typeof ParentHomeView>[0]>;
    expect(tree.props.acceptedFirstName).toBeUndefined();
    routeApi(respond(200, { count: 0, results: [] }), respond(200, []));
    tree = (await ParentHome(home({ consentement: "9" }))) as ReactElement<Parameters<typeof ParentHomeView>[0]>;
    expect(tree.props.acceptedFirstName).toBeUndefined();
    GET.mockClear();
    await ParentHome(home({ consentement: ["9", "10"] }));
    await ParentHome(home({ consentement: "Kemi" }));
    expect(GET).not.toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/", expect.anything());
  });

  it("lit les enfants et « À valider »", async () => {
    routeApi(respond(200, { count: 1, results: [child()] }), respond(200, ACTIONS));
    const tree = (await ParentHome(home())) as ReactElement<Parameters<typeof ParentHomeView>[0]>;
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/", { params: { query: { pageSize: HOME_CHILDREN_PAGE_SIZE } } });
    expect(GET).toHaveBeenCalledWith("/api/accounts/pending-actions/");
    expect(tree.type).toBe(ParentHomeView);
    expect(tree.props).toMatchObject({ count: 1, actions: ACTIONS });
    expect(tree.props.kids).toHaveLength(1);
  });

  it("sans compte ni résultats dans la réponse", async () => {
    routeApi(respond(200, {}), respond(200, []));
    const tree = (await ParentHome(home())) as ReactElement<Parameters<typeof ParentHomeView>[0]>;
    expect(tree.props).toMatchObject({ kids: [], count: 0 });
  });

  it("session perdue : ne rend rien (la garde redirige)", async () => {
    routeApi(respond(401), respond(200, []));
    expect(await ParentHome(home())).toBeNull();
  });

  it("panne de l'API : l'erreur remonte à l'enveloppe du segment", async () => {
    routeApi(respond(200, { count: 0, results: [] }), respond(500));
    await expect(ParentHome(home())).rejects.toThrow();
  });

  it("squelette annoncé au vouvoiement", () => {
    render(<ParentHomeSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de votre espace…" })).toBeInTheDocument();
  });
});
