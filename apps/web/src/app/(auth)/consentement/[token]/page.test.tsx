import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { default: ConsentLinkPage, metadata } = await import("./page");

const params = (token: string) => ({ params: Promise.resolve({ token }) }) as never;

/** Rend l'écran async placé sous `<Suspense>` (composant serveur). */
async function renderPage(token: string) {
  const page = ConsentLinkPage(params(token)) as ReactElement<{ fallback: ReactNode; children: ReactElement }>;
  expect(page.props.fallback).toBeNull();
  const inner = page.props.children as ReactElement<object, (props: object) => Promise<ReactElement>>;
  return render(await inner.type(inner.props));
}

describe("ConsentLinkPage (lien SMS)", () => {
  beforeEach(() => {
    router.replace.mockReset();
    sessionStorage.clear();
  });

  it("garde le jeton dans l'onglet puis le retire de l'URL", async () => {
    const { container } = await renderPage("jeton-sms");
    expect(metadata.title).toBe("Demande de consentement");
    expect(screen.getByText("Ouverture de la demande…")).toBeInTheDocument();
    expect(sessionStorage.getItem("steamy:consentToken")).toBe(JSON.stringify("jeton-sms"));
    expect(router.replace).toHaveBeenCalledWith("/consentement");
    expect(await axe(container)).toHaveNoViolations();
  });
});
