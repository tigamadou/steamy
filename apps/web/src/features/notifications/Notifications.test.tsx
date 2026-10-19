import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { notification, PREFERENCES } from "./fixtures";

const GET = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("./NotificationList", () => ({ NotificationList: () => null }));
vi.mock("./PreferencesForm", () => ({ PreferencesForm: () => null }));

const { Notifications, NotificationsSkeleton, parseNotificationParams, NOTIFICATIONS_PAGE_SIZE } = await import(
  "./Notifications"
);
const { NotificationList } = await import("./NotificationList");
const { Preferences, PreferencesSkeleton } = await import("./Preferences");
const { PreferencesForm } = await import("./PreferencesForm");

const respond = (status: number, data?: object) => ({ data, response: new Response(null, { status }) });

type ListElement = ReactElement<Parameters<typeof NotificationList>[0]>;

function routeApi(list: ReturnType<typeof respond>, count = respond(200, { count: 1 })) {
  GET.mockImplementation(async (path: string) => (path === "/api/notifications/" ? list : count));
}

describe("parseNotificationParams", () => {
  it("lit l'onglet et la page, valeurs invalides ramenées aux défauts", () => {
    expect(parseNotificationParams({})).toEqual({ tab: "toutes", page: 1 });
    expect(parseNotificationParams({ onglet: ["non-lues"], page: "3" })).toEqual({ tab: "non-lues", page: 3 });
    expect(parseNotificationParams({ onglet: "autre", page: "-2" })).toEqual({ tab: "toutes", page: 1 });
    expect(parseNotificationParams({ page: "1.5" })).toEqual({ tab: "toutes", page: 1 });
  });
});

describe("Notifications (WD04 / WD05)", () => {
  beforeEach(() => {
    GET.mockReset();
    redirect.mockClear();
  });

  it("passe la page de notifications et le compteur à la liste", async () => {
    routeApi(respond(200, { count: 25, next: "http://api.test/?page=2", results: [notification()] }));
    const tree = (await Notifications({ searchParams: Promise.resolve({}) })) as ListElement;
    expect(GET).toHaveBeenCalledWith("/api/notifications/", {
      params: { query: { unread: undefined, page: 1, pageSize: NOTIFICATIONS_PAGE_SIZE } },
    });
    expect(GET).toHaveBeenCalledWith("/api/notifications/unread-count/");
    expect(tree.type).toBe(NotificationList);
    expect(tree.props).toMatchObject({ tab: "toutes", page: 1, unreadCount: 1, hasNext: true });
    expect(tree.props.items).toHaveLength(1);
  });

  it("onglet « Non lues » vide : la liste affiche son repli, pas l'état vide", async () => {
    routeApi(respond(200, { count: 0, next: null }), respond(200, { count: 0 }));
    const tree = (await Notifications({ searchParams: Promise.resolve({ onglet: "non-lues", page: "2" }) })) as ListElement;
    expect(GET).toHaveBeenCalledWith("/api/notifications/", {
      params: { query: { unread: true, page: 2, pageSize: NOTIFICATIONS_PAGE_SIZE } },
    });
    expect(tree.props).toMatchObject({ tab: "non-lues", page: 2, items: [], hasNext: false });
  });

  it("WD05 : aucune notification, renvoi vers les préférences", async () => {
    routeApi(respond(200, { count: 0, results: [] }), respond(200, { count: 0 }));
    const { container } = render((await Notifications({ searchParams: Promise.resolve({}) }))!);
    expect(screen.getByRole("heading", { level: 2, name: "Tout est calme par ici" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Régler les notifications" })).toHaveAttribute(
      "href",
      "/apprenant/notifications/preferences",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("page disparue : retour à la première page de l'onglet", async () => {
    routeApi(respond(404));
    await expect(
      Notifications({ searchParams: Promise.resolve({ onglet: "non-lues", page: "4" }) }),
    ).rejects.toThrow("redirect:/apprenant/notifications?onglet=non-lues");
  });

  it("sans session, ne rend rien ; autre erreur propagée", async () => {
    routeApi(respond(401), respond(401));
    expect(await Notifications({ searchParams: Promise.resolve({}) })).toBeNull();
    routeApi(respond(200, { results: [] }), respond(403));
    expect(await Notifications({ searchParams: Promise.resolve({}) })).toBeNull();
    routeApi(respond(500));
    await expect(Notifications({ searchParams: Promise.resolve({}) })).rejects.toThrow();
  });

  it("squelette annoncé", () => {
    render(<NotificationsSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de tes notifications…" })).toBeInTheDocument();
  });
});

describe("Preferences (WD06)", () => {
  beforeEach(() => GET.mockReset());

  it("passe les préférences lues dans l'API au formulaire", async () => {
    GET.mockResolvedValue(respond(200, PREFERENCES));
    const tree = (await Preferences()) as ReactElement<{ initial: unknown }>;
    expect(GET).toHaveBeenCalledWith("/api/notifications/preferences/");
    expect(tree.type).toBe(PreferencesForm);
    expect(tree.props.initial).toEqual(PREFERENCES);
  });

  it("sans session, ne rend rien", async () => {
    GET.mockResolvedValue(respond(401));
    expect(await Preferences()).toBeNull();
  });

  it("squelette annoncé", () => {
    render(<PreferencesSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de tes préférences…" })).toBeInTheDocument();
  });
});
