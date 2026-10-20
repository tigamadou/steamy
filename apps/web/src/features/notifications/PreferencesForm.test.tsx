import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { PREFERENCES } from "./fixtures";

const apiCall = vi.fn();
vi.mock("@/lib/api-call", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-call")>()),
  apiCall: (request: unknown) => apiCall(request),
}));

const { PreferencesForm } = await import("./PreferencesForm");

let result: unknown;
const PATCH = vi.fn(async () => ({}));

describe("PreferencesForm (WD06)", () => {
  beforeEach(() => {
    PATCH.mockClear();
    apiCall.mockReset();
    apiCall.mockImplementation(async (request: (api: { PATCH: typeof PATCH }) => Promise<unknown>) => {
      await request({ PATCH });
      return result;
    });
  });

  it("canal in-app verrouillé, email rappelé, catégories de l'API ; ni SMS ni push", async () => {
    const { container } = render(<PreferencesForm initial={PREFERENCES} />);
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute("aria-current", "page");
    const inApp = screen.getByRole("switch", { name: "Dans l'application" });
    expect(inApp).toBeChecked();
    expect(inApp).toBeDisabled();
    expect(screen.getByText("lea@exemple.bj")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /^Récompenses\s*par email$/ })).not.toBeChecked();
    expect(screen.getByText("Badges débloqués, nouveau rang.")).toBeInTheDocument();
    expect(screen.queryByText(/SMS|Push/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("enregistre aussitôt une catégorie, avec la réponse de l'API", async () => {
    result = {
      ok: true,
      data: { ...PREFERENCES, categories: PREFERENCES.categories.map((c) => ({ ...c, email: true })) },
    };
    render(<PreferencesForm initial={PREFERENCES} />);
    await userEvent.click(screen.getByRole("switch", { name: /^Récompenses\s*par email$/ }));
    expect(PATCH).toHaveBeenCalledWith("/api/notifications/preferences/", {
      body: { categories: [{ category: "rewards", email: true }] },
    });
    expect(screen.getByRole("switch", { name: /^Récompenses\s*par email$/ })).toBeChecked();
    expect(screen.getByText("Préférence enregistrée.")).toBeInTheDocument();
  });

  it("un enregistrement à la fois : les interrupteurs attendent la réponse", async () => {
    let finish: (value: unknown) => void = () => {};
    apiCall.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<PreferencesForm initial={PREFERENCES} />);
    await userEvent.click(screen.getByRole("switch", { name: /^Récompenses\s*par email$/ }));
    expect(screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ })).toBeDisabled();
    await act(async () => finish({ ok: true, data: PREFERENCES }));
    expect(screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ })).toBeEnabled();
  });

  it("revient en arrière si l'enregistrement échoue", async () => {
    result = { ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} };
    render(<PreferencesForm initial={PREFERENCES} />);
    await userEvent.click(screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ }));
    expect(screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ })).toBeChecked();
    expect(screen.getByText(/Le serveur est injoignable/)).toHaveClass("text-error-700");
  });

  it("sans adresse email, les interrupteurs email sont désactivés", () => {
    render(<PreferencesForm initial={{ ...PREFERENCES, emailAddress: null }} />);
    const learning = screen.getByRole("switch", { name: /^Apprentissage\s*par email$/ });
    expect(learning).toBeDisabled();
    expect(learning).not.toBeChecked();
    expect(screen.getByText("Aucune adresse")).toBeInTheDocument();
    expect(screen.getByText(/Aucune adresse email n'est renseignée/)).toBeInTheDocument();
  });

  it("une catégorie sans description connue garde son libellé", () => {
    render(
      <PreferencesForm
        initial={{ ...PREFERENCES, categories: [{ category: "account", label: "Compte", inApp: true, email: true }] }}
      />,
    );
    expect(screen.getByRole("switch", { name: /^Compte\s*par email$/ })).toBeInTheDocument();
  });
});

describe("PreferencesForm du parent (section de WPD08)", () => {
  const PARENT = {
    emailAddress: "marie.adjovi@steamy.test",
    categories: [
      { category: "consents" as const, label: "Consentements et validations", inApp: true, email: true },
      { category: "progress" as const, label: "Progression", inApp: true, email: true },
    ],
  };

  beforeEach(() => {
    PATCH.mockClear();
    apiCall.mockReset();
    apiCall.mockImplementation(async (request: (api: { PATCH: typeof PATCH }) => Promise<unknown>) => {
      await request({ PATCH });
      return result;
    });
  });

  it("sans onglets, titres en h3, descriptions au vouvoiement", async () => {
    const { container } = render(<PreferencesForm initial={PARENT} space="parent" />);
    expect(screen.queryByRole("link", { name: "Paramètres" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Canaux" })).toBeInTheDocument();
    expect(screen.getByText(/toutes vos notifications s'affichent/)).toBeInTheDocument();
    expect(screen.getByText(/peuvent aussi vous être envoyées/)).toBeInTheDocument();
    expect(screen.getByText("Rapport hebdomadaire, badges et progression de vos enfants.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("coupe le rapport hebdomadaire par email ; erreur au vouvoiement", async () => {
    result = { ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} };
    render(<PreferencesForm initial={{ ...PARENT, emailAddress: null }} space="parent" />);
    expect(screen.getByText(/renseignée dans votre profil/)).toBeInTheDocument();
    render(<PreferencesForm initial={PARENT} space="parent" />);
    await userEvent.click(screen.getAllByRole("switch", { name: /^Progression\s*par email$/ }).at(-1)!);
    expect(PATCH).toHaveBeenCalledWith("/api/notifications/preferences/", {
      body: { categories: [{ category: "progress", email: false }] },
    });
    expect(screen.getByText(/Vérifiez votre connexion/)).toBeInTheDocument();
  });
});
