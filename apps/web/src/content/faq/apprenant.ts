import type { FaqTheme } from "@/components/ds";

// FAQ statique de l'aide de l'apprenant WD12 (D10, D41), au tutoiement. Aucune réponse n'évoque un changement de
// parent depuis l'application (SPEC-ECRANS-2, WD12) ; le mot de passe oublié renvoie au parent (D26).

export const LEARNER_FAQ: FaqTheme[] = [
  {
    id: "faq-debloquer",
    title: "Débloquer un parcours",
    items: [
      {
        question: "Comment débloquer un parcours payant ?",
        answer:
          "Ouvre la fiche du parcours et demande-le à ton parent : il reçoit ta demande et règle le paiement en Mobile Money depuis son espace. Tu n'as jamais rien à payer toi-même.",
      },
      {
        question: "Comment débloquer un parcours qui demande un kit ?",
        answer:
          "Un parcours avec kit se débloque uniquement avec le Kit Code livré avec le kit. Saisis-le depuis la fiche du parcours : le parcours s'ouvre aussitôt.",
      },
      {
        question: "Où trouver mon Kit Code ?",
        answer:
          "Il est imprimé sur la notice livrée avec ton kit, au format STEAMY-XXXX-XXXX. Majuscules et tirets sont facultatifs quand tu le saisis. Chaque code ne sert qu'une fois.",
      },
      {
        question: "Les parcours gratuits, comment ça marche ?",
        answer:
          "Ils sont ouverts à tous : choisis-en un dans le catalogue (filtre « Gratuit ») et commence tout de suite, sans rien demander à ton parent.",
      },
    ],
  },
  {
    id: "faq-compte",
    title: "Mon compte",
    items: [
      {
        question: "J'ai oublié mon mot de passe",
        answer:
          "Pas de panique : demande à ton parent. Il peut réinitialiser ton mot de passe depuis son espace Steamy.",
      },
      {
        question: "Pourquoi mon parent doit-il valider mon compte ?",
        answer:
          "Ton compte est rattaché à celui de ton parent ou tuteur, quel que soit ton âge. Il a validé ton inscription, et c'est aussi lui qui valide tes achats et ta participation aux Steamy Events.",
      },
      {
        question: "Puis-je changer mon identifiant ?",
        answer:
          "Non, ton identifiant de connexion ne change pas : garde-le bien, il te sert à chaque connexion.",
      },
    ],
  },
  {
    id: "faq-progression",
    title: "Ma progression",
    items: [
      {
        question: "Comment valider un niveau ?",
        answer:
          "Termine les missions du niveau puis réussis son quiz. Si tu ne l'as pas réussi, revois les missions indiquées et retente ta chance.",
      },
      {
        question: "Quand ai-je mon certificat ?",
        answer:
          "Quand tu as terminé tout un parcours. Ton certificat se télécharge alors depuis la page du parcours.",
      },
    ],
  },
];
