import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
const COUNTRIES = [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }];
const RELATIONSHIPS = [
  { id: 1, code: "mother", label: "Mère" },
  { id: 2, code: "father", label: "Père" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
const referentials: Record<string, Referential> = {};
const useReferential = vi.fn((name: string) => referentials[name]);
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));

const { ParentForm } = await import("./ParentForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "", fields?: object) =>
  respond(status, { error: { code, message, fields } });

const phone = () => screen.getByRole("textbox", { name: /Numéro de téléphone du parent/ });
const relationship = () => screen.getByRole("combobox", { name: /Lien de parenté/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Envoyer la demande au parent" }));

async function fill() {
  await userEvent.type(phone(), "0190123456");
  await userEvent.selectOptions(relationship(), "mother");
}

describe("ParentForm (W06)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    referentials.countries = { items: COUNTRIES, status: "ready" };
    referentials.relationships = { items: RELATIONSHIPS, status: "ready", retry: vi.fn() };
  });

  it("exige le numéro et le lien de parenté sans appeler l'API", async () => {
    render(<ParentForm />);
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique un numéro de téléphone valide.");
    expect(alert).toHaveTextContent("Choisis ton lien avec ce parent.");
    expect(POST).not.toHaveBeenCalled();
  });

  it("envoie la demande puis passe à l'attente du parent", async () => {
    POST.mockResolvedValue(respond(201, { data: {} }));
    render(<ParentForm />);
    await fill();
    await send();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/attente"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/", {
      body: { parentPhone: "+2290190123456", relationship: "mother" },
    });
  });

  it("explique le délai de 30 jours après un refus", async () => {
    POST.mockResolvedValue(failure(409, "CONSENT_COOLDOWN"));
    render(<ParentForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce parent a refusé une demande il y a moins de 30 jours.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche le message de l'API pour un numéro invalide", async () => {
    POST.mockResolvedValue(failure(400, "PHONE_INVALID", "Ce numéro n'est pas valide."));
    render(<ParentForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce numéro n'est pas valide.");
  });

  it("affiche l'erreur de l'API sur le numéro", async () => {
    POST.mockResolvedValueOnce(
      failure(400, "VALIDATION_ERROR", "", { parentPhone: [{ message: "Numéro refusé." }] }),
    );
    render(<ParentForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Numéro refusé.");
  });

  it("affiche l'erreur de l'API sur le lien de parenté", async () => {
    POST.mockResolvedValueOnce(
      failure(400, "VALIDATION_ERROR", "", { relationship: [{ message: "Lien inconnu." }] }),
    );
    render(<ParentForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Lien inconnu.");
  });

  it("affiche toute autre erreur au tutoiement", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    render(<ParentForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessaie dans quelques instants.",
    );
  });

  it("montre le chargement des référentiels pas encore demandés", async () => {
    referentials.countries = { items: undefined, status: "idle" };
    referentials.relationships = { items: undefined, status: "idle" };
    render(<ParentForm />);
    expect(relationship()).toBeDisabled();
    expect(relationship()).toHaveAttribute("aria-busy", "true");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisis ton lien avec ce parent.");
  });

  it("propose de recharger la liste des liens après un échec", async () => {
    const retry = vi.fn();
    referentials.relationships = { items: undefined, status: "error", retry };
    render(<ParentForm />);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<ParentForm />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
