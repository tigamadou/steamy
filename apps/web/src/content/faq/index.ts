import type { FaqTheme } from "@/components/ds";

// FAQ statique du centre d'aide WL24 (D10, D41), au vouvoiement (parents, enseignants) ; réutilisée par WD12,
// WPD13 et WT11. Le mot de passe oublié distingue l'apprenant (son parent) et le parent (WL02).
export const FAQ: FaqTheme[] = [
  {
    title: "Compte et consentement",
    items: [
      {
        question: "Pourquoi un parent doit-il valider le compte de l'apprenant ?",
        answer:
          "Le compte d'un apprenant (10 à 17 ans) est toujours validé par un parent ou tuteur légal, quel que soit son âge. Le parent reçoit la demande par SMS et la valide depuis son espace.",
      },
      {
        question: "Combien de temps la demande de consentement reste-t-elle valable ?",
        answer:
          "7 jours. Passé ce délai, l'apprenant recommence son inscription. Pendant ce délai, il peut la reprendre avec son identifiant et son code de reprise.",
      },
      {
        question: "Que se passe-t-il si le parent refuse ?",
        answer:
          "La demande est close et le compte en attente supprimé. Une nouvelle demande au même parent est possible après 30 jours.",
      },
      {
        question: "Comment changer de parent référent ?",
        answer:
          "Le changement de parent passe par notre équipe : écrivez-nous depuis le formulaire de contact en choisissant le sujet « Changement de parent ».",
      },
    ],
  },
  {
    title: "Paiement Mobile Money",
    items: [
      {
        question: "Quels moyens de paiement acceptez-vous ?",
        answer: "Uniquement le Mobile Money, réglé par le parent. Aucune carte bancaire n'est demandée.",
      },
      {
        question: "Mon paiement a échoué, que faire ?",
        answer:
          "Vérifiez le solde et le numéro saisi, puis relancez le paiement depuis la demande. Si le montant a été débité sans confirmation, contactez-nous avec le sujet « Paiement ».",
      },
    ],
  },
  {
    title: "Kits et livraison",
    items: [
      {
        question: "À quoi sert le Kit Code ?",
        answer:
          "Certains parcours se font avec un kit. Le Kit Code, fourni avec le kit, débloque le parcours correspondant.",
      },
      {
        question: "Quels sont les délais de livraison ?",
        answer: "Ils dépendent de la zone de livraison, affichée avec son délai avant le paiement.",
      },
    ],
  },
  {
    title: "Événements",
    items: [
      {
        question: "Comment participer à un Steamy Event ?",
        answer:
          "L'apprenant demande à participer depuis la fiche de l'événement ; son parent donne son accord et règle la participation si l'événement est payant.",
      },
    ],
  },
  {
    title: "Mot de passe oublié",
    items: [
      {
        question: "Je suis apprenant et j'ai oublié mon mot de passe.",
        answer: "Demandez à votre parent : il peut le réinitialiser depuis son espace parent.",
      },
      {
        question: "Je suis parent et j'ai oublié mon mot de passe.",
        answer: "Utilisez « Mot de passe oublié » sur la page de connexion : un code vous est envoyé par SMS.",
      },
    ],
  },
];
