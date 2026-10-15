import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// next/font ne s'exécute qu'au build : on simule la variable CSS de la police
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-nunito-test" }) }));

const { default: RootLayout, metadata } = await import("./layout");
const { OfflineGate } = await import("@/components/states");

type Element = ReactElement<{ lang: string; className: string; children: unknown }>;

describe("RootLayout", () => {
  it("déclare le français et la seule police Nunito", () => {
    const html = RootLayout({ children: <p>contenu</p> } as LayoutProps<"/">) as Element;
    expect(html.props.lang).toBe("fr");
    expect(html.props.className).toContain("font-nunito-test");
    expect(html.props.className).not.toMatch(/mono/i);
  });

  it("monte WX01 (OfflineGate) sur toutes les pages", () => {
    const html = RootLayout({ children: <p>contenu</p> } as LayoutProps<"/">) as Element;
    const body = html.props.children as Element;
    const [page, gate] = body.props.children as [ReactElement, ReactElement<{ children: ReactElement }>];
    expect(page).toEqual(<p>contenu</p>);
    expect(gate.props.children.type).toBe(OfflineGate);
  });

  it("expose les métadonnées par défaut (titre, domaine canonique, Open Graph)", () => {
    expect(metadata.title).toEqual({
      default: "Steamy · Nous formons les inventeurs de demain",
      template: "%s · Steamy",
    });
    expect(metadata.metadataBase?.toString()).toBe("https://steamy.example/");
    expect(metadata.openGraph).toMatchObject({ locale: "fr_FR", siteName: "Steamy" });
  });
});
