import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";
import { ConsentRequestScreen, ConsentRequestSkeleton } from "@/features/parent/consent/ConsentRequestScreen";
import { ParentHome, ParentHomeSkeleton } from "@/features/parent/home/ParentHome";
import { PaymentRequestScreen, PaymentRequestSkeleton } from "@/features/parent/payment-request/PaymentRequestScreen";
import { ChildDetail, ChildDetailSkeleton } from "@/features/parent/children/ChildDetail";
import { ChildForm } from "@/features/parent/children/ChildForm";
import { ChildrenList, ChildrenListSkeleton } from "@/features/parent/children/ChildrenList";
import { EditChild, EditChildSkeleton } from "@/features/parent/children/EditChild";
import { ParentSettings, ParentSettingsSkeleton } from "@/features/parent/settings/ParentSettings";
import { ParentShell } from "@/features/parent/shell/ParentShell";
import { axe } from "@/test/axe";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));
vi.mock("@/features/parent/shell/ParentShell", () => ({ ParentShell: () => null }));
vi.mock("@/features/parent/home/ParentHome", () => ({ ParentHome: () => null, ParentHomeSkeleton: () => null }));
vi.mock("@/features/parent/payment-request/PaymentRequestScreen", () => ({
  PaymentRequestScreen: () => null,
  PaymentRequestSkeleton: () => null,
}));
vi.mock("@/features/parent/children/ChildrenList", () => ({ ChildrenList: () => null, ChildrenListSkeleton: () => null }));
vi.mock("@/features/parent/children/ChildDetail", () => ({ ChildDetail: () => null, ChildDetailSkeleton: () => null }));
vi.mock("@/features/parent/children/EditChild", () => ({ EditChild: () => null, EditChildSkeleton: () => null }));
vi.mock("@/features/parent/children/ChildForm", () => ({ ChildForm: () => null }));
vi.mock("@/features/parent/consent/ConsentRequestScreen", () => ({
  ConsentRequestScreen: () => null,
  ConsentRequestSkeleton: () => null,
}));
vi.mock("@/features/parent/settings/ParentSettings", () => ({
  ParentSettings: () => null,
  ParentSettingsSkeleton: () => null,
}));
vi.mock("@/features/parent/orders/ParentOrders", () => ({ ParentOrders: () => null, ParentOrdersSkeleton: () => null }));
vi.mock("@/features/parent/orders/OrderDetail", () => ({ OrderDetail: () => null, OrderDetailSkeleton: () => null }));
vi.mock("@/features/parent/shop/ParentKitCheckoutScreen", () => ({
  ParentKitCheckoutScreen: () => null,
  ParentKitCheckoutSkeleton: () => null,
}));
vi.mock("@/components/public/shop-sections", () => ({ ShopCatalog: () => null, ShopCatalogSkeleton: () => null }));
vi.mock("@/features/shop/KitDetailView", () => ({ KitDetailView: () => null, KitDetailSkeleton: () => null }));
vi.mock("@/features/shop/CartView", () => ({ CartView: () => null }));
vi.mock("@/features/shop/DeliveryZonesSlot", () => ({ DeliveryZonesSlot: () => null }));
vi.mock("@/lib/shop", () => ({ getKit: async (slug: string) => (slug === "bot" ? { name: "Steamy Bot v1" } : null) }));
vi.mock("@/features/parent/deletion/DeleteChild", () => ({ DeleteChild: () => null, DeleteChildSkeleton: () => null }));
vi.mock("@/features/parent/events/ParentEventsHome", () => ({
  ParentEventsHome: () => null,
  ParentEventsHomeSkeleton: () => null,
}));
vi.mock("@/features/parent/events/ParentEventView", () => ({ ParentEventView: () => null }));
vi.mock("@/features/parent/events/EventSignup", () => ({ EventSignup: () => null, EventSignupSkeleton: () => null }));
vi.mock("@/features/parent/report/WeeklyReport", () => ({ WeeklyReport: () => null, WeeklyReportSkeleton: () => null }));
vi.mock("@/features/notifications/Notifications", () => ({
  Notifications: () => null,
  NotificationsSkeleton: () => null,
}));

