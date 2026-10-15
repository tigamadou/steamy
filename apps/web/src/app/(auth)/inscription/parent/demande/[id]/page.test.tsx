import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const PARENT = { role: "parent", profileStep: null, firstName: "Koffi" };
const REQUEST = {
  id: 7,
  status: "pending",
  firstName: "Awa",
  lastName: "Koffi",
  username: "awa.k",
  age: 12,
  relationship: { id: 1, code: "mother", label: "Mère", parentLabel: "Vous êtes sa mère" },
  expiresAt: "2026-10-22T08:00:00Z",
};
let request: object = REQUEST;
const gate = vi.fn();
vi.mock("./RequestGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./RequestGate")>()),
  RequestGate: ({ children, ...props }: { params: unknown; children: (r: object, me: object) => ReactNode }) => {
    gate(props);
    return children(request, PARENT);
  },
}));
vi.mock("./AcceptForm", () => ({ AcceptForm: ({ id }: { id: number }) => <p>Actions de la demande {id}</p> }));

const { default: ConsentRequestPage, metadata } = await import("./page");

const props = { params: Promise.resolve({ id: "7" }), searchParams: Promise.resolve({}) };

describe("ConsentRequestPage (WP05)", () => {
  beforeEach(() => {
    request = REQUEST;
    redirect.mockClear();
  });

  it("présente la demande en attente avec le lien vu par le parent", async () => {
    const { container } = render(<ConsentRequestPage {...props} />);
    expect(metadata.title).toBe("Demande de votre enfant");
    expect(gate).toHaveBeenLastCalledWith({ params: expect.any(Promise) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Votre enfant a besoin de votre accord");
    expect(screen.getByRole("article", { name: "Demande de Awa Koffi" })).toBeInTheDocument();
    expect(screen.getByText("Vous êtes sa mère")).toBeInTheDocument();
    expect(screen.getByText("Demande valable jusqu'au 22 octobre 2026.")).toBeInTheDocument();
    expect(screen.getByText("Actions de la demande 7")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("se replie sur le libellé du lien sans libellé côté parent", () => {
    request = { ...REQUEST, relationship: { ...REQUEST.relationship, parentLabel: "" } };
    render(<ConsentRequestPage {...props} />);
    expect(screen.getByText("Mère")).toBeInTheDocument();
  });

  it.each([
    ["accepted", "/inscription/parent/demande/7/acceptee"],
    ["refused", "/inscription/parent/demande/7/refusee"],
  ])("renvoie une demande %s vers son écran", (status, path) => {
    request = { ...REQUEST, status };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ConsentRequestPage {...props} />)).toThrow(`redirect:${path}`);
    expect(redirect).toHaveBeenCalledWith(path);
  });

  it("signale une demande expirée qui n'est plus en attente", async () => {
    request = { ...REQUEST, status: "expired" };
    const { container } = render(<ConsentRequestPage {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cette demande n'est plus en attente");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche un chargement pendant la garde", () => {
    const page = ConsentRequestPage(props) as ReactElement<{ children: ReactElement<{ fallback: ReactNode }> }>;
    render(<>{page.props.children.props.fallback}</>);
    expect(screen.getByText("Chargement de la demande…")).toBeInTheDocument();
  });
});
