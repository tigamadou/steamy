import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const GET = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("./LearnerShellFrame", () => ({ LearnerShellFrame: () => null }));

const { LearnerShell, shortName } = await import("./LearnerShell");
const { LearnerShellFrame } = await import("./LearnerShellFrame");

type Frame = ReactElement<{ user: Record<string, unknown>; unreadCount: number; children: unknown }>;

const ME = {
  firstName: "Léa",
  lastName: "adjovi",
  avatar: { emoji: "🦊" },
  schoolGrade: { label: "4ᵉ" },
  city: "Cotonou",
};

describe("LearnerShell", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    GET.mockReset();
  });

  it("passe le profil du shell et le compteur de non-lues", async () => {
    getCurrentUser.mockResolvedValue(ME);
    GET.mockResolvedValue({ data: { count: 3 } });
    const tree = (await LearnerShell({ children: "page" })) as Frame;
    expect(GET).toHaveBeenCalledWith("/api/notifications/unread-count/");
    expect(tree.type).toBe(LearnerShellFrame);
    expect(tree.props.user).toEqual({ firstName: "Léa", name: "Léa A.", subtitle: "4ᵉ · Cotonou", avatarEmoji: "🦊" });
    expect(tree.props.unreadCount).toBe(3);
    expect(tree.props.children).toBe("page");
  });

  it("sans classe, ville, avatar ni compteur lisible", async () => {
    getCurrentUser.mockResolvedValue({ ...ME, avatar: null, schoolGrade: null, city: null });
    GET.mockResolvedValue({ data: undefined });
    const tree = (await LearnerShell({ children: null })) as Frame;
    expect(tree.props.user).toEqual({ firstName: "Léa", name: "Léa A.", subtitle: undefined, avatarEmoji: undefined });
    expect(tree.props.unreadCount).toBe(0);
  });
});

describe("LearnerShell sans session", () => {
  it("ne rend rien : la garde de rôle redirige", async () => {
    getCurrentUser.mockResolvedValue(null);
    GET.mockResolvedValue({ data: { count: 0 } });
    expect(await LearnerShell({ children: "page" })).toBeNull();
  });
});

describe("shortName", () => {
  it("prénom et initiale du nom, ou le prénom seul", () => {
    expect(shortName("Léa", "Adjovi")).toBe("Léa A.");
    expect(shortName("Léa", " ")).toBe("Léa");
  });
});
