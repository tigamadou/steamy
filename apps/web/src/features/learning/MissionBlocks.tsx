import type { Schemas } from "@steamy/api-client";

/** Contenu d'une mission (WJ03), servi par l'API une fois la mission ouverte : texte, astuce, média. */
export function MissionBlocks({ blocks }: { blocks: Schemas["MissionBlock"][] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        if (block.type === "tip") {
          return (
            <aside
              key={index}
              className="flex gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-[15px] leading-normal font-semibold text-ink-800"
            >
              <span aria-hidden className="text-xl">
                💡
              </span>
              <p className="m-0">
                <b>Astuce : </b>
                {block.text}
              </p>
            </aside>
          );
        }
        if (block.type === "media") {
          return (
            <figure key={index} className="m-0 flex flex-col gap-2">
              {/* Image du contenu, hébergée par le stockage de l'API : dimensions inconnues, pas d'optimisation Next */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.src} alt={block.alt ?? ""} className="w-full rounded-lg border border-ink-100" />
              {block.caption && (
                <figcaption className="text-[13px] font-semibold text-ink-600">{block.caption}</figcaption>
              )}
            </figure>
          );
        }
        return (
          <p key={index} className="m-0 text-[15px] leading-relaxed font-semibold whitespace-pre-line text-ink-800">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
