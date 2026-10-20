import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const GET = vi.fn();
const getCurrentUser = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("./DeliveryForm", () => ({ DeliveryForm: (props: object) => <pre data-testid="livraison">{JSON.stringify(props)}</pre> }));
vi.mock("./AccountDeletion", () => ({
  AccountDeletion: ({ initial }: { initial: unknown }) => <pre data-testid="suppression">{JSON.stringify(initial)}</pre>,
}));

const { getDeletionRequest, getDeliveryAddress, getMyParent } = await import("./api");
const { Delivery, DeliverySkeleton } = await import("./Delivery");
const { ParentInfo, ParentInfoSkeleton } = await import("./ParentInfo");
const { Deletion, DeletionSkeleton } = await import("./Deletion");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

const PARENT = {
  firstName: "Marie",
  lastName: "Adjovi",
  relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "Vous êtes sa mère" },
  linkedAt: "2026-09-01T10:00:00Z",
};
const PROFILE = { locality: { id: 1, country: "BJ", city: "Cotonou", district: "", areaType: "urban" } };

function routeApi(routes: Record<string, ReturnType<typeof respond>>) {
  GET.mockImplementation(async (path: string) => routes[path] ?? respond(500));
}

beforeEach(() => {
  GET.mockReset();
  getCurrentUser.mockReset().mockResolvedValue({ firstName: "Léa", lastName: "Adjovi" });
});

describe("lectures facultatives du compte (api.ts)", () => {
  it("donnée, 404 → null, autre erreur → exception", async () => {
    GET.mockResolvedValueOnce(respond(200, PARENT));
    expect(await getMyParent()).toEqual(PARENT);
    GET.mockResolvedValueOnce(respond(404));
    expect(await getDeliveryAddress()).toBeNull();
    GET.mockResolvedValueOnce({ error: { code: "SERVER_ERROR", message: "Panne" }, response: new Response(null, { status: 500 }) });
    await expect(getDeletionRequest()).rejects.toThrow("Panne");
  });
});

describe("Delivery (WD19, serveur)", () => {
  it("adresse enregistrée, pays du profil, nom de l'apprenant comme destinataire", async () => {
    routeApi({
      "/api/accounts/me/learner-profile/": respond(200, PROFILE),
      "/api/accounts/me/delivery-address/": respond(404),
    });
    render((await Delivery()) as ReactElement);
    expect(JSON.parse(screen.getByTestId("livraison").textContent ?? "")).toEqual({
      address: null,
      defaultCountry: "BJ",
      recipientName: "Léa Adjovi",
    });
  });

  it("sans localité ; sans session : rien", async () => {
    routeApi({
      "/api/accounts/me/learner-profile/": respond(200, { locality: null }),
      "/api/accounts/me/delivery-address/": respond(404),
    });
    render((await Delivery()) as ReactElement);
    expect(JSON.parse(screen.getByTestId("livraison").textContent ?? "").defaultCountry).toBe("");
    getCurrentUser.mockResolvedValue(null);
    expect(await Delivery()).toBeNull();
  });

  it("squelette verbalisé", () => {
    render(<DeliverySkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de ton adresse…" })).toBeInTheDocument();
  });
});

describe("ParentInfo (WD22)", () => {
  it("nom, lien de parenté, lien validé ; ni téléphone ni changement de parent (D41)", async () => {
    routeApi({ "/api/accounts/me/parent/": respond(200, PARENT) });
    const { container } = render((await ParentInfo()) as ReactElement);
    expect(screen.getByRole("heading", { level: 3, name: "Marie Adjovi" })).toBeInTheDocument();
    expect(screen.getByText("Lien de parenté : Mère · depuis le 1 septembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Lien validé")).toBeInTheDocument();
    expect(screen.getByText(/valide tes achats et tes participations aux événements/)).toBeInTheDocument();
    expect(screen.queryByText(/\+229|changement de parent|changer de parent/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("aucun parent lié : renvoi vers l'aide", async () => {
    routeApi({ "/api/accounts/me/parent/": respond(404) });
    render((await ParentInfo()) as ReactElement);
    expect(screen.getByRole("link", { name: "demande de l'aide" })).toHaveAttribute("href", "/apprenant/aide");
  });

  it("squelette verbalisé", () => {
    render(<ParentInfoSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement des informations de ton parent…" })).toBeInTheDocument();
  });
});

describe("Deletion (WD15, serveur)", () => {
  it("dernière demande, ou aucune", async () => {
    routeApi({ "/api/accounts/me/deletion-request/": respond(200, { id: 3, status: "pending_parent" }) });
    const { unmount } = render((await Deletion()) as ReactElement);
    expect(JSON.parse(screen.getByTestId("suppression").textContent ?? "")).toEqual({ id: 3, status: "pending_parent" });
    unmount();
    routeApi({ "/api/accounts/me/deletion-request/": respond(404) });
    render((await Deletion()) as ReactElement);
    expect(screen.getByTestId("suppression")).toHaveTextContent("null");
  });

  it("squelette verbalisé", () => {
    render(<DeletionSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de ta demande…" })).toBeInTheDocument();
  });
});
