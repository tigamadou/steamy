import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));
const submitPublicForm = vi.fn();
vi.mock("@/lib/public-forms", () => ({ HONEYPOT_FIELD: "website", submitPublicForm }));

const { QuoteForm } = await import("./QuoteForm");

const COUNTRIES = [
  { id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
];

async function fill() {
  await userEvent.type(screen.getByLabelText(/Nom de l'établissement/), "Collège Les Pépinières");
  await userEvent.type(screen.getByLabelText(/Personne à contacter/), "Awa Houngbo");
  await userEvent.type(screen.getByLabelText(/^Email/), "direction@college.bj");
  await userEvent.type(screen.getByRole("textbox", { name: /Téléphone/ }), "0197000000");
}

describe("QuoteForm (WL11)", () => {
  beforeEach(() => {
    search = new URLSearchParams();
    submitPublicForm.mockReset();
  });

  it("présélectionne l'offre de l'URL et ignore une offre inconnue", () => {
    search = new URLSearchParams("offre=ecole");
    const { unmount } = render(<QuoteForm countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Offre" })).toHaveValue("ecole");
    unmount();
    search = new URLSearchParams("offre=inconnue");
    render(<QuoteForm countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Offre" })).toHaveValue("");
  });

  it("suit l'offre choisie plus bas sur la page (URL changée sans remontage)", async () => {
    const { rerender } = render(<QuoteForm countries={COUNTRIES} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Offre" }), "classe");
    expect(screen.getByRole("combobox", { name: "Offre" })).toHaveValue("classe");
    search = new URLSearchParams("offre=reseau");
    rerender(<QuoteForm countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Offre" })).toHaveValue("reseau");
  });

  it("valide les champs obligatoires avant l'envoi, récapitulatif au focus", async () => {
    render(<QuoteForm countries={COUNTRIES} />);
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    const summary = await screen.findByRole("alert");
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent("Établissement : Indiquez le nom de l'établissement.");
    expect(summary).toHaveTextContent("Téléphone : Indiquez un numéro de téléphone valide.");
    expect(submitPublicForm).not.toHaveBeenCalled();
  });

  it("envoie la demande (téléphone en E.164, champ piège vide) et confirme en place", async () => {
    search = new URLSearchParams("offre=classe");
    submitPublicForm.mockResolvedValue({ ok: true });
    render(<QuoteForm countries={COUNTRIES} />);
    await fill();
    await userEvent.type(screen.getByLabelText(/Message/), "Trois classes de 4e.");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(submitPublicForm).toHaveBeenCalledWith("/api/public/quote-requests/", {
      schoolName: "Collège Les Pépinières",
      contactName: "Awa Houngbo",
      email: "direction@college.bj",
      phone: "+2290197000000",
      offer: "classe",
      message: "Trois classes de 4e.",
      website: "",
    });
    expect(await screen.findByRole("heading", { name: "Demande envoyée" })).toBeInTheDocument();
    expect(screen.getByText("direction@college.bj")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Envoyer une autre demande" }));
    expect(await screen.findByLabelText(/Nom de l'établissement/)).toHaveValue("");
  });

  it("affiche les erreurs par champ de l'API (`fields`)", async () => {
    submitPublicForm.mockResolvedValue({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { email: "Cette adresse est refusée." },
    });
    render(<QuoteForm countries={COUNTRIES} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email : Cette adresse est refusée.");
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
  });

  it("annonce THROTTLED avec le délai, et toute autre erreur par son message", async () => {
    submitPublicForm.mockResolvedValueOnce({ ok: false, code: "THROTTLED", message: "", fields: {}, retryAfter: 120 });
    render(<QuoteForm countries={COUNTRIES} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans 2 minutes.");

    submitPublicForm.mockResolvedValueOnce({
      ok: false,
      code: "SERVER_ERROR",
      message: "Panne du serveur.",
      fields: {},
    });
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Panne du serveur.");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <main>
        <QuoteForm countries={COUNTRIES} />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
