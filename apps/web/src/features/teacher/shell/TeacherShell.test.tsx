import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const GET = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("./TeacherShellFrame", () => ({ TeacherShellFrame: () => null }));

const { TeacherShell } = await import("./TeacherShell");
const { TeacherShellFrame } = await import("./TeacherShellFrame");

type Frame = ReactElement<{ user: Record<string, unknown>; unreadCount: number; children: unknown }>;

describe("TeacherShell", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    GET.mockReset();
  });

  it("passe l'utilisateur de la session et le compteur de non-lues", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Koffi", lastName: "Adékambi" });
    GET.mockResolvedValue({ data: { count: 4 } });
    const tree = (await TeacherShell({ children: "page" })) as Frame;
    expect(GET).toHaveBeenCalledWith("/api/notifications/unread-count/");
    expect(tree.type).toBe(TeacherShellFrame);
    expect(tree.props.user).toEqual({ firstName: "Koffi", name: "Koffi A.", subtitle: "Enseignant" });
    expect(tree.props.unreadCount).toBe(4);
    expect(tree.props.children).toBe("page");
  });

  it("sans compteur lisible", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Koffi", lastName: "Adékambi" });
    GET.mockResolvedValue({ data: undefined });
    const tree = (await TeacherShell({ children: null })) as Frame;
    expect(tree.props.unreadCount).toBe(0);
  });

  it("sans session, ne rend rien : la garde de rôle redirige", async () => {
    getCurrentUser.mockResolvedValue(null);
    GET.mockResolvedValue({ data: { count: 0 } });
    expect(await TeacherShell({ children: "page" })).toBeNull();
  });
});
