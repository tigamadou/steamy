import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { REPORT, reportRow } from "@/test/impact-fixtures";

const refresh = vi.fn();
const patch = vi.fn();
const getBrowserApi = vi.fn(async () => ({ PATCH: patch }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: () => getBrowserApi() }));

const { ManualEntryForm, toField, toValue } = await import("./ManualEntryForm");
const { createApiClient } = await import("@steamy/api-client");

const MANUAL = REPORT.rows.filter((row) => row.source === "manual");
const ok = () => ({ response: new Response(null, { status: 200 }) });
const fail = (status: number, error: object) => ({ error, response: new Response(null, { status }) });

function renderForm(props = {}) {
  return render(<ManualEntryForm period="2026-t4" label="T4 2026" locked={false} rows={MANUAL} {...props} />);
}

/** Corps du dernier `PATCH …/values/`. */
const sent = () => patch.mock.lastCall?.[1].body.values;

describe("WAD05 · Saisie des indicateurs manuels", () => {
  beforeEach(() => {
    refresh.mockReset();
    patch.mockReset().mockResolvedValue(ok());
    getBrowserApi.mockClear();
  });

  it("présente les champs typés par carte, préremplis par le serveur", async () => {
    const { container } = renderForm({
      rows: [...MANUAL, reportRow({ code: "autre", label: "Indicateur nouveau", group: "nouveau" })],
    });
    expect(screen.getByRole("link", { name: "Rapport T4 2026" })).toHaveAttribute("href", "/backoffice/impact/rapports/2026-t4");
    const funding = screen.getByRole("group", { name: "Financement" });
    expect(within(funding).getByLabelText("Financements reçus (FCFA)")).toHaveValue("1951472");
    expect(within(funding).getByLabelText("Financement hors programme ?")).toHaveValue("non");
    expect(within(screen.getByRole("group", { name: "Produit & innovation" })).getByLabelText("Lesquels ?").tagName).toBe(
      "TEXTAREA",
    );
    expect(
      within(screen.getByRole("group", { name: "Satisfaction & emploi" })).getByLabelText(
        "Recommandation du programme (1-10)",
      ),
    ).toHaveValue("");
    expect(within(screen.getByRole("group", { name: "Autres indicateurs" })).getByLabelText("Indicateur nouveau")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("enregistre le brouillon avec toutes les valeurs, notes conservées", async () => {
    renderForm();
    await userEvent.clear(screen.getByLabelText("Financements reçus (FCFA)"));
    await userEvent.type(screen.getByLabelText("Financements reçus (FCFA)"), "2 000 000");
    await userEvent.selectOptions(screen.getByLabelText("Financement hors programme ?"), "oui");
    await userEvent.type(screen.getByLabelText("Lesquels ?"), "  Robot solaire ");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(patch).toHaveBeenCalledWith("/api/backoffice/impact-reports/{period}/values/", expect.objectContaining({
      params: { path: { period: "2026-t4" } },
    }));
    expect(sent()).toEqual([
      { code: "fin_montant", value: 2000000, note: "OIF" },
      { code: "fin_hors", value: true, note: "" },
      { code: "prod_which", value: "Robot solaire", note: "" },
      { code: "nps", value: null, note: "" },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Brouillon enregistré.");
    expect(refresh).toHaveBeenCalled();
  });

  it("enregistre aussi avec la touche Entrée", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Recommandation du programme (1-10)"), "8{Enter}");
    expect(sent()).toContainEqual({ code: "nps", value: 8, note: "" });
  });

  it("« Valider la saisie » signale chaque indicateur encore vide", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Valider la saisie" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Saisie enregistrée, mais 2 indicateurs restent à renseigner.");
    const nps = screen.getByLabelText("Recommandation du programme (1-10)");
    expect(nps).toHaveAttribute("aria-invalid", "true");
    expect(nps).toHaveAccessibleDescription("À renseigner avant la soumission.");

    await userEvent.type(screen.getByLabelText("Lesquels ?"), "Kit solaire");
    await userEvent.click(screen.getByRole("button", { name: "Valider la saisie" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Saisie enregistrée, mais 1 indicateur reste à renseigner.");
  });

  it("« Valider la saisie » confirme une saisie complète et renvoie vers le rapport", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Lesquels ?"), "Kit solaire");
    await userEvent.type(screen.getByLabelText("Recommandation du programme (1-10)"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Valider la saisie" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saisie validée : tous les indicateurs manuels sont renseignés.");
    expect(screen.getByRole("link", { name: "Revoir le rapport avant de le soumettre" })).toHaveAttribute(
      "href",
      "/backoffice/impact/rapports/2026-t4",
    );
  });

  it("affiche les erreurs du serveur sous les champs concernés", async () => {
    patch.mockResolvedValue(
      fail(400, {
        code: "VALIDATION_ERROR",
        message: "",
        fields: {
          values: [
            { value: [{ code: "INVALID", message: "Un montant positif." }] },
            {},
            { code: [{ code: "INVALID", message: "Indicateur inconnu." }] },
            {},
          ],
        },
      }),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText("Recommandation du programme (1-10)"), "beaucoup");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(sent()).toContainEqual({ code: "nps", value: "beaucoup", note: "" });
    expect(screen.getByRole("alert")).toHaveTextContent("Certaines valeurs sont invalides");
    expect(screen.getByLabelText("Financements reçus (FCFA)")).toHaveAccessibleDescription("Un montant positif.");
    expect(screen.getByLabelText("Lesquels ?")).toHaveAccessibleDescription("Indicateur inconnu.");
    expect(screen.getByLabelText("Financement hors programme ?")).not.toHaveAttribute("aria-invalid");
  });

  it("traite une erreur de validation sans détail par champ", async () => {
    patch.mockResolvedValue(fail(400, { code: "VALIDATION_ERROR", message: "" }));
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Certaines valeurs sont invalides");
  });

  it("passe en lecture seule si le rapport vient d'être soumis (REPORT_LOCKED)", async () => {
    patch.mockResolvedValue(fail(409, { code: "REPORT_LOCKED", message: "" }));
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ce rapport a été soumis : la saisie n'est plus modifiable.");
    expect(screen.getByText("Le rapport T4 2026 est soumis : la saisie est en lecture seule.")).toBeInTheDocument();
    expect(screen.getByLabelText("Lesquels ?")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Enregistrer le brouillon" })).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    [403, { code: "OTP_REQUIRED", message: "" }],
    [401, { code: "NOT_AUTHENTICATED", message: "" }],
  ])("relit la page si la session ne suffit plus (%s)", async (status, error) => {
    patch.mockResolvedValue(fail(status, error));
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it.each([
    ["groupe refusé", async () => fail(403, { code: "PERMISSION_DENIED", message: "" }), "Votre groupe ne peut pas saisir"],
    ["panne", async () => fail(500, { code: "SERVER_ERROR", message: "" }), "Une erreur est survenue de notre côté"],
    ["réponse vide", async () => ({ response: new Response(null, { status: 502 }) }), "Une erreur est survenue de notre côté"],
    [
      "page HTML d'un proxy (via openapi-fetch)",
      () =>
        createApiClient("http://api.test", {
          fetch: async () => new Response("<html>Bad Gateway</html>", { status: 502, headers: { "Content-Type": "text/html" } }),
        }).PATCH("/api/backoffice/impact-reports/{period}/values/", { params: { path: { period: "2026-t4" } }, body: { values: [] } }),
      "Une erreur est survenue de notre côté",
    ],
    [
      "réseau",
      async () => {
        throw new TypeError("Failed to fetch");
      },
      "Le serveur est injoignable",
    ],
  ])("affiche une erreur générale (%s)", async (_, reply, message) => {
    patch.mockImplementation(reply);
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Valider la saisie" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("passe en lecture seule quand le serveur renvoie le rapport soumis, même déjà affiché", () => {
    const { rerender } = renderForm();
    expect(screen.getByLabelText("Lesquels ?")).toBeEnabled();
    rerender(<ManualEntryForm period="2026-t4" label="T4 2026" locked rows={MANUAL} />);
    expect(screen.getByLabelText("Lesquels ?")).toBeDisabled();
  });

  it("est en lecture seule une fois le rapport soumis (D74)", () => {
    renderForm({ locked: true });
    expect(screen.getByLabelText("Financements reçus (FCFA)")).toBeDisabled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sans indicateur manuel, le dit", () => {
    renderForm({ rows: [] });
    expect(screen.getByText("Aucun indicateur à saisir pour ce trimestre.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("conversion des valeurs", () => {
  it("prépare les champs depuis le serveur", () => {
    expect(toField(null)).toBe("");
    expect(toField(true)).toBe("oui");
    expect(toField(false)).toBe("non");
    expect(toField(12.5)).toBe("12.5");
    expect(toField("OIF")).toBe("OIF");
  });

  it.each([
    ["", "count", null],
    ["  ", "text", null],
    ["oui", "yes_no", true],
    ["non", "yes_no", false],
    [" OIF ", "text", "OIF"],
    ["1 951 472", "fcfa", 1951472],
    ["8,5", "score", 8.5],
    ["douze", "count", "douze"],
  ] as const)("« %s » (%s) → %s", (text, unit, value) => {
    expect(toValue(text, unit)).toBe(value);
  });
});
