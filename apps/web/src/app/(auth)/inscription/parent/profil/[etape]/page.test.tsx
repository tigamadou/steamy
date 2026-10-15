import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const gate = vi.fn();
vi.mock("@/components/auth/ProfileGate", () => ({
  ProfileGate: ({ children, ...props }: { role: string; steps: string[]; children: (user: object) => ReactNode }) => {
    gate(props);
    return children({ role: "parent", profileStep: "parent-location", firstName: "Koffi" });
  },
}));
vi.mock("../LocationStep", () => ({ LocationStep: () => <p>Formulaire WP07</p> }));
vi.mock("../AboutStep", () => ({ AboutStep: () => <p>Formulaire WP08</p> }));
vi.mock("../ChildrenStep", () => ({ ChildrenStep: () => <p>Formulaire WP09</p> }));

const { default: ParentProfilePage, generateMetadata } = await import("./page");

const params = (etape: string) => ({ params: Promise.resolve({ etape }) }) as never;

/** Rend l'écran async placé sous `<Suspense>` (composant serveur). */
async function renderStep(etape: string) {
  const page = ParentProfilePage(params(etape)) as ReactElement<{ fallback: ReactNode; children: ReactElement }>;
  const screenElement = page.props.children as ReactElement<object, (props: object) => Promise<ReactElement>>;
  return render(await screenElement.type(screenElement.props));
}

describe("ParentProfilePage (WP07-WP09)", () => {
  it("donne le titre de l'étape, ou un titre générique pour une étape inconnue", async () => {
    expect(await generateMetadata(params("a-propos"))).toEqual({ title: "Parlez-nous de vous" });
    expect(await generateMetadata(params("inconnue"))).toEqual({ title: "Votre profil" });
  });

  it("répond 404 pour une étape inconnue", async () => {
    await expect(renderStep("inconnue")).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("affiche un chargement pendant la garde", () => {
    const page = ParentProfilePage(params("localisation")) as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement de votre profil…")).toBeInTheDocument();
  });

  it.each([
    ["localisation", "parent-location", "Où habitez-vous ?", "Profil parent 1/3", "Formulaire WP07"],
    ["a-propos", "parent-children", "Parlez-nous de vous", "Profil parent 2/3", "Formulaire WP08"],
    ["enfants", "parent-children", "Vos enfants et vos objectifs", "Profil parent 3/3", "Formulaire WP09"],
  ])("affiche l'étape %s sous la garde du profil parent", async (etape, profileStep, title, kicker, form) => {
    const { container } = await renderStep(etape);
    expect(gate).toHaveBeenLastCalledWith({ role: "parent", steps: [profileStep] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    expect(screen.getAllByText(kicker)).not.toHaveLength(0);
    expect(screen.getByText(form)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
