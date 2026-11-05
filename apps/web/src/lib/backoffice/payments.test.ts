import { describe, expect, it } from "vitest";

import {
  apiQuery,
  AUDIT_ACTIONS,
  failureLabel,
  labelOf,
  ORDER_KIND,
  ORDER_STATUS,
  PAYMENT_STATUS,
  paymentsHref,
  parsePaymentFilters,
  parseRefundsTab,
  REFUND_TABS,
  refundsHref,
} from "./payments";

describe("libellés", () => {
  it("donne un libellé et un ton à chaque statut Steamy", () => {
    expect(PAYMENT_STATUS.initiated).toEqual({ label: "Initié", tone: "neutral" });
    expect(PAYMENT_STATUS.pending).toEqual({ label: "En attente", tone: "amber" });
    expect(PAYMENT_STATUS.succeeded).toEqual({ label: "Réussi", tone: "success" });
    expect(PAYMENT_STATUS.failed).toEqual({ label: "Échoué", tone: "error" });
  });

  it("traduit les motifs d'échec, un code inconnu s'affiche tel quel, vide → tiret", () => {
    expect(failureLabel("DECLINED")).toBe("Paiement refusé");
    expect(failureLabel("EXPIRED")).toBe("Paiement expiré");
    expect(failureLabel("NOUVEAU_CODE")).toBe("NOUVEAU_CODE");
    expect(failureLabel("")).toBe("—");
  });

  it("nomme les types de commande", () => {
    expect(ORDER_KIND).toEqual({ course: "Parcours", kit: "Kit", event: "Événement" });
  });
});

describe("filtres d'URL des paiements", () => {
  it("lit les filtres valides et la page", () => {
    expect(
      parsePaymentFilters({ statut: "failed", reseau: "mtn", pays: "BJ", type: "kit", du: "2026-11-01", au: "2026-11-05", q: " CMD-1 ", page: "3" }),
    ).toEqual({ status: "failed", network: "mtn", country: "BJ", kind: "kit", from: "2026-11-01", to: "2026-11-05", q: "CMD-1", page: 3 });
  });

  it("ignore les valeurs inconnues ou mal formées, page 1 par défaut", () => {
    expect(
      parsePaymentFilters({ statut: "perdu", reseau: "MTN !", pays: "benin", type: "autre", du: "hier", au: "2026-13", q: "   ", page: "0" }),
    ).toEqual({ page: 1 });
    expect(parsePaymentFilters({ page: "abc" })).toEqual({ page: 1 });
    expect(parsePaymentFilters({})).toEqual({ page: 1 });
  });

  it("prend la première valeur d'un paramètre répété", () => {
    expect(parsePaymentFilters({ statut: ["failed", "pending"], page: ["2", "5"] })).toEqual({ status: "failed", page: 2 });
  });

  it("construit l'URL française, paramètres vides omis", () => {
    expect(paymentsHref({ page: 1 })).toBe("/backoffice/paiements");
    expect(paymentsHref({ status: "failed", network: "mtn", country: "BJ", kind: "kit", from: "2026-11-01", to: "2026-11-05", q: "a b", page: 2 })).toBe(
      "/backoffice/paiements?statut=failed&reseau=mtn&pays=BJ&type=kit&du=2026-11-01&au=2026-11-05&q=a+b&page=2",
    );
  });

  it("traduit vers les paramètres de l'API", () => {
    expect(apiQuery({ page: 1 })).toEqual({ page: 1 });
    expect(apiQuery({ status: "failed", network: "mtn", country: "BJ", kind: "kit", from: "2026-11-01", to: "2026-11-05", q: "x", page: 2 })).toEqual({
      status: "failed",
      network: "mtn",
      country: "BJ",
      kind: "kit",
      from: "2026-11-01",
      to: "2026-11-05",
      q: "x",
      page: 2,
    });
  });
});

describe("onglets des remboursements", () => {
  it("à traiter par défaut, traités sur demande, valeur inconnue → défaut", () => {
    expect(REFUND_TABS["a-traiter"]).toEqual({ label: "À traiter", processed: false });
    expect(REFUND_TABS.traites).toEqual({ label: "Traités", processed: true });
    expect(parseRefundsTab({})).toEqual({ tab: "a-traiter", page: 1 });
    expect(parseRefundsTab({ onglet: "traites", page: "2" })).toEqual({ tab: "traites", page: 2 });
    expect(parseRefundsTab({ onglet: "x", page: "-1" })).toEqual({ tab: "a-traiter", page: 1 });
  });

  it("construit l'URL de chaque onglet", () => {
    expect(refundsHref("a-traiter", 1)).toBe("/backoffice/remboursements");
    expect(refundsHref("traites", 1)).toBe("/backoffice/remboursements?onglet=traites");
    expect(refundsHref("a-traiter", 3)).toBe("/backoffice/remboursements?page=3");
    expect(refundsHref("traites", 2)).toBe("/backoffice/remboursements?onglet=traites&page=2");
  });
});


describe("libellés de la fiche d'un paiement", () => {
  it("traduit les statuts de commande et les actions du journal, l'inconnu reste tel quel", () => {
    expect(labelOf(ORDER_STATUS, "paid")).toBe("Payée");
    expect(labelOf(ORDER_STATUS, "autre")).toBe("autre");
    expect(labelOf(AUDIT_ACTIONS, "refund.requested")).toBe("Remboursement demandé");
    expect(labelOf(AUDIT_ACTIONS, "payment.rechecked")).toBe("Paiement revérifié chez FedaPay");
    expect(labelOf(AUDIT_ACTIONS, "payment.confirmed")).toBe("Paiement confirmé");
    expect(labelOf(AUDIT_ACTIONS, "refund.processed")).toBe("Remboursement marqué comme fait");
    expect(labelOf(AUDIT_ACTIONS, "x.y")).toBe("x.y");
  });
});
