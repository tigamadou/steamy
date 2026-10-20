import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Badge, Breadcrumb, Button, Icon, SkeletonBlock, WKGallery } from "@/components/ds";
import { stringList } from "@/components/public/course-detail";
import { listHref } from "@/lib/catalog-filters";
import { cx } from "@/lib/cx";
import { DIFFICULTY_LABELS, formatPrice } from "@/lib/format";
import { getDeliveryZones, getKit } from "@/lib/shop";

import { AddToCartButton } from "./AddToCartButton";
import { DeliveryZonesNote } from "./DeliveryZonesNote";
import { RestockAlertForm } from "./RestockAlertForm";
import { shopRoutes, type ShopContext } from "./shop-routes";

type CompatibleCourse = { slug: string; title: string };

/**
 * WK02 / WK11 · Fiche d'un kit, sous `<Suspense>` : fiche publique en cache (prix et disponibilité de l'API, D37),
 * zones de livraison pour le délai (jamais écrit en dur, D38). Dans le shell, le titre du header est le h1 : le nom du
 * kit y est un h2. Un kit retiré de la vente répond 404.
 */
export async function KitDetailView({ params, context }: { params: Promise<{ slug: string }>; context: ShopContext }) {
  const { slug } = await params;
  await connection();
  const kit = await getKit(slug);
  if (!kit) notFound();
  // Zones en panne : la fiche s'affiche sans le délai de livraison
  const zones = await getDeliveryZones().catch(() => null);
  const { shop, course } = shopRoutes(context);
  const inShell = context !== "public";
  const Title = inShell ? "h2" : "h1";
  const Section = inShell ? "h3" : "h2";
  const tu = context === "learner";
  const contents = stringList(kit.contents);
  const compatible = kit.compatibleCourses as CompatibleCourse[];

  const block = (title: string, children: ReactNode) => (
    <section className="mt-7">
      <Section className="mb-3 text-lg font-black text-ink-900">{title}</Section>
      {children}
    </section>
  );

  return (
    <>
      <Breadcrumb className="mb-4" items={[{ label: "Boutique", href: shop }, { label: kit.name }]} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <WKGallery
            name={kit.name}
            images={stringList(kit.images)}
            emoji={kit.emoji || kit.category.icon}
            color={kit.category.color}
            dimmed={!kit.available}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="primary">{DIFFICULTY_LABELS[kit.difficulty]}</Badge>
            <Badge tone="neutral">{kit.category.label}</Badge>
          </div>
          <Title className="mt-3 text-[26px] font-black text-ink-900">{kit.name}</Title>
          <p className="mt-2 text-[15px] leading-relaxed font-semibold text-ink-600">{kit.description}</p>
          {contents.length > 0 &&
            block(
              "Ce que contient le kit",
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {contents.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-bold text-ink-800">
                    <Icon name="check" size={16} strokeWidth={3} className="shrink-0 text-success-700" />
                    {item}
                  </li>
                ))}
              </ul>,
            )}
          {compatible.length > 0 &&
            block(
              "Parcours compatibles",
              <ul className="flex flex-wrap gap-3">
                {compatible.map((c) => (
                  <li key={c.slug}>
                    <Button variant="outline" size="sm" href={course(c.slug)} iconRight="arrow-right">
                      {c.title}
                    </Button>
                  </li>
                ))}
              </ul>,
            )}
        </div>

        <aside
          aria-label={`Acheter ${kit.name}`}
          className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 lg:sticky lg:top-4"
        >
          <p className={cx("text-[30px] font-black", kit.available ? "text-primary-700" : "text-ink-500")}>
            {formatPrice(kit.price)}
          </p>
          <div>
            <Badge tone={kit.available ? "success" : "error"}>{kit.available ? "En stock" : "Indisponible"}</Badge>
          </div>
          {kit.available ? (
            <AddToCartButton slug={kit.slug} name={kit.name} context={context} variant="detail" />
          ) : (
            <>
              <RestockAlertForm slug={kit.slug} context={context} />
              <Button variant="outline" block href={listHref(shop, { category: kit.category.slug })}>
                Voir des kits similaires
              </Button>
            </>
          )}
          {zones && zones.length > 0 && <DeliveryZonesNote zones={zones} register={tu ? "tu" : "vous"} />}
        </aside>
      </div>
    </>
  );
}

/** Chargement de WK02 : galerie, texte et colonne d'achat en silhouette. */
export function KitDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du kit…" className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="aspect-4/3 rounded-3xl" />
        <SkeletonBlock className="h-8 w-2/3 rounded-lg" />
        <SkeletonBlock className="h-20 rounded-lg" />
      </div>
      <SkeletonBlock className="h-72 rounded-[22px]" />
    </div>
  );
}
