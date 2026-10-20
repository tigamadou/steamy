import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const probeShopper = vi.fn();
const requestRestockAlert = vi.fn();
vi.mock("./api", () => ({ probeShopper, requestRestockAlert }));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({
    items: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }],
    status: "ready",
    retry: vi.fn(),
  }),
}));

const { RestockAlertForm } = await import("./RestockAlertForm");

beforeEach(() => {
  probeShopper.mockReset();
  requestRestockAlert.mockReset();
});

describe("RestockAlertForm (WK11)", () => {
  it("apprenant : notification dans l'appli, jamais de champ téléphone (D30)", async () => {
    requestRestockAlert.mockResolvedValue({ ok: true, data: { ok: true } });
    render(<RestockAlertForm slug="solaire" context="learner" />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/notification dans l'appli/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Préviens-moi" }));
    expect(requestRestockAlert).toHaveBeenCalledWith("solaire", undefined);
    expect(await screen.findByRole("status")).toHaveTextContent("tu recevras une notification");
    expect(probeShopper).not.toHaveBeenCalled();
  });

  it("invité : numéro obligatoire et valide, envoyé en E.164", async () => {
    probeShopper.mockResolvedValue("guest");
    requestRestockAlert.mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "",
      fields: { phone: "Numéro refusé." },
    });
    render(<RestockAlertForm slug="solaire" context="public" />);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    const button = await screen.findByRole("button", { name: "Me prévenir" });
    await userEvent.click(button);
    expect(await screen.findByText("Saisissez un numéro de téléphone valide.")).toBeInTheDocument();
    expect(requestRestockAlert).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole("textbox", { name: /Votre numéro/ }), "0190000001");
    await userEvent.click(button);
    expect(requestRestockAlert).toHaveBeenCalledWith("solaire", "+2290190000001");
    expect(await screen.findByText("Numéro refusé.")).toBeInTheDocument();
    requestRestockAlert.mockResolvedValueOnce({ ok: true, data: { ok: true } });
    await userEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent("un SMS vous sera envoyé");
  });

  it("parent connecté : SMS sur son numéro, sans champ ; erreur de l'API", async () => {
    probeShopper.mockResolvedValue("parent");
    requestRestockAlert.mockResolvedValue({ ok: false, code: "THROTTLED", message: "", fields: {}, retryAfter: 30 });
    render(<RestockAlertForm slug="solaire" context="public" />);
    await userEvent.click(await screen.findByRole("button", { name: "Me prévenir" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(requestRestockAlert).toHaveBeenCalledWith("solaire", undefined);
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans 30 secondes");
  });

  it("démonté avant la lecture de la session : rien n'est mis à jour", async () => {
    let resolve!: (value: string) => void;
    probeShopper.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<RestockAlertForm slug="solaire" context="public" />);
    unmount();
    resolve("guest");
    await Promise.resolve();
  });
});
