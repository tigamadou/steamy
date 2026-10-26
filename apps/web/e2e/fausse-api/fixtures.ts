import type { Schemas } from "@steamy/api-client";

// Données de la fausse API (docs/tests/FIXTURES-FAUSSE-API.md). Chaque objet est typé par le contrat OpenAPI
// (`Schemas`) : un champ ajouté, retiré ou renommé dans `apps/api/openapi.yaml` fait échouer `pnpm typecheck`, et le test
// Vitest `fixtures.test.ts` les valide en plus contre le schéma JSON du contrat.
// Les montants viennent d'ici, comme ils viennent de l'API : le front n'en calcule aucun.

export const NOW = "2026-10-20T09:00:00+01:00";
export const REQUEST_ID = 501;
export const COURSE_SLUG = "capteurs-electroniques";
export const KIT_SLUG = "pack-electronique";

export const PARENT_ID = 11;
export const CHILD_ID = 21;

const AT = (iso: string) => new Date(iso).toISOString();
export const CREATED_AT = AT("2026-10-20T09:00:00+01:00");
export const EXPIRES_AT = AT("2026-10-27T09:00:00+01:00");
export const DECIDED_AT = AT("2026-10-21T14:30:00+01:00");

export const COUNTRIES: Schemas["Country"][] = [
  { id: 1, code: "BJ", label: "Bénin", flag: "🇧🇯", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
  { id: 2, code: "TG", label: "Togo", flag: "🇹🇬", dialCode: "228", phoneFormat: "XX XX XX XX", phoneRegex: "^[0-9]{8}$" },
  { id: 3, code: "CI", label: "Côte d'Ivoire", flag: "🇨🇮", dialCode: "225", phoneFormat: "XX XX XX XX XX", phoneRegex: "^[0-9]{10}$" },
];

export const NETWORKS: Schemas["PaymentNetwork"][] = [
  { id: 1, code: "mtn", label: "MTN Mobile Money", country: "BJ" },
  { id: 2, code: "moov", label: "Moov Money", country: "BJ" },
  { id: 3, code: "tmoney", label: "T-Money", country: "TG" },
  { id: 4, code: "flooz", label: "Flooz", country: "TG" },
];

export const ZONES: Schemas["DeliveryZone"][] = [
  { id: 1, country: "BJ", name: "Cotonou et Calavi", fee: 2000, delayLabel: "2 à 3 jours" },
  { id: 2, country: "BJ", name: "Porto-Novo", fee: 3000, delayLabel: "3 à 5 jours" },
  { id: 3, country: "TG", name: "Lomé", fee: 3500, delayLabel: "4 à 6 jours" },
];

const COTONOU: Schemas["Locality"] = { id: 1, country: "BJ", city: "Cotonou", district: "Akpakpa", areaType: "urban" };

export const PARENT_ME: Schemas["Me"] = {
  id: PARENT_ID,
  role: "parent",
  status: "active",
  username: null,
  phone: "+22901970000999",
  email: null,
  firstName: "Marie",
  lastName: "Adjovi",
  profileStep: null,
  avatar: null,
  schoolGrade: null,
  city: "Cotonou",
  isStaff: false,
  otpVerified: false,
  staffGroups: [],
  counters: null,
};

export const LEARNER_ME: Schemas["Me"] = {
  ...PARENT_ME,
  id: CHILD_ID,
  role: "learner",
  firstName: "Léa",
  username: "lea.adjovi",
  phone: null,
};

export const PARENT_PROFILE: Schemas["ParentProfile"] = {
  locality: COTONOU,
  email: null,
  gender: "female",
  disability: null,
  profession: "Pharmacienne",
  childrenToEnroll: 2,
  goalsForChildren: [],
  mobileMoney: null,
  profileStep: null,
};

export const MOBILE_MONEY: Schemas["MobileMoney"] = { country: "BJ", network: "mtn", phone: "0197000001" };

export const SAVED_ADDRESS: Schemas["DeliveryAddress"] = {
  zoneId: 1,
  zone: ZONES[0],
  recipientName: "Marie Adjovi",
  phone: "+22901970000999",
  city: "Cotonou",
  district: "Fidjrossè",
  addressLine: "Rue 12, villa verte",
};

export const CHILD: Schemas["ChildDetail"] = {
  id: CHILD_ID,
  firstName: "Léa",
  lastName: "Adjovi",
  username: "lea.adjovi",
  status: "active",
  age: 13,
  relationship: { id: 1, code: "mother", label: "Mère", parentLabel: "Ma fille" },
  avatar: { id: 1, code: "fox", label: "Renard", emoji: "🦊", color: "#F97316" },
  schoolGrade: { id: 4, code: "4e", label: "4ᵉ" },
  points: 120,
  streakDays: 5,
  rank: "Explorateur",
  profileStep: null,
  createdAt: CREATED_AT,
  deletion: null,
  activeCourses: 1,
  courses: [],
  recentAttempts: [],
  badges: 2,
  birthDate: "2013-04-02",
  gender: "female",
  disability: null,
  locality: COTONOU,
  goals: [],
  publicDisplayAllowed: true,
};

export const COURSE: Schemas["CourseDetail"] = {
  slug: COURSE_SLUG,
  title: "Capteurs électroniques",
  category: { slug: "electronique", label: "Électronique", color: "#2563EB", icon: "cpu" },
  difficulty: "beginner",
  isFree: false,
  price: 15000,
  emoji: "📡",
  requiredKit: null,
  coverImage: null,
  durationHours: 12,
  featured: false,
  description: "Mesurer la lumière, la distance et la température avec des capteurs.",
  missionCount: 6,
  projects: [],
};

export const COURSE_WITH_KIT: Schemas["CourseDetail"] = {
  ...COURSE,
  requiredKit: { slug: KIT_SLUG, name: "Pack Électronique" },
};

export type TaxRates = { vat: number | null; aib: number | null };
/** TVA 18 % et AIB 1 %, hors livraison, comme les réglages de la plateforme du jeu de démonstration. */
export const DEFAULT_RATES: TaxRates = { vat: 18, aib: 1 };

/** Lignes de taxes d'une base HT : fixture, même règle que l'API (arrondi au franc, une fois par taxe). */
export function taxLines(goods: number, rates: TaxRates = DEFAULT_RATES): Schemas["TaxLine"][] {
  const lines: Schemas["TaxLine"][] = [];
  if (rates.vat !== null) lines.push({ code: "vat", rate: String(rates.vat), base: goods, amount: Math.round((goods * rates.vat) / 100) });
  if (rates.aib !== null) lines.push({ code: "aib", rate: String(rates.aib), base: goods, amount: Math.round((goods * rates.aib) / 100) });
  return lines;
}

const sum = (lines: Schemas["TaxLine"][]) => lines.reduce((total, line) => total + line.amount, 0);

export function courseRequest(
  overrides: Partial<Schemas["PaymentRequest"]> = {},
  rates: TaxRates = DEFAULT_RATES,
): Schemas["PaymentRequest"] {
  const taxes = taxLines(15000, rates);
  return {
    id: REQUEST_ID,
    kind: "course",
    status: "pending",
    course: { slug: COURSE_SLUG, title: COURSE.title },
    items: [],
    amount: 15000,
    taxes,
    total: 15000 + sum(taxes),
    learner: { id: CHILD_ID, firstName: "Léa" },
    parentFirstName: "Marie",
    createdAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    lastSentAt: CREATED_AT,
    nextResendAt: null,
    decidedAt: null,
    declineReason: "",
    orderReference: null,
    pendingOrderReference: null,
    ...overrides,
  };
}

export function kitRequest(
  overrides: Partial<Schemas["PaymentRequest"]> = {},
  rates: TaxRates = DEFAULT_RATES,
): Schemas["PaymentRequest"] {
  const taxes = taxLines(22000, rates);
  return courseRequest(
    {
      kind: "kit",
      course: null,
      items: [{ kitSlug: KIT_SLUG, title: "Pack Électronique", unitPrice: 22000, quantity: 1 }],
      amount: 22000,
      taxes,
      total: 22000 + sum(taxes),
      ...overrides,
    },
    rates,
  );
}

/** Commande d'un kit à livrer dans `zone`, avec ses taxes figées (HT + livraison + TVA + AIB). */
export function kitOrder(
  reference: string,
  zone: Schemas["DeliveryZone"],
  address: Schemas["DeliveryAddressInputRequest"] | Schemas["DeliveryAddress"],
  rates: TaxRates = DEFAULT_RATES,
  overrides: Partial<Schemas["Order"]> = {},
): Schemas["Order"] {
  const taxes = taxLines(22000, rates);
  return {
    reference,
    kind: "kit",
    status: "pending",
    shippingStatus: "preparing",
    subtotal: 22000,
    shippingFee: zone.fee,
    taxes,
    total: 22000 + zone.fee + sum(taxes),
    currency: "XOF",
    items: [
      { id: 1, title: "Pack Électronique", courseSlug: "", kitSlug: KIT_SLUG, eventSlug: "", unitPrice: 22000, quantity: 1, total: 22000 },
    ],
    beneficiary: { id: CHILD_ID, firstName: "Léa" },
    deliveryZone: { id: zone.id, name: zone.name, delayLabel: zone.delayLabel },
    expiresAt: AT("2026-10-20T09:30:00+01:00"),
    paidAt: null,
    createdAt: CREATED_AT,
    deliveryAddress: {
      recipientName: address.recipientName,
      phone: address.phone ?? PARENT_ME.phone ?? "",
      country: zone.country,
      zone: zone.name,
      city: address.city,
      district: address.district ?? "",
      addressLine: address.addressLine,
    },
    kitCodes: [],
    invoice: null,
    ...overrides,
  };
}

export function courseOrder(reference: string, rates: TaxRates = DEFAULT_RATES, overrides: Partial<Schemas["Order"]> = {}): Schemas["Order"] {
  const taxes = taxLines(15000, rates);
  return {
    reference,
    kind: "course",
    status: "pending",
    shippingStatus: "preparing",
    subtotal: 15000,
    shippingFee: 0,
    taxes,
    total: 15000 + sum(taxes),
    currency: "XOF",
    items: [
      { id: 1, title: COURSE.title, courseSlug: COURSE_SLUG, kitSlug: "", eventSlug: "", unitPrice: 15000, quantity: 1, total: 15000 },
    ],
    beneficiary: { id: CHILD_ID, firstName: "Léa" },
    deliveryZone: null,
    expiresAt: AT("2026-10-20T09:30:00+01:00"),
    paidAt: null,
    createdAt: CREATED_AT,
    deliveryAddress: null,
    kitCodes: [],
    invoice: null,
    ...overrides,
  };
}

export function payment(
  id: number,
  order: Schemas["Order"],
  status: Schemas["Payment"]["status"],
  input: Schemas["PaymentCreateRequest"],
  overrides: Partial<Schemas["Payment"]> = {},
): Schemas["Payment"] {
  return {
    id,
    orderReference: order.reference,
    status,
    country: input.country,
    network: input.network,
    msisdnMasked: `${input.msisdn.slice(0, 4)}••••${input.msisdn.slice(-2)}`,
    amount: order.total,
    currency: "XOF",
    failureCode: "",
    failureReason: "",
    createdAt: CREATED_AT,
    confirmedAt: null,
    ...overrides,
  };
}

export function apiError(code: Schemas["ErrorCodeEnum"], message: string): Schemas["Error"] {
  return { code, message };
}
