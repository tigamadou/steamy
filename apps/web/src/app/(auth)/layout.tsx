// Groupe des écrans d'authentification (lot 2) : aucun shell imposé, chaque écran choisit `WebShell` ou
// `FullScreenStage` (W01, W07, W14, W15 sont plein écran).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-surface">{children}</div>;
}