const { default: Layout } = await import("./layout");
const { default: DeleteChildPage } = await import("./enfants/[id]/supprimer/page");
const { DeleteChild, DeleteChildSkeleton } = await import("@/features/parent/deletion/DeleteChild");
const { default: EventsPage } = await import("./evenements/page");
const { default: EventPage } = await import("./evenements/[slug]/page");
const { default: EventSignupPage } = await import("./evenements/[slug]/inscription/page");
const { default: EventNotFound } = await import("./evenements/[slug]/not-found");
const { ParentEventsHome, ParentEventsHomeSkeleton } = await import("@/features/parent/events/ParentEventsHome");
const { ParentEventView } = await import("@/features/parent/events/ParentEventView");
const { EventSignup, EventSignupSkeleton } = await import("@/features/parent/events/EventSignup");
const { EventDetailSkeleton } = await import("@/components/public/events");
const { default: WeeklyReportPage } = await import("./enfants/[id]/rapport/page");
const { WeeklyReport, WeeklyReportSkeleton } = await import("@/features/parent/report/WeeklyReport");
const { default: HomePage } = await import("./page");
const { default: ParentLoading } = await import("./loading");
const { default: ParentError } = await import("./error");
const { default: ParentNotFound } = await import("./not-found");
const { default: NotificationsPage } = await import("./notifications/page");
const { default: PaymentRequestPage } = await import("./demandes/[id]/page");
const { default: OrdersPage } = await import("./commandes/page");
const { default: OrderPage } = await import("./commandes/[reference]/page");
const { default: OrderNotFound } = await import("./commandes/[reference]/not-found");
const ShopPage = await import("./boutique/page");
const KitPage = await import("./boutique/[slug]/page");
const { default: KitNotFound } = await import("./boutique/[slug]/not-found");
const { default: CartPage } = await import("./boutique/panier/page");
const { default: CheckoutPage } = await import("./boutique/commande/page");
const { ParentOrders, ParentOrdersSkeleton } = await import("@/features/parent/orders/ParentOrders");
const { OrderDetail, OrderDetailSkeleton } = await import("@/features/parent/orders/OrderDetail");
const { ParentKitCheckoutScreen, ParentKitCheckoutSkeleton } = await import("@/features/parent/shop/ParentKitCheckoutScreen");
const { CartView } = await import("@/features/shop/CartView");
const { default: PaymentRequestNotFound } = await import("./demandes/[id]/not-found");
const { default: ChildrenPage } = await import("./enfants/page");
const { default: AddChildPage } = await import("./enfants/ajouter/page");
const { default: ChildPage } = await import("./enfants/[id]/page");
const { default: EditChildPage } = await import("./enfants/[id]/modifier/page");
const { default: ChildNotFound } = await import("./enfants/[id]/not-found");
const { default: ConsentPage, metadata: consentMetadata } = await import("./consentements/[id]/page");
const { default: ConsentNotFound } = await import("./consentements/[id]/not-found");
const { default: SettingsPage } = await import("./parametres/page");
const { default: HelpPage } = await import("./aide/page");

type Boundary = ReactElement<{
  fallback: ReactElement<{ label?: string; space?: string; navCount?: number }>;
  children: ReactElement<{ children?: unknown; space?: string; searchParams?: unknown; params?: unknown }>;
}>;

