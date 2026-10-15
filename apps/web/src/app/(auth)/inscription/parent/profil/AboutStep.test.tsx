import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const DISABILITIES = [
  { id: 1, code: "visual", label: "Visuelle" },
  { id: 2, code: "motor", label: "Motrice" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
let disabilities: Referential;
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => disabilities }));

const { AboutStep } = await import("./AboutStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const send = () => userEvent.click(screen.getByRole("button", { name: "Suivant" }));
const disability = () => screen.getByRole("combobox", { name: /Situation de handicap/ });

describe("AboutStep (WP08)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    disabilities = { items: DISABILITIES, status: "ready", retry: vi.fn() };
  });

  it("accepte un formulaire vide et passe à WP09", async () => {
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<AboutStep />);
    await send();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/profil/enfants"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", {
      body: { gender: null, disability: null, profession: "" },
    });
  });

  it("envoie les valeurs choisies et la profession nettoyée", async () => {
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<AboutStep />);
    await userEvent.click(screen.getByRole("radio", { name: /Femme/ }));
    await userEvent.selectOptions(disability(), "motor");
    await userEvent.type(screen.getByRole("textbox", { name: /Profession/ }), "  Infirmière ");
    await send();
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body).toEqual({ gender: "female", disability: "motor", profession: "Infirmière" });
  });

  it("affiche l'échec de l'enregistrement au vouvoiement", async () => {
    PATCH.mockResolvedValue(respond(500));
    render(<AboutStep />);
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessayez dans quelques instants.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("montre le chargement du référentiel pas encore demandé", () => {
    disabilities = { items: undefined, status: "idle" };
    render(<AboutStep />);
    expect(disability()).toHaveAttribute("aria-busy", "true");
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    PATCH.mockResolvedValue(respond(500));
    const { container } = render(<AboutStep />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
