import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { STATE_MESSAGES, registerOf, type Register } from "./messages";
import { ErrorState, LoadingState, NotFoundState, OfflineState } from "./presets";
import { WXState } from "./WXState";

const REGISTERS: Register[] = ["tu", "vous", "neutre"];

describe("WXState", () => {
  it("affiche la mascotte, le titre, le corps et les actions", () => {
    const { container } = render(
      <WXState
        pose="sad"
        emoji="⚠️"
        kicker="Erreur 404"
        title="Titre"
        titleId="t"
        body="Corps"
        actions={<button>Agir</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Titre" })).toHaveAttribute("id", "t");
    expect(screen.getByText("Erreur 404")).toBeInTheDocument();
    expect(screen.getByText("Corps")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agir" })).toBeInTheDocument();
    expect(container.querySelector('[data-pose="sad"]')).toBeInTheDocument();
  });

  it("se réduit dans le flux d'une page, avec un titre de second niveau", () => {
    render(<WXState pose="sad" title="Titre" body="Corps" headingLevel={2} compact />);
    expect(screen.getByRole("heading", { level: 2, name: "Titre" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("enveloppes par registre", () => {
  it.each(REGISTERS)("WX01 hors ligne (%s) : un seul bouton, jamais « Mode hors ligne »", async (register) => {
    const onRetry = vi.fn();
    render(<OfflineState register={register} onRetry={onRetry} notice="Toujours pas de réseau." />);
    expect(screen.getByRole("heading", { name: STATE_MESSAGES.offline[register].title })).toBeInTheDocument();
    expect(screen.getByText("Toujours pas de réseau.")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText(/mode hors ligne/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each(REGISTERS)("WX02 erreur (%s) : « Retour » puis « Réessayer »", async (register) => {
    const onRetry = vi.fn();
    const onBack = vi.fn();
    render(
      <ErrorState register={register} onRetry={onRetry} onBack={onBack} detail="Le serveur est en maintenance." />,
    );
    expect(screen.getByRole("heading", { name: STATE_MESSAGES.error[register].title })).toBeInTheDocument();
    expect(screen.getByText(STATE_MESSAGES.error[register].body)).toBeInTheDocument();
    expect(screen.getByText("Le serveur est en maintenance.")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Retour", "Réessayer"]);
    await userEvent.click(screen.getByRole("button", { name: "Retour" }));
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each(REGISTERS)("WX03 chargement (%s) : message verbalisé, jamais de spinner nu", (register) => {
    render(<LoadingState register={register} />);
    expect(screen.getByRole("status")).toHaveTextContent(STATE_MESSAGES.loading[register].title);
    expect(screen.getByText(STATE_MESSAGES.loading[register].body)).toBeInTheDocument();
  });

  it.each(REGISTERS)("404 (%s) : retour à l'accueil", (register) => {
    render(<NotFoundState register={register} />);
    expect(screen.getByRole("heading", { name: STATE_MESSAGES.notFound[register].title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
  });

  it("404 aux textes et à l'action propres à un écran", () => {
    render(
      <NotFoundState
        title="Parcours introuvable"
        body="Il n'est plus publié."
        action={{ label: "Voir", href: "/parcours" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Parcours introuvable" })).toBeInTheDocument();
    expect(screen.getByText("Il n'est plus publié.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir" })).toHaveAttribute("href", "/parcours");
  });

  it("tutoie par défaut, vouvoie le parent et l'enseignant, reste neutre pour le personnel", () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByText(/Réessaie dans un instant/)).toBeInTheDocument();
    expect(STATE_MESSAGES.offline.vous.body).toMatch(/Vérifiez votre/);
    expect(
      Object.values(STATE_MESSAGES)
        .map((m) => m.neutre.body)
        .join(" "),
    ).not.toMatch(/\b(tu|ton|vous|votre)\b/i);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <>
        <ErrorState onRetry={() => {}} onBack={() => {}} />
        <LoadingState />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("registerOf", () => {
  it.each([
    ["/", "tu"],
    [null, "tu"],
    ["/apprenant/parcours", "tu"],
    ["/parent", "vous"],
    ["/parent/enfants/3", "vous"],
    ["/enseignant/classes/1", "vous"],
    ["/backoffice/impact", "neutre"],
    ["/parents-info", "tu"],
  ])("%s → %s", (pathname, register) => {
    expect(registerOf(pathname)).toBe(register);
  });
});
