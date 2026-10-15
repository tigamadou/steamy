import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./LoginGate", () => ({ LoginGate: () => <p>formulaire</p> }));

const { default: ConnexionPage, metadata } = await import("./page");

describe("ConnexionPage (W16)", () => {
  it("affiche le titre au tutoiement sans donnée personnelle", () => {
    render(<ConnexionPage params={Promise.resolve({})} searchParams={Promise.resolve({})} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bon retour, on t'avait gardé une place !");
    expect(screen.getByText("Connecte-toi pour reprendre tes parcours.")).toBeInTheDocument();
    expect(screen.queryByText(/missions en attente/)).not.toBeInTheDocument();
    expect(metadata.title).toBe("Connexion");
  });
});
