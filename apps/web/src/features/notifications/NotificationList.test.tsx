import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { notification } from "./fixtures";

const push = vi.fn();
const apiCall = vi.fn();
const notifyNotificationsChanged = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api-call", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-call")>()),
  apiCall: (request: unknown) => apiCall(request),
}));
vi.mock("@/features/shell/unread-count", () => ({
  notifyNotificationsChanged: (count?: number) => notifyNotificationsChanged(count),
}));

const { NotificationList } = await import("./NotificationList");

const UNREAD = notification({ id: 1 });
const READ = notification({
  id: 2,
  type: "welcome",
  tone: "primary",
  title: "Bienvenue sur Steamy",
  message: "",
  url: "",
  readAt: "2026-10-10T10:00:00Z",
});

let result: unknown;

/** Exécute la requête passée à `apiCall` sur un faux client, pour vérifier l'appel. */
function fakeApi() {
  const api = { POST: vi.fn(async () => ({})) };
  apiCall.mockImplementation(async (request: (a: typeof api) => Promise<unknown>) => {
    await request(api);
    return result;
  });
  return api;
}

function setup(props: Partial<Parameters<typeof NotificationList>[0]> = {}) {
  return render(
    <NotificationList tab="toutes" page={1} items={[UNREAD, READ]} unreadCount={1} hasNext={false} {...props} />,
  );
}

describe("NotificationList (WD04)", () => {
  beforeEach(() => {
    push.mockReset();
    apiCall.mockReset();
    notifyNotificationsChanged.mockReset();
  });

  it("onglets dans l'URL, compteur de non-lues, réglages, et aucune pagination sur une seule page", async () => {
    const { container } = setup();
    const tabs = screen.getByRole("navigation", { name: "Filtrer les notifications" });
    expect(within(tabs).getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Non lues (1)" })).toHaveAttribute(
      "href",
      "/apprenant/notifications?onglet=non-lues",
    );
    expect(screen.getByRole("link", { name: "Régler les notifications" })).toHaveAttribute(
      "href",
      "/apprenant/notifications/preferences",
    );
    expect(within(screen.getByRole("list", { name: "Notifications" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^Non lue :\s*Un parcours pour toi/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bienvenue sur Steamy/ })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination des notifications" })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("au clic, marque la notification lue, prévient le shell et navigue vers son url", async () => {
    const api = fakeApi();
    result = { ok: true, data: { ...UNREAD, readAt: "2026-10-16T10:00:00Z" } };
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Un parcours pour toi/ }));
    expect(api.POST).toHaveBeenCalledWith("/api/notifications/{id}/read/", { params: { path: { id: 1 } } });
    expect(notifyNotificationsChanged).toHaveBeenCalledWith(0);
    expect(push).toHaveBeenCalledWith("/apprenant/catalogue");
    expect(screen.getByRole("link", { name: "Non lues (0)" })).toBeInTheDocument();
    expect(screen.queryByText(/Non lue :/)).toBeNull();
  });

  it("une notification déjà lue sans url ne fait aucun appel ni navigation", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Bienvenue sur Steamy/ }));
    expect(apiCall).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("si la lecture échoue, reste sur la liste et affiche l'erreur", async () => {
    fakeApi();
    result = { ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} };
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Un parcours pour toi/ }));
    expect(push).not.toHaveBeenCalled();
    expect(notifyNotificationsChanged).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Le serveur est injoignable");
    const main = document.createElement("main");
    main.id = "contenu";
    main.tabIndex = -1;
    document.body.append(main);
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("status")).toBeNull();
    // Le focus, qui était sur « Fermer », passe au contenu principal
    expect(main).toHaveFocus();
    main.remove();
  });

  it("« Tout marquer comme lu » remet le compteur du shell à 0", async () => {
    const api = fakeApi();
    result = { ok: true, data: { updated: 1 } };
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    expect(api.POST).toHaveBeenCalledWith("/api/notifications/read-all/");
    expect(notifyNotificationsChanged).toHaveBeenCalledWith(0);
    expect(screen.getByRole("link", { name: "Non lues (0)" })).toBeInTheDocument();
    expect(screen.queryByText(/Non lue :/)).toBeNull();
    expect(within(screen.getByRole("list", { name: "Notifications" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Toutes tes notifications sont lues.");
    expect(screen.getByRole("button", { name: "Tout marquer comme lu" })).toBeDisabled();
  });

  it("sur l'onglet « Non lues », tout marquer comme lu vide la liste", async () => {
    fakeApi();
    result = { ok: true, data: { updated: 1 } };
    setup({ tab: "non-lues", items: [UNREAD] });
    await userEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    expect(screen.getByText("Tu as tout lu, rien de neuf.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir toutes mes notifications" })).toHaveAttribute(
      "href",
      "/apprenant/notifications",
    );
  });

  it("si « Tout marquer comme lu » échoue, le compteur ne change pas", async () => {
    fakeApi();
    result = { ok: false, code: "SERVER_ERROR", message: "", fields: {} };
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    expect(notifyNotificationsChanged).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Non lues (1)" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Une erreur est survenue de notre côté");
  });

  it("pagination : pages précédente et suivante dans l'URL, onglet conservé", () => {
    setup({ tab: "non-lues", page: 2, hasNext: true });
    const nav = screen.getByRole("navigation", { name: "Pagination des notifications" });
    expect(within(nav).getByRole("link", { name: "Précédent" })).toHaveAttribute(
      "href",
      "/apprenant/notifications?onglet=non-lues",
    );
    expect(within(nav).getByRole("link", { name: "Suivant" })).toHaveAttribute(
      "href",
      "/apprenant/notifications?onglet=non-lues&page=3",
    );
    expect(within(nav).getByText("Page 2")).toBeInTheDocument();
  });

  it("pagination : première page avec une suite", () => {
    setup({ hasNext: true });
    const nav = screen.getByRole("navigation", { name: "Pagination des notifications" });
    expect(within(nav).queryByRole("link", { name: "Précédent" })).toBeNull();
  });
});
