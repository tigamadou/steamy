import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const GET = vi.fn();
const router = { push: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RequestChoiceForm } = await import("./RequestChoiceForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const REQUEST = { id: "req-1", firstName: "Awa", lastName: "Mensah" };

const choose = (name: RegExp) => userEvent.click(screen.getByRole("radio", { name }));
const send = () => userEvent.click(screen.getByRole("button", { name: "Continuer" }));

describe("RequestChoiceForm (WP04)", () => {
  beforeEach(() => {
    GET.mockReset();
    router.push.mockReset();
  });

  it("exige une réponse", async () => {
    render(<RequestChoiceForm />);
    await send();
    expect(await screen.findByText("Choisissez une réponse pour continuer.")).toBeInTheDocument();
    expect(GET).not.toHaveBeenCalled();
  });

  it("ouvre le profil sans demande reçue", async () => {
    render(<RequestChoiceForm />);
    await choose(/^Non/);
    await send();
    expect(router.push).toHaveBeenCalledWith("/inscription/parent/profil/localisation");
    expect(GET).not.toHaveBeenCalled();
  });

  it("ouvre directement l'unique demande en attente", async () => {
    GET.mockResolvedValue(respond(200, { data: { results: [REQUEST] } }));
    render(<RequestChoiceForm />);
    await choose(/^Oui/);
    await send();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inscription/parent/demande/req-1"));
    expect(GET).toHaveBeenCalledWith("/api/accounts/consent-requests/", { params: { query: { status: "pending" } } });
  });

  it("liste plusieurs demandes en attente", async () => {
    GET.mockResolvedValue(
      respond(200, { data: { results: [REQUEST, { id: "req-2", firstName: "Kodjo", lastName: "Mensah" }] } }),
    );
    const { container } = render(<RequestChoiceForm />);
    await choose(/^Oui/);
    await send();
    expect(await screen.findByRole("heading", { name: "Demandes en attente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Awa Mensah/ })).toHaveAttribute("href", "/inscription/parent/demande/req-1");
    expect(screen.getByRole("link", { name: /Kodjo Mensah/ })).toHaveAttribute(
      "href",
      "/inscription/parent/demande/req-2",
    );
    expect(router.push).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([[{ results: [] }], [{}]])("explique l'absence de demande puis propose de continuer (%j)", async (data) => {
    GET.mockResolvedValue(respond(200, { data }));
    const { container } = render(<RequestChoiceForm />);
    await choose(/^Oui/);
    await send();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Aucune demande en attente n'est adressée à votre numéro.",
    );
    expect(screen.getByRole("link", { name: "Continuer" })).toHaveAttribute(
      "href",
      "/inscription/parent/profil/localisation",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche l'erreur de l'API au vouvoiement, effacée au changement de choix", async () => {
    GET.mockResolvedValue(respond(500));
    render(<RequestChoiceForm />);
    await choose(/^Oui/);
    await send();
    const text = "Une erreur est survenue de notre côté. Réessayez dans quelques instants.";
    expect(await screen.findByText(text)).toBeInTheDocument();
    await choose(/^Non/);
    expect(screen.queryByText(text)).toBeNull();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<RequestChoiceForm />);
    await send();
    await screen.findByText("Choisissez une réponse pour continuer.");
    expect(await axe(container)).toHaveNoViolations();
  });
});
