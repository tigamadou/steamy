// Contenu éditorial : chaque fichier MDX exporte ses métadonnées (`export const metadata = {…}`), typées par
// le registre qui l'importe (src/content/*/index.ts).
declare module "*.mdx" {
  export const metadata: unknown;
}
