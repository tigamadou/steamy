import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { courseDetail } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const getCourse = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourse }));
const POST = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));

const { KitCodeForm, kitCodeFailure } = await import("./KitCodeForm");
const { KitCodeSkeleton, KitCodeView } = await import("./KitCodeView");
const { UnlockedToast } = await import("./UnlockedToast");
const { default: KitCodePage } = await import("@/app/(apprenant)/apprenant/(shell)/catalogue/[slug]/kit-code/page");

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  const ok = status < 400;
  return {
    data: ok ? body : undefined,
    error: ok ? undefined : body,
    response: new Response(null, { status, headers }),
  };
}

function failure(code: string, extra: Record<string, unknown> = {}) {
  return { code, message: "Message de l'API", fields: {}, ...extra };
}

beforeEach(() => {
  push.mockReset();
  POST.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  const input = screen.getByRole("textbox", { name: /Code Kit/ });
  await user.clear(input);
  await user.type(input, code);
}

describe("KitCodeForm · WA01", () => {
  it("valide un code en minuscules sans tirets puis ouvre WC06a avec le toast", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(reply(201, { courseSlug: "robot-bluetooth", courseTitle: "Robot", created: true }));
    const { container } = render(<KitCodeForm courseSlug="robot-bluetooth" />);
    expect(screen.getByRole("heading", { level: 2, name: "Ce parcours se débloque avec ton kit" })).toBeInTheDocument();
    expect(screen.getByText("Imprimé sur la notice du kit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Commander dans la boutique" })).toHaveAttribute("href", "/boutique");
    expect(screen.getByText("Où trouver le code ?")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await typeCode(user, "ab12cd34");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(POST).toHaveBeenCalledWith("/api/payments/kit-codes/redeem/", {
      body: { code: "STEAMY-AB12-CD34", courseSlug: "robot-bluetooth" },
    });
    expect(push).toHaveBeenCalledWith("/apprenant/parcours/robot-bluetooth?debloque=1");
  });

  it("déjà inscrit (code non consommé) : WC06a sans toast", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(reply(200, { courseSlug: "robot-bluetooth", courseTitle: "Robot", created: false }));
    render(<KitCodeForm courseSlug="robot-bluetooth" />);
    await typeCode(user, "ab12cd34");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(push).toHaveBeenCalledWith("/apprenant/parcours/robot-bluetooth");
  });

  it("code vide : message sous le champ, rien n'est envoyé", async () => {
    const user = userEvent.setup();
    render(<KitCodeForm courseSlug="robot-bluetooth" />);
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(screen.getByText("Saisis le code imprimé sur la notice de ton kit.")).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });
});

describe("KitCodeForm · WA06", () => {
  it.each([
    ["KIT_CODE_INVALID", "Code Kit invalide", /n'existe pas/],
    ["KIT_CODE_ALREADY_USED", "Code déjà utilisé", /qu'une seule fois/],
    ["KIT_CODE_NOT_COMPATIBLE", "Ce code ne débloque pas ce parcours", /autre kit/],
  ])("%s : titre et message dédiés, « Réessayer » et lien vers le support", async (code, title, message) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(reply(400, failure(code)));
    render(<KitCodeForm courseSlug="robot-bluetooth" />);
    await typeCode(user, "ab12cd34");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Code Kit/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("link", { name: "Contacter le support" })).toHaveAttribute(
      "href",
      "/aide?sujet=question#contact",
    );
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("THROTTLED avec délai : envoi bloqué le temps annoncé, puis « Réessayer »", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    POST.mockResolvedValue(reply(429, failure("THROTTLED"), { "Retry-After": "2" }));
    render(<KitCodeForm courseSlug="robot-bluetooth" />);
    await typeCode(user, "ab12cd34");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(screen.getByRole("heading", { name: "Trop de tentatives" })).toBeInTheDocument();
    expect(screen.getByText("Trop de tentatives. Réessaie dans 2 secondes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer dans/ })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  });

  it("THROTTLED sans délai communiqué : message, envoi possible (le serveur reste juge)", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(reply(429, failure("THROTTLED")));
    render(<KitCodeForm courseSlug="robot-bluetooth" />);
    await typeCode(user, "ab12cd34");
    await user.click(screen.getByRole("button", { name: "Valider le code" }));
    expect(screen.getByText("Trop de tentatives. Réessaie dans quelques instants.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  });
});

describe("kitCodeFailure", () => {
  it("autres erreurs : message du champ, sinon message générique au tutoiement", () => {
    expect(
      kitCodeFailure({ ok: false, code: "NOT_FOUND", message: "Élément non trouvé.", fields: { courseSlug: "Introuvable." } }),
    ).toEqual({ title: "Le code n'a pas pu être vérifié", message: "Introuvable." });
    expect(kitCodeFailure({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} }).message).toBe(
      "Le serveur est injoignable. Vérifie ta connexion internet puis réessaie.",
    );
  });
});

describe("KitCodeView · page WA01", () => {
  it("fil d'Ariane du parcours, puis le formulaire", async () => {
    getCourse.mockResolvedValue(courseDetail({ slug: "robot-bluetooth", title: "Construis ton robot Bluetooth" }));
    render(await KitCodeView({ params: Promise.resolve({ slug: "robot-bluetooth" }) }));
    expect(getCourse).toHaveBeenCalledWith("robot-bluetooth");
    expect(screen.getByRole("link", { name: "Catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
    expect(screen.getByRole("link", { name: "Construis ton robot Bluetooth" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/robot-bluetooth",
    );
    expect(screen.getByText("Code Kit", { selector: "[aria-current]" })).toBeInTheDocument();
  });

  it("parcours inconnu → 404", async () => {
    getCourse.mockResolvedValue(null);
    await expect(KitCodeView({ params: Promise.resolve({ slug: "disparu" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("squelette et page", () => {
    render(<KitCodeSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement…" })).toBeInTheDocument();
    const page = KitCodePage({ params: Promise.resolve({ slug: "robot" }) } as never) as ReactElement<{
      children: ReactElement<{ children: ReactElement<{ params: unknown }> }>;
    }>;
    expect(page.props.children.props.children.props.params).toBeInstanceOf(Promise);
  });
});

describe("UnlockedToast", () => {
  it("annonce « Parcours débloqué », retire le paramètre de l'URL et se ferme", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/apprenant/parcours/robot?debloque=1&projet=2");
    render(<UnlockedToast />);
    expect(screen.getByRole("status")).toHaveTextContent("Parcours débloqué");
    expect(window.location.search).toBe("?projet=2");
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByText(/Parcours débloqué/)).not.toBeInTheDocument();
  });
});
