import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({
    items: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }],
    status: "ready",
    retry: vi.fn(),
  }),
}));

const { GuestInfoForm } = await import("./GuestInfoForm");
const { readCheckout, updateCheckout } = await import("./checkout-storage");

beforeEach(() => router.push.mockReset());
afterEach(() => window.sessionStorage.clear());

describe("WK04 · coordonnées de l'invité", () => {
  it("champs obligatoires, numéro valide et conditions acceptées", async () => {
    render(<GuestInfoForm />);
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers la livraison" }));
    expect(await screen.findAllByText("Indiquez votre prénom.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez votre nom.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez un numéro de téléphone valide.")).not.toHaveLength(0);
    expect(screen.getAllByText("Acceptez les conditions pour continuer.")).not.toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/connexion?next=%2Fboutique%2Fpanier",
    );
    expect(screen.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute(
      "href",
      "/legal/confidentialite",
    );
  });

  it("enregistre les coordonnées dans l'onglet puis passe à la livraison", async () => {
    render(<GuestInfoForm />);
    await userEvent.type(screen.getByRole("textbox", { name: /^Prénom/ }), " Awa ");
    await userEvent.type(screen.getByRole("textbox", { name: /^Nom/ }), "Test");
    await userEvent.type(screen.getByRole("textbox", { name: /Numéro de téléphone/ }), "0190000002");
    await userEvent.click(screen.getByRole("checkbox", { name: /J'accepte/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers la livraison" }));
    expect(router.push).toHaveBeenCalledWith("/boutique/commande/livraison");
    expect(readCheckout().guest).toEqual({
      firstName: "Awa",
      lastName: "Test",
      phone: "+2290190000002",
      phoneCountry: "BJ",
      phoneNational: "0190000002",
    });
  });

  it("préremplit au retour et garde le numéro saisi auparavant", async () => {
    updateCheckout({
      guest: { firstName: "Awa", lastName: "Test", phone: "+2290190000002", phoneCountry: "BJ", phoneNational: "0190000002" },
    });
    render(<GuestInfoForm />);
    expect(screen.getByRole("textbox", { name: /^Prénom/ })).toHaveValue("Awa");
    // Les conditions sont à accepter de nouveau, jamais précochées
    const terms = screen.getByRole("checkbox", { name: /J'accepte/ });
    expect(terms).not.toBeChecked();
    await userEvent.click(terms);
    await userEvent.click(screen.getByRole("button", { name: "Continuer vers la livraison" }));
    expect(router.push).toHaveBeenCalledWith("/boutique/commande/livraison");
    expect(readCheckout().guest?.phoneNational).toBe("0190000002");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<GuestInfoForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
