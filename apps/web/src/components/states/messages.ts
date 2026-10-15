// Textes des états transversaux WX01-WX03 et de la page 404 (SPEC-ECRANS-3 §6), par registre :
// tutoiement (apprenant et site public), vouvoiement (parent, enseignant), neutre (personnel).
// Aucune promesse de « mode hors ligne » (D16).

export type Register = "tu" | "vous" | "neutre";

export type StateKind = "offline" | "error" | "loading" | "notFound";

type StateText = { title: string; body: string };

export const STATE_MESSAGES: Record<StateKind, Record<Register, StateText>> = {
  offline: {
    tu: {
      title: "Tu es hors ligne",
      body: "Vérifie ta connexion internet. La page se recharge dès que le réseau revient.",
    },
    vous: {
      title: "Vous êtes hors ligne",
      body: "Vérifiez votre connexion internet. La page se recharge dès que le réseau revient.",
    },
    neutre: {
      title: "Connexion interrompue",
      body: "Aucune connexion internet détectée. La page se recharge dès que le réseau revient.",
    },
  },
  error: {
    tu: {
      title: "Oups, ça a coupé",
      body: "On n'a pas pu charger cette page. Réessaie dans un instant.",
    },
    vous: {
      title: "Oups, ça a coupé",
      body: "Nous n'avons pas pu charger cette page. Réessayez dans un instant.",
    },
    neutre: {
      title: "Chargement impossible",
      body: "La page n'a pas pu être chargée. Un nouvel essai est possible dans un instant.",
    },
  },
  loading: {
    tu: {
      title: "On prépare ton contenu…",
      body: "Le réseau est parfois un peu lent par ici. Merci de patienter quelques secondes.",
    },
    vous: {
      title: "Nous préparons votre contenu…",
      body: "Le réseau est parfois un peu lent par ici. Merci de patienter quelques secondes.",
    },
    neutre: {
      title: "Chargement en cours…",
      body: "Le réseau est parfois lent. Merci de patienter quelques secondes.",
    },
  },
  notFound: {
    tu: {
      title: "Cette page est introuvable",
      body: "Elle n'existe pas ou a été déplacée. Reviens à l'accueil pour continuer ton exploration.",
    },
    vous: {
      title: "Cette page est introuvable",
      body: "Elle n'existe pas ou a été déplacée. Revenez à l'accueil pour poursuivre votre navigation.",
    },
    neutre: {
      title: "Page introuvable",
      body: "Cette page n'existe pas ou a été déplacée.",
    },
  },
};

/** Libellés des actions, identiques dans les trois registres (verbes à l'infinitif). */
export const STATE_ACTIONS = {
  retry: "Réessayer",
  back: "Retour",
  home: "Retour à l'accueil",
  stillOffline: "Toujours pas de réseau. Nouvel essai dès son retour.",
} as const;

// Espaces connectés (docs/plans/README.md, « Routes du front ») : le registre suit l'espace de l'URL.
const SPACE_REGISTERS: Array<[string, Register]> = [
  ["/parent", "vous"],
  ["/enseignant", "vous"],
  ["/backoffice", "neutre"],
];

/** Registre des textes d'état pour un chemin : tutoiement par défaut (site public, espace apprenant). */
export function registerOf(pathname: string | null): Register {
  const match = SPACE_REGISTERS.find(([prefix]) => pathname === prefix || pathname?.startsWith(`${prefix}/`));
  return match ? match[1] : "tu";
}
