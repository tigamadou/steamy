import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { setResumeIdentifier, takeResumeIdentifier } = await import("@/lib/auth/resume-handoff");
const { ResumeForm } = await import("./ResumeForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "") => respond(status, { error: { code, message } });

const username = () => screen.getByRole("textbox", { name: /Identifiant/ });
const code = () => screen.getByRole("textbox", { name: /Code de reprise/ });
const submit = () => userEvent.click(screen.getByRole("button", { name: "Reprendre mon inscription" }));

async function fill() {
  await userEvent.type(username(), "  awa.k ");
  await userEvent.type(code(), " ABCDEFGH ");
}

describe("ResumeForm (reprise d'inscription)", () => {
  beforeEach(() => {
    POST.mockReset();
    router.replace.mockReset();
    takeResumeIdentifier();
  });

  it("exige l'identifiant et le code sans appeler l'API", async () => {
    render(<ResumeForm />);
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique ton identifiant.");
    expect(alert).toHaveTextContent("Indique ton code de reprise.");
    expect(POST).not.toHaveBeenCalled();
  });

  it("exige seulement le champ manquant", async () => {
    render(<ResumeForm />);
    await userEvent.type(username(), "awa.k");
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique ton code de reprise.");
    expect(alert).not.toHaveTextContent("Indique ton identifiant.");
  });

  it("exige l'identifiant quand seul le code est saisi", async () => {
    render(<ResumeForm />);
    await userEvent.type(code(), "ABCDEFGH");
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique ton identifiant.");
    expect(alert).not.toHaveTextContent("Indique ton code de reprise.");
  });

  it("préremplit l'identifiant transmis par la connexion, une seule fois", () => {
    setResumeIdentifier("awa.k");
    const { unmount } = render(<ResumeForm />);
    expect(username()).toHaveValue("awa.k");
    unmount();
    render(<ResumeForm />);
    expect(username()).toHaveValue("");
  });

  it("reprend l'inscription puis ouvre l'écran de l'étape réelle", async () => {
    POST.mockResolvedValue(respond(200, { data: { step: "waiting" } }));
    render(<ResumeForm />);
    await fill();
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/attente"));
    expect(POST).toHaveBeenCalledWith("/api/auth/learner-signup/resume/", {
      body: { username: "awa.k", resumeCode: "ABCDEFGH" },
    });
  });

  it("signale un identifiant ou un code incorrect", async () => {
    POST.mockResolvedValue(failure(400, "RESUME_CODE_INVALID"));
    render(<ResumeForm />);
    await fill();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Identifiant ou code de reprise incorrect. Vérifie ce que tu as noté.",
    );
    expect(screen.queryByRole("link", { name: "Recommencer mon inscription" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("propose de recommencer une inscription expirée", async () => {
    POST.mockResolvedValue(failure(410, "SIGNUP_EXPIRED"));
    render(<ResumeForm />);
    await fill();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cette inscription a expiré : tu peux recommencer depuis le début.",
    );
    expect(screen.getByRole("link", { name: "Recommencer mon inscription" })).toHaveAttribute(
      "href",
      "/inscription/type",
    );
  });

  it("affiche toute autre erreur au tutoiement", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    render(<ResumeForm />);
    await fill();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessaie dans quelques instants.",
    );
  });

  it("ne présente aucune violation d'accessibilité, y compris en erreur", async () => {
    POST.mockResolvedValue(failure(410, "SIGNUP_EXPIRED"));
    const { container } = render(<ResumeForm />);
    expect(await axe(container)).toHaveNoViolations();
    await fill();
    await submit();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