describe("layout du shell parent", () => {
  it("rend le shell sous Suspense, avec son squelette au vouvoiement", () => {
    const tree = Layout({ children: "page" } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(AppShellSkeleton);
    expect(tree.props.fallback.props).toMatchObject({ label: "Chargement de votre espace…", navCount: 6 });
    expect(tree.props.children.type).toBe(ParentShell);
    expect(tree.props.children.props.children).toBe("page");
  });
});

describe("pages de l'espace parent", () => {
  it("WPD01 : accueil sous Suspense, avec son squelette et la confirmation lue dans l'URL", () => {
    const searchParams = Promise.resolve({ consentement: "9" });
    const tree = HomePage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(ParentHomeSkeleton);
    expect(tree.props.children.type).toBe(ParentHome);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });

  it("WPD05 : demande de consentement sous Suspense, avec son squelette", () => {
    const params = Promise.resolve({ id: "9" });
    const tree = ConsentPage({ params } as never) as Boundary;
    expect(consentMetadata.title).toBe("Demande de consentement");
    expect(tree.props.fallback.type).toBe(ConsentRequestSkeleton);
    expect(tree.props.children.type).toBe(ConsentRequestScreen);
    expect(tree.props.children.props.params).toBe(params);
  });

  it("WPD14 : notifications de l'espace parent", () => {
    const searchParams = Promise.resolve({});
    const tree = NotificationsPage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(NotificationsSkeleton);
    expect(tree.props.fallback.props.space).toBe("parent");
    expect(tree.props.children.type).toBe(Notifications);
    expect(tree.props.children.props).toMatchObject({ space: "parent", searchParams });
  });
});

describe("commandes et boutique du parent (4.5)", () => {
  it("WPD07, suivi et commande d'un achat direct sous Suspense", () => {
    const searchParams = Promise.resolve({});
    const params = Promise.resolve({ reference: "CMD-1" });
    const orders = OrdersPage({ searchParams } as never) as Boundary;
    expect(orders.props.fallback.type).toBe(ParentOrdersSkeleton);
    expect(orders.props.children.type).toBe(ParentOrders);
    const detail = OrderPage({ params } as never) as Boundary;
    expect(detail.props.fallback.type).toBe(OrderDetailSkeleton);
    expect(detail.props.children.type).toBe(OrderDetail);
    const checkout = CheckoutPage() as Boundary;
    expect(checkout.props.fallback.type).toBe(ParentKitCheckoutSkeleton);
    expect(checkout.props.children.type).toBe(ParentKitCheckoutScreen);
  });

  it("boutique, fiche et panier en contexte parent", async () => {
    render(ShopPage.default({ searchParams: Promise.resolve({}) } as never));
    expect(screen.getByRole("link", { name: "Mon panier" })).toHaveAttribute("href", "/parent/boutique/panier");
    expect(KitPage.default({ params: Promise.resolve({ slug: "bot" }) } as never)).toBeTruthy();
    expect(await KitPage.generateMetadata({ params: Promise.resolve({ slug: "bot" }) } as never)).toEqual({
      title: "Steamy Bot v1",
    });
    expect(await KitPage.generateMetadata({ params: Promise.resolve({ slug: "x" }) } as never)).toEqual({
      title: "Kit introuvable",
    });
    const cart = CartPage() as ReactElement<{ context: string }>;
    expect(cart.type).toBe(CartView);
    expect(cart.props.context).toBe("parent");
  });

  it("commande et kit introuvables au vouvoiement", () => {
    render(<OrderNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Commande introuvable" })).toBeInTheDocument();
    render(<KitNotFound />);
    expect(screen.getByRole("link", { name: "Retour à la boutique" })).toHaveAttribute("href", "/parent/boutique");
  });
});

describe("WPD15", () => {
  it("demande de paiement sous Suspense, avec son squelette", () => {
    const params = Promise.resolve({ id: "12" });
    const tree = PaymentRequestPage({ params } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(PaymentRequestSkeleton);
    expect(tree.props.children.type).toBe(PaymentRequestScreen);
    expect(tree.props.children.props).toMatchObject({ params });
  });

  it("« Demande introuvable » sans distinguer « interdit »", () => {
    render(<PaymentRequestNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes demandes à valider" })).toHaveAttribute("href", "/parent");
  });
});

describe("pages des enfants (4.2)", () => {
  it("WPD02 : liste sous Suspense, avec son squelette", () => {
    const searchParams = Promise.resolve({ annulation: "7" });
    const tree = ChildrenPage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(ChildrenListSkeleton);
    expect(tree.props.children.type).toBe(ChildrenList);
    expect(tree.props.children.props).toMatchObject({ searchParams });
  });

  it("WPD04 : fil d'Ariane et formulaire de création", () => {
    render(AddChildPage());
    expect(screen.getByRole("link", { name: "Mes enfants" })).toHaveAttribute("href", "/parent/enfants");
    expect(screen.getByText("Ajouter un enfant")).toHaveAttribute("aria-current", "page");
    expect((AddChildPage() as ReactElement<{ children: ReactElement[] }>).props.children[1].type).toBe(ChildForm);
  });

  it("WPD03 et WPD10 : détail et modification sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ id: "7" });
    const searchParams = Promise.resolve({});
    const detail = ChildPage({ params, searchParams } as never) as Boundary;
    expect(detail.props.fallback.type).toBe(ChildDetailSkeleton);
    expect(detail.props.children.type).toBe(ChildDetail);
    expect(detail.props.children.props).toMatchObject({ params, searchParams });
    const edit = EditChildPage({ params } as never) as Boundary;
    expect(edit.props.fallback.type).toBe(EditChildSkeleton);
    expect(edit.props.children.type).toBe(EditChild);
    expect(edit.props.children.props).toMatchObject({ params });
  });

  it("enfant introuvable : h2 et retour à « Mes enfants »", () => {
    render(<ChildNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cet enfant est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes enfants" })).toHaveAttribute("href", "/parent/enfants");
  });
});

describe("WPD08 et WPD13", () => {
  it("WPD08 : paramètres sous Suspense, avec leur squelette", () => {
    const tree = SettingsPage() as Boundary;
    expect(tree.props.fallback.type).toBe(ParentSettingsSkeleton);
    expect(tree.props.children.type).toBe(ParentSettings);
  });

  it("WPD13 : FAQ du parent avec recherche locale et « Contacter le support » vers WL24", async () => {
    const user = userEvent.setup();
    const { container } = render(<HelpPage />);
    expect(screen.getByRole("heading", { level: 2, name: "Questions fréquentes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacter le support" })).toHaveAttribute("href", "/aide#contact");
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByRole("searchbox", { name: "Rechercher une question" }), "zzzz");
    expect(screen.getByText(/Aucune question ne correspond/)).toBeInTheDocument();
  });
});

describe("états de l'espace parent", () => {
  it("chargement au vouvoiement", () => {
    render(<ParentLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/votre|vous/i);
  });

  it("erreur : réessayer ou revenir, sous le h1 du shell", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ParentError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Retour/ }));
    expect(back).toHaveBeenCalled();
  });

  it("WPD05 introuvable : « Demande introuvable », sans divulguer le numéro destinataire", async () => {
    const { container } = render(<ConsentNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("introuvable : h2 et retour à l'accueil du parent", () => {
    render(<ParentNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cette page est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
  });
});

describe("WPD09 (4.7)", () => {
  it("suppression du compte d'un enfant sous Suspense, paramètres et demande transmis", () => {
    const params = Promise.resolve({ id: "7" });
    const searchParams = Promise.resolve({ demande: "9" });
    const tree = DeleteChildPage({ params, searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(DeleteChildSkeleton);
    expect(tree.props.children.type).toBe(DeleteChild);
  });
});

describe("pages des événements (4.6)", () => {
  it("WPD06 : événements et candidatures sous Suspense, candidature mise en avant lue dans l'URL", () => {
    const searchParams = Promise.resolve({ candidature: "4" });
    const tree = EventsPage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(ParentEventsHomeSkeleton);
    expect(tree.props.children.type).toBe(ParentEventsHome);
    expect(tree.props.children.props).toMatchObject({ searchParams });
  });

  it("WL23 et WPD12 : fiche et inscription sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ slug: "defi-robots" });
    const detail = EventPage({ params } as never) as Boundary;
    expect(detail.props.fallback.type).toBe(EventDetailSkeleton);
    expect(detail.props.children.type).toBe(ParentEventView);
    expect(detail.props.children.props).toMatchObject({ params });
    const signup = EventSignupPage({ params } as never) as Boundary;
    expect(signup.props.fallback.type).toBe(EventSignupSkeleton);
    expect(signup.props.children.type).toBe(EventSignup);
    expect(signup.props.children.props).toMatchObject({ params });
  });

  it("événement introuvable : h2 et retour aux événements", () => {
    render(<EventNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cet événement est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/parent/evenements");
  });
});

describe("WPD11 (4.8)", () => {
  it("rapport hebdomadaire sous Suspense, enfant et semaine transmis", () => {
    const params = Promise.resolve({ id: "7" });
    const searchParams = Promise.resolve({ semaine: "2026-W42" });
    const tree = WeeklyReportPage({ params, searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(WeeklyReportSkeleton);
    expect(tree.props.children.type).toBe(WeeklyReport);
    expect(tree.props.children.props).toMatchObject({ params, searchParams });
  });
});
