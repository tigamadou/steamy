import { notFound } from "next/navigation";
import { connection } from "next/server";

import { site, SITE_URL } from "@/content/site";
import { getCourse } from "@/lib/catalog";
import { routes } from "@/lib/routes";

import { CourseDetail } from "./course-detail";

/**
 * Fiche WL22 lue dans l'API (en cache) à la requête, sous `<Suspense>` : le slug n'est pas connu au build.
 * Un parcours non publié répond 404.
 */
export async function CourseView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const course = await getCourse(slug);
  if (!course) {
    notFound();
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: new URL(routes.course(course.slug), SITE_URL).toString(),
    provider: { "@type": "Organization", name: site.name, sameAs: SITE_URL },
    offers: {
      "@type": "Offer",
      category: course.isFree ? "Free" : "Paid",
      price: course.isFree ? 0 : (course.price ?? 0),
      priceCurrency: "XOF",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD : `<` échappé pour qu'aucun contenu ne ferme la balise script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <CourseDetail course={course} />
    </>
  );
}
