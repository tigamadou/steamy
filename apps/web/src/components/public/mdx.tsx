import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

// Typographie du contenu éditorial MDX (src/content/). Les ancres (`id`) tiennent compte de l'en-tête collant.
// Un titre qui porte une ancre s'écrit `<H2 id="…">` dans le MDX : les balises HTML littérales ne sont pas stylées.

function MdxLink({ href = "", children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const className =
    "font-bold text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-3 focus-visible:outline-primary-500";
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
      {children}
    </a>
  );
}

const shared: MDXComponents = {
  a: MdxLink,
  strong: (props) => <strong className="font-black text-ink-900" {...props} />,
  ul: (props) => <ul className="my-3 flex list-disc flex-col gap-1.5 pl-5" {...props} />,
  ol: (props) => <ol className="my-3 flex list-decimal flex-col gap-1.5 pl-5" {...props} />,
};

/** Article de blog (WL18) : corps 16 px, interligne 1,7. */
const articleH2: MDXComponents["h2"] = (props) => (
  <h2 className="mt-7 mb-1.5 scroll-mt-24 text-xl font-black text-ink-900" {...props} />
);

export const articleComponents: MDXComponents = {
  ...shared,
  h2: articleH2,
  H2: articleH2,
  h3: (props) => <h3 className="mt-5 mb-1.5 scroll-mt-24 text-[17px] font-black text-ink-900" {...props} />,
  p: (props) => <p className="my-2 text-base leading-[1.7] font-medium text-ink-700" {...props} />,
  li: (props) => <li className="text-base leading-[1.7] font-medium text-ink-700" {...props} />,
};

/** Pages légales (WL09) : titres de section 15 px, corps 14 px. */
const legalH2: MDXComponents["h2"] = (props) => (
  <h2 className="mt-8 mb-2 scroll-mt-24 text-lg font-black text-ink-900" {...props} />
);

export const legalComponents: MDXComponents = {
  ...shared,
  h2: legalH2,
  H2: legalH2,
  h3: (props) => <h3 className="mt-5 mb-1.5 scroll-mt-24 text-[15px] font-black text-ink-900" {...props} />,
  p: (props) => <p className="my-1.5 text-sm leading-relaxed font-semibold text-ink-600" {...props} />,
  li: (props) => <li className="text-sm leading-relaxed font-semibold text-ink-600" {...props} />,
};
