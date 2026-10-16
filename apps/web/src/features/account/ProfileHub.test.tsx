import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const getCurrentUser = vi.fn();
const GET = vi.fn();
const flags = vi.hoisted(() => ({
  unlock: false,
  events: false,
  orders: false,
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/features", () => ({ features: flags }));

const { ProfileHub, ProfileHubSkeleton } = await import("./ProfileHub");

const ME = { firstName: "Léa", lastName: "Adjovi", username: "lea.adjovi" };
const PROFILE = {
  birthDate: "2012-03-14",
  locality: { id: 12, country: "BJ", city: "Cotonou", district: "Cocotomey", areaType: "urban" },
  schoolGrade: { id: 4, code: "4e", label: "4ᵉ" },
  email: null,
  gender: null,
  disability: null,
  goals: [],
  avatar: null,
  profileStep: null,
};

async function renderHub() {
  const tree = (await ProfileHub()) as ReactElement;
  return render(tree);
}

function row(term: string) {
  return screen.getByText(term, { selector: "dt" }).nextElementSibling;
}

describe("ProfileHub (WD13)", () => {
  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue(ME);
    GET.mockReset().mockResolvedValue({ data: PROFILE, response: new Response(null, { status: 200 }) });
    flags.orders = false;
  });

  it("affiche le profil lu dans l'API et l'identifiant en lecture seule", async () => {
    const { container } = await renderHub();
    expect(GET).toHaveBeenCalledWith("/api/accounts/me/learner-profile/");
    expect(row("Nom")).toHaveTextContent("Léa Adjovi");
    expect(row("Date de naissance")).toHaveTextContent("14 mars 2012");
    expect(row("Classe")).toHaveTextContent("4ᵉ");
    expect(row("Localité")).toHaveTextContent("Cotonou · Cocotomey");
    expect(screen.getByRole("link", { name: /^Modifier/ })).toHaveAttribute("href", "/apprenant/profil/modifier");

    const connection = screen.getByRole("region", { name: "Connexion" });
    expect(within(connection).getByText("lea.adjovi")).toBeInTheDocument();
    expect(within(connection).queryByRole("link", { name: /Identifiant/ })).not.toBeInTheDocument();
    expect(within(connection).getByRole("link", { name: /Mot de passe/ })).toHaveAttribute(
      "href",
      "/apprenant/profil/mot-de-passe",
    );
    // Ni téléphone ni moyen de paiement (D30)
    expect(screen.queryByText(/Téléphone|Mobile Money/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renvoie vers WD17, WD18, WD19, WD06, WD21, WD22, les CGU, l'aide et WD15 ; WD14 absent, jamais « Bientôt »", async () => {
    await renderHub();
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/apprenant/profil/modifier",
      "/apprenant/profil/mot-de-passe",
      "/apprenant/profil/livraison",
      "/apprenant/notifications/preferences",
      "/apprenant/profil/progression",
      "/apprenant/profil/parent",
      "/legal/cgu",
      "/apprenant/aide",
      "/apprenant/profil/suppression",
    ]);
    expect(within(screen.getByRole("region", { name: "Livraison" })).getByRole("link")).toHaveAttribute(
      "href",
      "/apprenant/profil/livraison",
    );
    expect(within(screen.getByRole("region", { name: "Mon compte" })).getByRole("link", { name: /Mon parent/ })).toHaveAttribute(
      "href",
      "/apprenant/profil/parent",
    );
    expect(within(screen.getByRole("region", { name: "Zone sensible" })).getByRole("link")).toHaveAttribute(
      "href",
      "/apprenant/profil/suppression",
    );
    expect(screen.queryByText(/Bientôt/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Mon profil",
      "Connexion",
      "Livraison",
      "Notifications",
      "Mon compte",
      "Zone sensible",
    ]);
  });

  it("drapeau `orders` ouvert : « Mes commandes » (WD14)", async () => {
    flags.orders = true;
    await renderHub();
    expect(
      within(screen.getByRole("region", { name: "Mon compte" })).getByRole("link", { name: /Mes commandes/ }),
    ).toHaveAttribute("href", "/apprenant/profil/commandes");
  });

  it("valeurs absentes : « Non renseigné »", async () => {
    getCurrentUser.mockResolvedValue({ ...ME, username: null });
    GET.mockResolvedValue({
      data: { ...PROFILE, birthDate: null, locality: { ...PROFILE.locality, district: "" }, schoolGrade: null },
      response: new Response(null, { status: 200 }),
    });
    await renderHub();
    expect(row("Date de naissance")).toHaveTextContent("Non renseigné");
    expect(row("Classe")).toHaveTextContent("Non renseigné");
    expect(row("Localité")).toHaveTextContent(/^Cotonou$/);
    expect(within(screen.getByRole("region", { name: "Connexion" })).getByText("—")).toBeInTheDocument();
  });

  it("localité absente", async () => {
    GET.mockResolvedValue({ data: { ...PROFILE, locality: null }, response: new Response(null, { status: 200 }) });
    await renderHub();
    expect(row("Localité")).toHaveTextContent("Non renseigné");
  });

  it("sans session : ne rend rien (la garde de rôle redirige)", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await ProfileHub()).toBeNull();
  });

  it("profil illisible : erreur remontée à `error.tsx`", async () => {
    GET.mockResolvedValue({ data: undefined, response: new Response(null, { status: 500 }) });
    await expect(ProfileHub()).rejects.toThrow("Profil illisible (500)");
  });
});

describe("ProfileHubSkeleton", () => {
  it("annonce le chargement", () => {
    render(<ProfileHubSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de ton profil…" })).toHaveAttribute("aria-busy", "true");
  });
});
