import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ForgotPasswordChoice } from "./ForgotPasswordChoice";

describe("ForgotPasswordChoice (D26)", () => {
  it("envoie le parent ou l'enseignant vers WL02", async () => {
    render(<ForgotPasswordChoice />);
    await userEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));
    const dialog = screen.getByRole("dialog", { name: "Mot de passe oublié ?" });
    expect(screen.getByRole("link", { name: "Je suis parent ou enseignant" })).toHaveAttribute(
      "href",
      "/mot-de-passe-oublie",
    );
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("renvoie l'apprenant vers son parent, au tutoiement", async () => {
    render(<ForgotPasswordChoice />);
    await userEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));
    await userEvent.click(screen.getByRole("button", { name: "Je suis apprenant" }));
    expect(screen.getByRole("dialog", { name: "Demande à ton parent" })).toHaveTextContent(
      "Demande à ton parent de réinitialiser ton mot de passe depuis son espace Steamy.",
    );
    await userEvent.click(screen.getByRole("button", { name: "J'ai compris" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));
    expect(screen.getByRole("dialog", { name: "Mot de passe oublié ?" })).toBeInTheDocument();
  });
});
