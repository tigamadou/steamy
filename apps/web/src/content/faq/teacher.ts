import type { FaqTheme } from "@/components/ds";

// FAQ statique de l'aide de l'enseignant WT11 (D10), au vouvoiement. Quatre sujets : créer une classe, ajouter des
// élèves (consentement du parent), revoir une tentative échouée, échanger avec un parent par les commentaires. Ni
// correction d'évaluation (D65) ni contact direct d'un parent (D63, S11).

export const TEACHER_FAQ: FaqTheme[] = [
  {
    id: "faq-classes",
    title: "Créer une classe",
    items: [
      {
        question: "Comment créer une classe ?",
        answer:
          "Depuis « Mes classes », choisissez « Créer une classe », donnez-lui un nom et sélectionnez un parcours parmi ceux de l'offre de votre établissement. Une classe suit un seul parcours.",
      },
      {
        question: "Pourquoi ne puis-je plus changer le parcours d'une classe ?",
        answer:
          "Dès qu'un élève a rejoint la classe, son parcours est figé : vous pouvez encore la renommer. Pour suivre un autre parcours, créez une nouvelle classe.",
      },
      {
        question: "Combien de classes et d'élèves puis-je avoir ?",
        answer:
          "Les quotas dépendent de l'offre de votre établissement. Le nombre de classes et d'élèves restants est affiché sur « Mes classes » ; le serveur contrôle ces limites à chaque ajout.",
      },
    ],
  },
  {
    id: "faq-eleves",
    title: "Ajouter des élèves",
    items: [
      {
        question: "Comment ajouter un élève à une classe ?",
        answer:
          "Indiquez son prénom, son nom, le numéro de téléphone de son parent et le lien de parenté. Le parent reçoit une demande de consentement par SMS : l'élève rejoint la classe après son accord.",
      },
      {
        question: "Puis-je ajouter plusieurs élèves à la fois ?",
        answer:
          "Oui, avec l'onglet « Import par lot » : un fichier CSV ou Excel de 200 lignes au maximum, ou une liste collée. Un rapport ligne par ligne indique celles qui sont envoyées et celles à corriger.",
      },
      {
        question: "Que se passe-t-il si le parent refuse ou ne répond pas ?",
        answer:
          "L'invitation apparaît « Refusée » ou « Expirée » dans la classe et vous en êtes notifié. La place est libérée : vous pouvez inviter l'élève de nouveau.",
      },
    ],
  },
  {
    id: "faq-evaluations",
    title: "Revoir une tentative échouée",
    items: [
      {
        question: "Que contient « À revoir » ?",
        answer:
          "Les tentatives de quiz échouées de vos élèves que vous n'avez pas encore commentées. Le résultat est calculé par la plateforme : il n'est ni corrigé ni modifié à la main.",
      },
      {
        question: "Comment revoir une tentative ?",
        answer:
          "Choisissez « Commenter » : le profil de l'élève s'ouvre sur la tentative. Une fois votre commentaire envoyé, la tentative sort de « À revoir ».",
      },
    ],
  },
  {
    id: "faq-commentaires",
    title: "Échanger avec un parent",
    items: [
      {
        question: "Comment échanger avec le parent d'un élève ?",
        answer:
          "Par les commentaires du profil de l'élève : ils sont visibles de l'élève et de son parent, qui en sont notifiés. Il n'y a pas de messagerie, et le parent ne peut pas y répondre.",
      },
      {
        question: "Quelles informations puis-je consulter sur un élève ?",
        answer:
          "Sa progression et ses tentatives sur le parcours de la classe, ses badges et sa moyenne. Aucune autre donnée personnelle n'est affichée.",
      },
    ],
  },
];
