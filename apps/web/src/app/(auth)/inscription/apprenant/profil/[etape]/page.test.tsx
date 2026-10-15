import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
const me = { role: "learner", profileStep: "learner-info", firstName: "Awa" };
vi.mock("@/components/auth/ProfileGate", () => ({
  ProfileGate: ({ steps: allowed, children }: { steps: string[]; children: (user: object) => ReactNode }) => {
    steps(allowed);
    return children(me);
  },
}));
vi.mock("../InfoStep", () => ({ InfoStep: () => <p>Formulaire W11</p> }));
vi.mock("../SchoolStep", () => ({ SchoolStep: () => <p>Formulaire W12</p> }));
vi.mock("../GoalsStep", () => ({ GoalsStep: () => <p>Formulaire W13</p> }));
vi.mock("../AvatarStep", () => ({ AvatarStep: () => <p>Formulaire W14</p> }));

const { default: LearnerProfilePage, generateMetadata } = await import("./page");

const params = (etape: string) => ({ params: Promise.resolve({ etape }) }) as never;

/** Rend l'écran async placé sous `<Suspense>` (composant serveur). */
async function renderStep(etape: string) {
  const page = LearnerProfilePage(params(etape)) as ReactElement<{ fallback: ReactNode; children: ReactElement }>;
  const screenElement = page.props.children as ReactElement<object, (props: object) => Promise<ReactElement>>;
  return render(await screenElement.type(screenElement.props));
}

describe("LearnerProfilePage (W11-W14)", () => {
  it("donne le titre de l'étape, ou un titre générique pour une étape inconnue", async () => {
    expect(await generateMetadata(params("ecole"))).toEqual({ title: "Ton école" });
    expect(await generateMetadata(params("inconnue"))).toEqual({ title: "Ton profil" });
  });

  it("répond 404 pour une étape inconnue", async () => {
    await expect(renderStep("inconnue")).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("affiche un chargement pendant la garde", () => {
    const page = LearnerProfilePage(params("infos")) as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement de ton profil…")).toBeInTheDocument();
  });

  it.each([
    ["infos", "learner-info", "Parle-nous de toi", "Profil 1/4", "Formulaire W11"],
    ["ecole", "learner-school", "Ton école", "Profil 2/4", "Formulaire W12"],
    ["objectifs", "learner-goals", "Tes objectifs", "Profil 3/4", "Formulaire W13"],
  ])("affiche l'étape %s dans le shell d'inscription", async (etape, profileStep, title, kicker, form) => {
    const { container } = await renderStep(etape);
    expect(steps).toHaveBeenLastCalledWith([profileStep]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    expect(screen.getAllByText(kicker)).not.toHaveLength(0);
    expect(screen.getByText(form)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche l'avatar (W14) en plein écran", async () => {
    const { container } = await renderStep("avatar");
    expect(steps).toHaveBeenLastCalledWith(["learner-avatar"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Choisis ton avatar");
    expect(screen.getAllByText("Profil 4/4")).not.toHaveLength(0);
    expect(screen.getByText("C'est ta tête sur Steamy : tu pourras le changer plus tard.")).toBeInTheDocument();
    expect(screen.getByText("Formulaire W14")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
