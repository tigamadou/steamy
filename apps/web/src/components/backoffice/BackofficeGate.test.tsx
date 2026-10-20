import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaff = vi.fn();
vi.mock("@/lib/backoffice/guard", () => ({
  requireStaff,
  backofficeLoginUrl: async (path: string) => `http://api.test/admin/login/?next=${path}`,
}));
vi.mock("@/lib/runtime-config", () => ({ publicApiUrl: () => "http://api.test" }));

const { BackofficeGate } = await import("./BackofficeGate");
const { AdminShell } = await import("./AdminShell");

type Shell = ReactElement<{ user: { name: string; groups: string }; nav: Array<{ label: string }>; loginUrl: string }>;

const me = (over = {}) => ({
  firstName: "Awa",
  lastName: "Sossou",
  email: "awa@steamy.test",
  staffGroups: ["Finance"],
  ...over,
});

describe("BackofficeGate", () => {
  beforeEach(() => requireStaff.mockReset());

  it("ouvre le shell avec l'utilisateur, sa navigation et la connexion de retour", async () => {
    requireStaff.mockResolvedValue(me());
    const tree = (await BackofficeGate({ children: "page" })) as Shell;
    expect(tree.type).toBe(AdminShell);
    expect(tree.props.user).toEqual({ name: "Awa Sossou", groups: "Finance" });
    expect(tree.props.nav.map((g) => g.label)).toEqual(["Pilotage", "Plateforme"]);
    expect(tree.props.loginUrl).toBe("http://api.test/admin/login/?next=/backoffice");
  });

  it("se rabat sur l'email puis sur « Personnel »", async () => {
    requireStaff.mockResolvedValue(me({ firstName: "", lastName: "", staffGroups: [] }));
    let tree = (await BackofficeGate({ children: null })) as Shell;
    expect(tree.props.user).toEqual({ name: "awa@steamy.test", groups: "Personnel" });
    requireStaff.mockResolvedValue(me({ firstName: "", lastName: "", email: null }));
    tree = (await BackofficeGate({ children: null })) as Shell;
    expect(tree.props.user.name).toBe("Personnel");
  });
});
