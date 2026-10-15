import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

let me: object = { role: "parent", profileStep: "parent-location", firstName: "Koffi" };
const gate = vi.fn();
vi.mock("../RequestGate", () => ({
  RequestGate: ({ children, ...props }: { params: unknown; children: (r: object, me: object) => ReactNode }) => {
    gate(props);
    return children({ id: 7, status: "accepted", firstName: "Awa" }, me);
  },
}));

const { default: ConsentAcceptedPage, metadata } = await import("./page");

const props = { params: Promise.resolve({ id: "7" }), searchParams: Promise.resolve({}) };

describe("ConsentAcceptedPage (WP06)", () => {
  beforeEach(() => {
    me = { role: "parent", profileStep: "parent-location", firstName: "Koffi" };
  });

  it("annonce l'acceptation et mène à la suite du profil", async () => {
    const { container } = render(<ConsentAcceptedPage {...props} />);
    expect(metadata.title).toBe("Demande acceptée");
    expect(gate).toHaveBeenLastCalledWith({ params: expect.any(Promise) });
    expect(screen.getByRole("heading", { name: "Demande acceptée !" })).toBeInTheDocument();
    expect(screen.getByText(/peut maintenant terminer son inscription\./)).toHaveTextContent(
      "Awa peut maintenant terminer son inscription.",
    );
    expect(screen.getByRole("link", { name: "Compléter mon profil" })).toHaveAttribute(
      "href",
      "/inscription/parent/profil/localisation",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("mène au tableau de bord quand le profil est complet", () => {
    me = { role: "parent", profileStep: null, firstName: "Koffi" };
    render(<ConsentAcceptedPage {...props} />);
    expect(screen.getByRole("link", { name: "Aller sur mon tableau de bord" })).toHaveAttribute("href", "/parent");
  });

  it("affiche un chargement pendant la garde", () => {
    const page = ConsentAcceptedPage(props) as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });
});
