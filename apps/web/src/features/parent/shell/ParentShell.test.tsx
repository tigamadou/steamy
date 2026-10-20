import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const GET = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("./ParentShellFrame", () => ({ ParentShellFrame: () => null }));

const { ParentShell } = await import("./ParentShell");
const { ParentShellFrame } = await import("./ParentShellFrame");

type Frame = ReactElement<{ user: Record<string, unknown>; unreadCount: number; children: unknown }>;

describe("ParentShell", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    GET.mockReset();
  });

  it("passe l'utilisateur de la session et le compteur de non-lues", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Marie", lastName: "Adjovi", city: "Cotonou" });
    GET.mockResolvedValue({ data: { count: 4 } });
    const tree = (await ParentShell({ children: "page" })) as Frame;
    expect(GET).toHaveBeenCalledWith("/api/notifications/unread-count/");
    expect(tree.type).toBe(ParentShellFrame);
    expect(tree.props.user).toEqual({ firstName: "Marie", name: "Marie A.", subtitle: "Parent · Cotonou" });
    expect(tree.props.unreadCount).toBe(4);
    expect(tree.props.children).toBe("page");
  });

  it("sans ville ni compteur lisible", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Marie", lastName: "Adjovi", city: null });
    GET.mockResolvedValue({ data: undefined });
    const tree = (await ParentShell({ children: null })) as Frame;
    expect(tree.props.user.subtitle).toBe("Parent");
    expect(tree.props.unreadCount).toBe(0);
  });

  it("sans session, ne rend rien : la garde de rôle redirige", async () => {
    getCurrentUser.mockResolvedValue(null);
    GET.mockResolvedValue({ data: { count: 0 } });
    expect(await ParentShell({ children: "page" })).toBeNull();
  });
});
