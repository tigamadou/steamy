import { ResetFlowProvider } from "./ResetFlow";

// Mot de passe oublié WL02-WL05 (D26) : l'état du parcours vit en mémoire de ce layout.
export default function ResetLayout({ children }: LayoutProps<"/mot-de-passe-oublie">) {
  return <ResetFlowProvider>{children}</ResetFlowProvider>;
}
