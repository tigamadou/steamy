import type { Me } from "@/lib/auth/home-for-role";
import { routes } from "@/lib/routes";

/** Groupes du personnel (D71), noms des `Group` Django renvoyés par `accounts/me/` (`staffGroups`). */
export const STAFF_GROUPS = {
  superAdmin: "Super-admin",
  content: "Contenu",
  support: "Support",
  finance: "Finance",
} as const;

export type StaffGroup = (typeof STAFF_GROUPS)[keyof typeof STAFF_GROUPS];

const { superAdmin, content, support, finance } = STAFF_GROUPS;

/** Groupes autorisés par page Next.js du back-office (SPEC-ECRANS-3 §5.14). `[]` : tout le personnel. */
export const PAGE_GROUPS = {
  overview: [],
  impact: [finance, superAdmin],
} as const satisfies Record<string, readonly StaffGroup[]>;

export type StaffUser = Pick<Me, "isStaff" | "otpVerified" | "staffGroups">;

/** Membre du personnel dont la session est vérifiée par TOTP (D72) : seul admis dans le back-office. */
export function isVerifiedStaff(me: StaffUser | null): me is StaffUser {
  return !!me && me.isStaff && me.otpVerified;
}

/** Appartient à l'un des groupes demandés (liste vide : tout le personnel). */
export function hasGroup(me: Pick<Me, "staffGroups">, groups: readonly StaffGroup[]): boolean {
  return groups.length === 0 || groups.some((group) => me.staffGroups.includes(group));
}

/**
 * Connexion du personnel (WAD15, admin Django servi par l'API) avec retour vers la page demandée. L'API n'accepte
 * en `next` que les pages de `WEB_URL/backoffice` : `origin` est donc l'origine publique du front.
 */
export function adminLoginUrl(apiUrl: string, origin: string, path: string | null): string {
  const target = path?.startsWith(routes.backoffice.home) ? path : routes.backoffice.home;
  return `${adminUrl(apiUrl, "login/")}?next=${encodeURIComponent(`${origin}${target}`)}`;
}

/** Page de l'admin Django (`<API_URL>/admin/<chemin>`). */
export function adminUrl(apiUrl: string, path = ""): string {
  return `${apiUrl.replace(/\/+$/, "")}/admin/${path}`;
}

export type NavItem = {
  id: string;
  label: string;
  icon: "home" | "sparkle" | "user" | "eye" | "book" | "cart" | "phone" | "trophy" | "lock" | "gear";
  /** Chemin Next.js (Pilotage) ou chemin de l'admin Django relatif à `/admin/` (Plateforme, Système). */
  href: string;
  external?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

type NavEntry = Omit<NavItem, "href"> & { href: string; groups: readonly StaffGroup[] };

// Navigation de `WebAdminShell` (design/screens-admin-web.jsx) : Pilotage en Next.js, le reste dans l'admin Django,
// entrée affichée selon les groupes de l'utilisateur (SPEC-ECRANS-3 §5.14). L'admin Django refait le contrôle.
const NAV: Array<{ label: string; external: boolean; items: NavEntry[] }> = [
  {
    label: "Pilotage",
    external: false,
    items: [
      {
        id: "overview",
        label: "Vue d'ensemble",
        icon: "home",
        href: routes.backoffice.home,
        groups: PAGE_GROUPS.overview,
      },
      {
        id: "impact",
        label: "Impact Tracker",
        icon: "sparkle",
        href: routes.backoffice.impact,
        groups: PAGE_GROUPS.impact,
      },
    ],
  },
  {
    label: "Plateforme",
    external: true,
    items: [
      { id: "users", label: "Utilisateurs", icon: "user", href: "accounts/user/", groups: [support, superAdmin] },
      {
        id: "moderation",
        label: "Modération",
        icon: "eye",
        href: "accounts/consentrequest/",
        groups: [support, superAdmin],
      },
      { id: "content", label: "Contenu", icon: "book", href: "catalog/", groups: [content, superAdmin] },
      { id: "shop", label: "Boutique", icon: "cart", href: "shop/", groups: [content, support, superAdmin] },
      { id: "payments", label: "Paiements", icon: "phone", href: "payments/", groups: [finance, superAdmin] },
      { id: "events", label: "Steamy Events", icon: "trophy", href: "events/", groups: [content, support, superAdmin] },
    ],
  },
  {
    label: "Système",
    external: true,
    items: [
      { id: "team", label: "Équipe & rôles", icon: "lock", href: "auth/group/", groups: [superAdmin] },
      { id: "settings", label: "Paramètres", icon: "gear", href: "core/platformsettings/", groups: [superAdmin] },
    ],
  },
];

/** Navigation du shell pour cet utilisateur : groupes vides retirés, liens Django absolus. */
export function backofficeNav(me: Pick<Me, "staffGroups">, apiUrl: string): NavGroup[] {
  return NAV.map(({ label, external, items }) => ({
    label,
    items: items
      .filter((item) => hasGroup(me, item.groups))
      .map(({ id, label, icon, href }) =>
        external ? { id, label, icon, href: adminUrl(apiUrl, href), external } : { id, label, icon, href },
      ),
  })).filter((group) => group.items.length > 0);
}
