import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const submitPublicForm = vi.fn();
vi.mock("@/lib/public-forms", () => ({ HONEYPOT_FIELD: "website", submitPublicForm }));

const { NewsletterForm } = await import("./NewsletterForm");

async function fill() {
  await userEvent.type(screen.getByLabelText(/Votre email/), "parent@example.com");
  await userEvent.click(screen.getByRole("checkbox", { name: /18 ans ou plus/ }));
  await userEvent.click(screen.getByRole("checkbox", { name: /recevoir la newsletter/ }));
}

describe("NewsletterForm (WL20)", () => {
  beforeEach(() => {
    submitPublicForm.mockReset();
  });

  it("cases non cochées par défaut ; consentement et majorité obligatoires", async () => {
    render(<NewsletterForm />);
    expect(screen.getByRole("checkbox", { name: /18 ans ou plus/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /recevoir la newsletter/ })).not.toBeChecked();
    await userEvent.type(screen.getByLabelText(/Votre email/), "parent@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Âge : La newsletter est réservée aux adultes.");
    expect(summary).toHaveTextContent("Consentement : Votre consentement est nécessaire.");
    expect(summary).not.toHaveTextContent("Email :");
    expect(submitPublicForm).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Votre email/)).toHaveValue("parent@example.com");
  });

  it("refuse un email invalide", async () => {
    render(<NewsletterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email : Indiquez une adresse email valide.");
  });

  it("inscrit l'adulte consentant (origine « guides », champ piège vide) et confirme", async () => {
    submitPublicForm.mockResolvedValue({ ok: true });
    render(<NewsletterForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    expect(submitPublicForm).toHaveBeenCalledWith("/api/public/leads/", {
      email: "parent@example.com",
      isAdult: true,
      newsletterConsent: true,
      source: "guides",
      website: "",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("C'est noté !");
  });

  it("VALIDATION_ERROR de l'API par champ, THROTTLED avec délai, autre erreur par son message", async () => {
    submitPublicForm.mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { email: "Adresse refusée." },
    });
    render(<NewsletterForm />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email : Adresse refusée.");

    submitPublicForm.mockResolvedValueOnce({ ok: false, code: "THROTTLED", message: "", fields: {}, retryAfter: 30 });
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans 30 secondes.");

    submitPublicForm.mockResolvedValueOnce({ ok: false, code: "SERVER_ERROR", message: "Panne.", fields: {} });
    await userEvent.click(screen.getByRole("button", { name: "Recevoir les guides" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Panne.");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <main>
        <NewsletterForm />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
