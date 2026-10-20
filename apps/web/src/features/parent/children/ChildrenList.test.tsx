import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { child, pendingAction } from "@/test/parent-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/features/parent/deletion/CancelDeletionButton", () => ({
  CancelDeletionButton: ({ childId }: { childId: number }) => <button type="button">Annuler la suppression {childId}</button>,
}));

const { ChildRow, fullName } = await import("./ChildRow");
const { ChildrenList, ChildrenListSkeleton, ChildrenListView, CHILDREN_PAGE_SIZE } = await import("./ChildrenList");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

const CONSENT = pendingAction({
  type: "consent",
  id: "c3f1",
  childId: null,
  childFirstName: "Kossi",
  childLastName: "Houngbo",
  url: "/parent/consentements/c3f1",
});

describe("ChildRow (WPD02, 3 statuts)", () => {
  it("actif : âge · classe, parcours en cours, « Voir le profil » → WPD03, sans badge", async () => {
    const { container } = render(<ChildRow item={{ kind: "child", child: child() }} />);
    const row = screen.getByRole("article", { name: "Léa Adjovi" });
    expect(row).toHaveTextContent("13 ans · 4ᵉ");
    expect(row).toHaveTextContent("2 parcours en cours");
    expect(within(row).getByRole("link", { name: /^Voir le profil\s*de Léa Adjovi$/ })).toHaveAttribute(
      "href",
      "/parent/enfants/7",
    );
    expect(within(row).queryByText(/Supprimé|Demande|Suppression/)).toBeNull();
    // Jamais de « Relancer l'invitation » (D50)
    expect(screen.queryByText(/Relancer/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("demande à examiner : badge ambre, « Reçue le … », « Examiner » → WPD05, sans progression", async () => {
    const { container } = render(<ChildRow item={{ kind: "consent", action: CONSENT }} />);
    const row = screen.getByRole("article", { name: "Kossi Houngbo" });
    expect(within(row).getByText("Demande à examiner")).toBeInTheDocument();
    expect(within(row).getByText("15 octobre 2026")).toHaveAttribute("datetime", CONSENT.createdAt);
    expect(within(row).getByRole("link", { name: /^Examiner\s*la demande de Kossi Houngbo$/ })).toHaveAttribute(
      "href",
      "/parent/consentements/c3f1",
    );
    expect(row).not.toHaveTextContent("parcours");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("suppression programmée : badge « Supprimé le … » (J+30) et « Annuler la suppression »", () => {
    const deleted = child({
      status: "deactivated",
      deletion: { id: 4, status: "scheduled", scheduledFor: "2026-11-18T10:00:00Z" },
    });
    render(<ChildRow item={{ kind: "child", child: deleted }} />);
    const row = screen.getByRole("article", { name: "Léa Adjovi" });
    expect(within(row).getByText(/Supprimé le/)).toHaveTextContent("Supprimé le 18 novembre 2026");
    expect(within(row).getByRole("button", { name: "Annuler la suppression 7" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /Voir le profil/ })).toBeInTheDocument();
  });

  it("suppression programmée sans date connue", () => {
    const deleted = child({ deletion: { id: 4, status: "scheduled", scheduledFor: null } });
    render(<ChildRow item={{ kind: "child", child: deleted }} />);
    expect(screen.getByText("Suppression programmée")).toBeInTheDocument();
  });

  it("suppression demandée par l'enfant : « Examiner » → WPD09 avec la demande", () => {
    const asked = child({ deletion: { id: 9, status: "pending_parent", scheduledFor: null } });
    render(<ChildRow item={{ kind: "child", child: asked }} />);
    expect(screen.getByText("Suppression demandée")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Examiner\s*la demande de suppression de Léa Adjovi$/ })).toHaveAttribute(
      "href",
      "/parent/enfants/7/supprimer?demande=9",
    );
  });

  it("sans âge, classe ni avatar", () => {
    render(<ChildRow item={{ kind: "child", child: child({ age: null, schoolGrade: null, avatar: null, activeCourses: 0 }) }} />);
    expect(screen.getByRole("article")).toHaveTextContent("Aucun parcours en cours");
    expect(fullName({ firstName: "Léa", lastName: "" })).toBe("Léa");
  });
});

describe("ChildrenListView", () => {
  it("« Ajouter un enfant » → WPD04, une ligne par élément", async () => {
    const { container } = render(
      <ChildrenListView items={[{ kind: "consent", action: CONSENT }, { kind: "child", child: child() }]} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Vos enfants" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajouter un enfant" })).toHaveAttribute("href", "/parent/enfants/ajouter");
    expect(within(screen.getByRole("list", { name: "Vos enfants" })).getAllByRole("listitem")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("aucun enfant ni demande : état vide avec « Ajouter un enfant »", () => {
    render(<ChildrenListView items={[]} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Ajouter un enfant" })).toHaveLength(2);
  });
});

describe("ChildrenList (WPD02)", () => {
  beforeEach(() => GET.mockReset());

  function routeApi(children: ReturnType<typeof respond>, actions: ReturnType<typeof respond>) {
    GET.mockImplementation(async (path: string) => (path === "/api/accounts/children/" ? children : actions));
  }

  it("demandes de consentement d'abord (les autres types sont ignorés), puis les enfants", async () => {
    routeApi(respond(200, { count: 1, results: [child()] }), respond(200, [pendingAction(), CONSENT]));
    const tree = (await ChildrenList()) as ReactElement<Parameters<typeof ChildrenListView>[0]>;
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/", { params: { query: { pageSize: CHILDREN_PAGE_SIZE } } });
    expect(tree.type).toBe(ChildrenListView);
    expect(tree.props.items).toEqual([
      { kind: "consent", action: CONSENT },
      { kind: "child", child: child() },
    ]);
  });

  it("réponse sans résultats", async () => {
    routeApi(respond(200, {}), respond(200, []));
    const tree = (await ChildrenList()) as ReactElement<Parameters<typeof ChildrenListView>[0]>;
    expect(tree.props.items).toEqual([]);
  });

  it("session perdue : ne rend rien (la garde redirige)", async () => {
    routeApi(respond(401), respond(200, []));
    expect(await ChildrenList()).toBeNull();
  });

  it("squelette annoncé au vouvoiement", () => {
    render(<ChildrenListSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de vos enfants…" })).toBeInTheDocument();
  });
});
