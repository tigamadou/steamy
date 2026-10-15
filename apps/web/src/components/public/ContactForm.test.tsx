import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));
const submitPublicForm = vi.fn();
vi.mock("@/lib/public-forms", () => ({ HONEYPOT_FIELD: "website", submitPublicForm }));

const { ContactForm, SUBJECT_LABELS } = await import("./ContactForm");

const MESSAGE = "Bonjour, j'aimerais animer des ateliers Steamy à Cotonou.";

async function fill() {
  await userEvent.type(screen.getByLabelText(/^Nom/), "Marie Adjovi");
  await userEvent.type(screen.getByLabelText(/Email ou téléphone/), "marie@example.com");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /Sujet/ }), "question");
  await userEvent.type(screen.getByLabelText(/^Message/), MESSAGE);
}

describe("ContactForm (WL24)", () => {
  beforeEach(() => {
    search = new URLSearchParams();
    submitPublicForm.mockReset();
  });

  it("propose les six sujets et présélectionne `?sujet=candidature`", () => {
    search = new URLSearchParams("sujet=candidature");
    render(<ContactForm />);
    const select = screen.getByRole("combobox", { name: /Sujet/ });
    expect(select).toHaveValue("candidature");
    expect(screen.getByText("Présélectionné depuis « Rejoindre l'équipe ».")).toBeInTheDocument();
    expect(Object.values(SUBJECT_LABELS)).toEqual([
      "Question",
      "Paiement",
      "Livraison",
      "Changement de parent",
      "Candidature",
      "Autre",
    ]);
  });

  it("ignore un sujet inconnu et suit un nouveau `?sujet=`", () => {
    search = new URLSearchParams("sujet=spam");
    const { rerender } = render(<ContactForm />);
    expect(screen.getByRole("combobox", { name: /Sujet/ })).toHaveValue("");
    search = new URLSearchParams("sujet=paiement");
    rerender(<ContactForm />);
    expect(screen.getByRole("combobox", { name: /Sujet/ })).toHaveValue("paiement");
    expect(screen.queryByText(/Présélectionné/)).not.toBeInTheDocument();
  });

  it("valide tous les champs, dont la longueur du message", async () => {
    render(<ContactForm />);
    await userEvent.type(screen.getByLabelText(/^Message/), "Bonjour");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Nom : Indiquez votre nom.");
    expect(summary).toHaveTextContent("Sujet : Choisissez un sujet.");
    expect(summary).toHaveTextContent("Message : Votre message doit contenir au moins 20 caractères.");
    expect(submitPublicForm).not.toHaveBeenCalled();
  });

  it("envoie le message et confirme en place", async () => {
    submitPublicForm.mockResolvedValue({ ok: true });
    render(<ContactForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(submitPublicForm).toHaveBeenCalledWith("/api/public/contact-messages/", {
      name: "Marie Adjovi",
      contact: "marie@example.com",
      subject: "question",
      message: MESSAGE,
      website: "",
    });
    expect(await screen.findByRole("heading", { name: "Message envoyé" })).toBeInTheDocument();
    expect(screen.getByText(/Merci Marie Adjovi/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer un autre message" }));
    expect(await screen.findByLabelText(/^Nom/)).toHaveValue("");
  });

  it("coupure réseau : message conservé et « Réessayer l'envoi »", async () => {
    submitPublicForm.mockResolvedValue({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    render(<ContactForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText(/Il est conservé ci-dessous/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message/)).toHaveValue(MESSAGE);
    expect(screen.getByRole("button", { name: "Réessayer l'envoi" })).toBeInTheDocument();
  });

  it("erreurs de l'API : par champ, THROTTLED avec délai, ou message général", async () => {
    submitPublicForm.mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "",
      fields: { contact: "Email ou numéro de téléphone invalide." },
    });
    render(<ContactForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email ou téléphone : Email ou numéro de téléphone invalide.",
    );

    submitPublicForm.mockResolvedValueOnce({ ok: false, code: "THROTTLED", message: "", fields: {} });
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants.");

    submitPublicForm.mockResolvedValueOnce({ ok: false, code: "SERVER_ERROR", message: "Panne.", fields: {} });
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Panne.");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <main>
        <ContactForm />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
