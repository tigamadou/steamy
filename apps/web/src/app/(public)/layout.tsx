import { PublicShell } from "@/components/public";

// Espace public (lot 1) : pages servies par le client anonyme `getPublicApi()`, prérendues et mises en cache.
// `getServerApi()` y est interdit (règle ESLint) : il lirait les cookies et rendrait la page dynamique.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <PublicShell>{children}</PublicShell>;
}
