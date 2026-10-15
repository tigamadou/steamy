import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-nunito-test" }) }));
const back = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ back, refresh: vi.fn() }),
}));

const { default: RootError } = await import("./error");
const { default: PublicError } = await import("./(public)/error");
const { default: GlobalError } = await import("./global-error");
const { default: Loading } = await import("./loading");
const { default: NotFound, metadata: notFoundMetadata } = await import("./not-found");

const error = new Error("boom");

describe("enveloppes de l'App Router", () => {
  it("error.tsx racine : WX02 au registre de l'espace, « Retour » et « Réessayer »", async () => {
    pathname = "/parent/enfants/2";
    const retry = vi.fn();
    render(<RootError error={error} retry={retry} />);
    expect(screen.getByText(/Réessayez dans un instant/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retour" }));
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(back).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("(public)/error.tsx : WX02 au tutoiement", async () => {
    back.mockClear();
    const retry = vi.fn();
    render(<PublicError error={error} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Oups, ça a coupé" })).toBeInTheDocument();
    expect(screen.getByText(/Réessaie dans un instant/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retour" }));
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(back).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("global-error.tsx : document complet en français", () => {
    const retry = vi.fn();
    const html = GlobalError({ error, retry }) as React.ReactElement<{ lang: string; className: string }>;
    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("fr");
    expect(html.props.className).toContain("font-nunito-test");
  });

  it("loading.tsx : WX03, message rassurant", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("On prépare ton contenu…");
  });

  it("not-found.tsx : 404 dans le shell public", () => {
    pathname = "/defis";
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Cette page est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(notFoundMetadata.title).toBe("Page introuvable");
  });
});
