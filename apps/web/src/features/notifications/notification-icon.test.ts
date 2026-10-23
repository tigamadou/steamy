import { describe, expect, it } from "vitest";

import { notificationIcon, notificationTarget } from "./notification-icon";

describe("notificationIcon", () => {
  it.each<[{ icon: string; type: string; category: string }, string]>([
    [{ icon: "🎓", type: "certificate_issued", category: "rewards" }, "🎓"],
    [{ icon: "megaphone", type: "x", category: "account" }, "📣"],
    [{ icon: "", type: "kit_shipped", category: "payments" }, "📦"],
    [{ icon: "inconnue", type: "nouveau_type", category: "coaching" }, "💬"],
    [{ icon: "", type: "nouveau_type", category: "inconnue" }, "🔔"],
    [{ icon: "users", type: "autre", category: "progress" }, "👥"],
    [{ icon: "", type: "classroom.invitation_expired", category: "progress" }, "⌛"],
    [{ icon: "", type: "nouveau_type", category: "reviews" }, "📝"],
  ] as const)("%o → %s", (notification, expected) => {
    expect(notificationIcon(notification as never)).toBe(expected);
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
