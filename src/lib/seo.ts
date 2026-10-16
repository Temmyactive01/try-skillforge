/*
 * Head tags for the public pages.
 *
 * Every public route builds its head from `pageHead` rather than listing the
 * tags itself, so a page can't ship with an Open Graph title that disagrees
 * with its own <title>, and so adding a tag happens once rather than eight
 * times.
 */

/**
 * The site's public address, used for canonical links and for the absolute
 * Open Graph image URL that LinkedIn and the rest need in order to fetch it.
 *
 * TODO (before launch): set this to the final Netlify address. The `.example`
 * TLD is reserved for documentation, so nothing here can quietly resolve to
 * somebody else's site in the meantime. See "Before launch" in
 * docs/progress.md.
 */
export const SITE_URL = "https://skillforge.example";

/**
 * Where to write about privacy or the terms. Both legal pages read it from
 * here, so there is one address to change rather than two.
 *
 * TODO (before launch): create a dedicated contact address and set it here.
 * While it is empty the pages say so plainly instead of printing an address
 * that nobody reads. Annotated as `string` so it stays a string once set.
 */
export const CONTACT_EMAIL: string = "";

/** The sentence both legal pages use while there is no address to give. */
export const CONTACT_PENDING = "Contact details will be added here before launch.";

type Page = {
  /** The whole <title>, including the " — SkillForge" part. */
  title: string;
  description: string;
  /** Path with a leading slash, or "" for the home page. */
  path: string;
};

/**
 * The social share image. One image for the whole site: it carries the product
 * name and the headline, and the per-page title and description do the rest.
 */
const OG_IMAGE_ALT =
  "SkillForge: assign training and see who has finished it. An assignments table with progress bars.";

export function pageHead({ title, description, path }: Page) {
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}/og.png`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: "SkillForge" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
