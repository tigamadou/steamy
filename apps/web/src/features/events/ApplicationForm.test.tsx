import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const push = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { ApplicationForm } = await import("./ApplicationForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const motivation = () => screen.getByRole("textbox", { name: /Pourquoi veux-tu participer/ });
const submit = () => userEvent.click(screen.getByRole("button", { name: "Envoyer ma candidature" }));

function renderForm() {
  return render(<ApplicationForm slug="atelier" notice={<p>encart du parent</p>} />);
}

describe("ApplicationForm (WD11)", () => {
  beforeEach(() => {
    POST.mockReset();
    push.mockReset();
  });

  it("envoie la motivation et l'expérience, puis revient à WD10 ; bouton occupé pendant le retour", async () => {
    POST.mockResolvedValue(respond(201, { data: { id: 1 } }));
    const { container } = renderForm();
    expect(screen.getByText("encart du parent")).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choisis ton expérience",
      "Débutant",
      "Intermédiaire",
      "Avancé",
    ]);
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.type(motivation(), "  J'adore les robots.  ");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ton expérience en robotique" }), "intermediate");
    await submit();

    expect(POST).toHaveBeenCalledWith("/api/events/{slug}/applications/", {
      params: { path: { slug: "atelier" } },
      body: { motivation: "J'adore les robots.", selfLevel: "intermediate" },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/apprenant/evenements?candidature=envoyee"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Envoyer ma candidature/ })).toBeDisabled());
  });

  it("motivation obligatoire : erreur locale, aucun envoi", async () => {
    renderForm();
    await submit();
    expect(POST).not.toHaveBeenCalled();
    expect((await screen.findAllByText("Dis-nous pourquoi tu veux participer.")).length).toBeGreaterThan(0);
    expect(motivation()).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["ALREADY_APPLIED", /Tu as déjà une candidature en cours pour cet événement/],
    ["EVENT_FULL", /Toutes les places sont prises/],
    ["EVENT_CLOSED", /La date limite de candidature est passée/],
    ["NOT_FOUND", /n'est plus proposé/],
  ])("%s : motif affiché, l'envoi laisse place à « Voir mes candidatures »", async (code, message) => {
    POST.mockResolvedValue(failure(400, code));
    renderForm();
    await userEvent.type(motivation(), "Envie");
    await submit();
    expect(await screen.findByRole("link", { name: "Voir mes candidatures" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("button", { name: "Envoyer ma candidature" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes candidatures" })).toHaveAttribute("href", "/apprenant/evenements");
    expect(push).not.toHaveBeenCalled();
  });

  it("erreurs de champ issues de `fields`", async () => {
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", { motivation: "Trop long.", selfLevel: "Choix invalide." }));
    renderForm();
    await userEvent.type(motivation(), "Envie");
    await submit();
    expect((await screen.findAllByText("Trop long.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Choix invalide.").length).toBeGreaterThan(0);
  });

  it("panne ou réseau : message générique, nouvel envoi possible", async () => {
    POST.mockRejectedValue(new TypeError("fetch failed"));
    renderForm();
    await userEvent.type(motivation(), "Envie");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Le serveur est injoignable/);
    expect(screen.getByRole("button", { name: "Envoyer ma candidature" })).toBeEnabled();
  });
});
