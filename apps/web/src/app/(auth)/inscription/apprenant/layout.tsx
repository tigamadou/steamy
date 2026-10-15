import { SignupDraftProvider } from "./SignupDraft";

// Inscription de l'apprenant W04-W15 : brouillon en mémoire avant la création du compte (W04-W05), puis l'API est
// la source de vérité (`GET auth/learner-signup/`, voir SignupGate).
export default function LearnerSignupLayout({ children }: LayoutProps<"/inscription/apprenant">) {
  return <SignupDraftProvider>{children}</SignupDraftProvider>;
}
