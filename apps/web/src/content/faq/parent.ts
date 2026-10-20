import type { FaqTheme } from "@/components/ds";

// FAQ statique de l'aide du parent WPD13 (D10, D17), au vouvoiement. Ajouter un enfant : créer son compte (WPD04) ou
// accepter sa demande, jamais d'invitation par téléphone (§8.9). Paiement : Mobile Money selon le pays, aucun réseau
// cité (D76), aucune carte.

export const PARENT_FAQ: FaqTheme[] = [
  {
    id: "faq-enfants",
    title: "Mes enfants",
    items: [
      {
        question: "Comment ajouter un enfant ?",
        answer:
          "Deux possibilités : créez son compte depuis « Mes enfants » › « Ajouter un enfant », avec un identifiant et un mot de passe que vous lui communiquez ; ou acceptez la demande qu'il vous a envoyée en s'inscrivant lui-même.",
      },
      {
        question: "Comment valider une demande de mon enfant ?",
        answer:
          "Toutes les demandes qui attendent votre accord (inscription, paiement, participation à un événement, suppression du compte) sont regroupées dans « À valider », sur votre accueil. Ouvrez la demande, puis acceptez-la ou refusez-la.",
      },
      {
        question: "Mon enfant a oublié son mot de passe",
        answer:
          "Ouvrez son profil depuis « Mes enfants », puis « Réinitialiser le mot de passe ». Choisissez un nouveau mot de passe et communiquez-le à votre enfant.",
      },
      {
        question: "Comment suivre la progression de mon enfant ?",
        answer:
          "Son profil, dans « Mes enfants », montre sa progression par parcours et ses derniers quiz. Le rapport hebdomadaire résume sa semaine ; il vous est aussi envoyé par email si vous avez renseigné une adresse dans vos paramètres.",
      },
      {
        question: "Comment supprimer le compte de mon enfant ?",
        answer:
          "Depuis son profil, « Supprimer le compte ». Le compte est désactivé immédiatement puis anonymisé dans 30 jours ; vous pouvez annuler d'ici là. Les factures sont conservées.",
      },
    ],
  },
  {
    id: "faq-paiement",
    title: "Paiements et commandes",
    items: [
      {
        question: "Comment payer un parcours, un kit ou un événement ?",
        answer:
          "Le paiement se fait uniquement en Mobile Money, avec les réseaux disponibles dans votre pays. Aucune carte bancaire n'est demandée. Vous validez le paiement sur votre téléphone.",
      },
      {
        question: "Mon enfant me demande un achat : que dois-je faire ?",
        answer:
          "Vous recevez un SMS et une notification. Ouvrez la demande depuis « À valider » : vous pouvez la payer ou la refuser. Une demande non traitée expire au bout de 7 jours.",
      },
      {
        question: "Où retrouver mes factures et les Kit Codes ?",
        answer:
          "Dans « Commandes » : chaque commande payée a sa facture, et le détail d'une commande de kit affiche ses Kit Codes, à transmettre à votre enfant pour débloquer le parcours.",
      },
    ],
  },
  {
    id: "faq-compte",
    title: "Mon compte",
    items: [
      {
        question: "Comment changer de numéro de téléphone ?",
        answer:
          "Dans « Paramètres » › « Connexion » : saisissez le nouveau numéro et votre mot de passe, puis le code reçu par SMS sur ce nouveau numéro. Vous vous connecterez ensuite avec ce numéro.",
      },
      {
        question: "J'ai oublié mon mot de passe",
        answer:
          "Sur la page de connexion, choisissez « Mot de passe oublié » : un code vous est envoyé par SMS pour en choisir un nouveau.",
      },
      {
        question: "Comment supprimer mon compte ?",
        answer:
          "Dans « Paramètres » › « Zone sensible ». Supprimez d'abord le compte de chacun de vos enfants, ou demandez leur transfert à un autre parent auprès de notre équipe.",
      },
    ],
  },
];
