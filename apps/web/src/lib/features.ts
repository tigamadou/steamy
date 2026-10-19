/**
 * Drapeaux des fonctionnalités incomplètes (LOT-3 §3) : un CTA dont la cible n'est pas encore livrée est absent,
 * jamais « Bientôt ». Chaque drapeau est retiré quand sa fonctionnalité est livrée (critères de fin du lot 3).
 */
export const features = {
  /** Déblocage d'un parcours : Kit Code et demande au parent (3.6, API-L3b). */
  unlock: false,
  /** Mes commandes de l'apprenant (WD14, 3.6, API-L3b) : ligne du hub WD13. */
  orders: false,
  /** Commentaires des enseignants dans le détail d'un enfant (WPD03, `classrooms/comments/?learnerId=`, API-L5). */
  parentTeacherComments: false,
} as const;

export type Feature = keyof typeof features;
