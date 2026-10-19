import { describe, expect, it } from "vitest";

import { notificationIcon, notificationTarget } from "./notification-icon";

describe("notificationIcon", () => {
  it.each([
    [{ icon: "🎓", type: "certificate_issued", category: "rewards" }, "🎓"],
    [{ icon: "megaphone", type: "x", category: "account" }, "📣"],
    [{ icon: "", type: "kit_shipped", category: "payments" }, "📦"],
    [{ icon: "inconnue", type: "nouveau_type", category: "coaching" }, "💬"],
    [{ icon: "", type: "nouveau_type", category: "progress" }, "🔔"],
  ] as const)("%o → %s", (notification, expected) => {
    expect(notificationIcon(notification)).toBe(expected);
  });
});

describe("notificationTarget", () => {
  it("garde les chemins internes et écarte le reste", () => {
    expect(notificationTarget("/apprenant/catalogue")).toBe("/apprenant/catalogue");
    expect(notificationTarget("")).toBeNull();
    expect(notificationTarget("//exemple.com")).toBeNull();
    expect(notificationTarget("/\\exemple.com")).toBeNull();
    expect(notificationTarget("https://exemple.com")).toBeNull();
  });
});
