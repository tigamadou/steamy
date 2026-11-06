import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { COUNTRY_LIST, NETWORK_LIST } from "./fixtures";
import { PaymentFilters } from "./PaymentFilters";

const props = { countries: COUNTRY_LIST, networks: NETWORK_LIST };

describe("PaymentFilters", () => {
  it("est un formulaire GET rendu par le serveur, sans filtre au départ", async () => {
    const { container } = render(<PaymentFilters filters={{ page: 1 }} {...props} />);
    const form = screen.getByRole("form", { name: "Filtres des paiements" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/backoffice/paiements");
    expect(screen.getByLabelText("Référence ou identifiant")).toHaveValue("");
    expect(screen.getByLabelText("Statut")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Filtrer" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Réinitialiser" })).toHaveAttribute("href", "/backoffice/paiements");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("préremplit les champs depuis l'URL", () => {
    render(
      <PaymentFilters
        filters={{ q: "CMD-7", status: "failed", network: "moov", country: "TG", kind: "event", from: "2026-11-01", to: "2026-11-05", page: 4 }}
        {...props}
      />,
    );
    expect(screen.getByLabelText("Référence ou identifiant")).toHaveValue("CMD-7");
    expect(screen.getByLabelText("Statut")).toHaveValue("failed");
    expect(screen.getByLabelText("Réseau")).toHaveValue("moov");
    expect(screen.getByLabelText("Pays")).toHaveValue("TG");
    expect(screen.getByLabelText("Type")).toHaveValue("event");
    expect(screen.getByLabelText("Du")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Au")).toHaveValue("2026-11-05");
  });

  it("ne reprend pas la page : le filtrage repart de la page 1", () => {
    render(<PaymentFilters filters={{ status: "failed", page: 4 }} {...props} />);
    expect(screen.getByRole("form", { name: "Filtres des paiements" }).querySelector('[name="page"]')).toBeNull();
  });

  it("liste les statuts, types, pays et réseaux (un réseau par code)", () => {
    render(<PaymentFilters filters={{ page: 1 }} {...props} />);
    const options = (label: string) => within(screen.getByLabelText(label)).getAllByRole("option").map((option) => option.textContent);
    expect(options("Statut")).toEqual(["Tous", "Initié", "En attente", "Réussi", "Échoué"]);
    expect(options("Type")).toEqual(["Tous", "Parcours", "Kit", "Événement"]);
    expect(options("Pays")).toEqual(["Tous", "Bénin", "Togo"]);
    expect(options("Réseau")).toEqual(["Tous", "MTN Mobile Money", "Moov Money"]);
  });
});
