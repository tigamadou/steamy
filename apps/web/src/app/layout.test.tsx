import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// next/font ne s'exécute qu'au build : on simule la variable CSS de la police
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-nunito-test" }) }));

const { default: RootLayout, metadata } = await import("./layout");

describe("RootLayout", () => {
  it("déclare le français et la seule police Nunito", () => {
    const html = RootLayout({ children: <p>contenu</p> } as LayoutProps<"/">) as ReactElement<{
      lang: string;
      className: string;
      children: ReactElement<{ children: ReactElement }>;
    }>;
    expect(html.props.lang).toBe("fr");
    expect(html.props.className).toContain("font-nunito-test");
    expect(html.props.className).not.toMatch(/mono/i);
    expect(isValidElement(html.props.children.props.children)).toBe(true);
  });

  it("expose les métadonnées par défaut", () => {
    expect(metadata.title).toBe("Steamy");
  });
});
