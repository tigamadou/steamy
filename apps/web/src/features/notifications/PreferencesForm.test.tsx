import { render, screen } from "@testing-library/react";
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
