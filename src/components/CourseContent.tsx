import { ExternalLink } from "lucide-react";

/*
 * A course's content: text, a video link or a PDF link.
 *
 * Two rules hold for all three.
 *
 * Text is rendered as text. It is typed by a company admin into a textarea and
 * stored as-is, so it is untrusted input as far as the browser is concerned.
 * Nothing here uses dangerouslySetInnerHTML, and nothing ever should: an admin
 * who could store markup could store a script, and it would run for every
 * employee in the company.
 *
 * Links are only followed when they are https. A course URL is also admin
 * input, and `javascript:` in an href runs on click; `http:` would send the
 * employee somewhere a network could rewrite. Anything else is shown as plain
 * text with a short explanation rather than quietly dropped, so the admin can
 * see what is wrong with it.
 */

/** DESIGN.md: "Keep text lines under 75 characters; course content under 70." */
const MEASURE = "max-w-[66ch]";

function isSafeUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function CourseContent({ type, content }: { type: string; content: string }) {
  if (!content.trim()) {
    return <p className="text-small text-ink-muted">No content provided.</p>;
  }

  if (type === "video" || type === "pdf") {
    if (!isSafeUrl(content)) return <UnsafeLink type={type} value={content} />;
    return type === "video" ? <Video url={content} /> : <Pdf url={content} />;
  }

  // Blank lines separate paragraphs; single newlines stay inside one.
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className={`${MEASURE} space-y-4`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap text-body text-ink">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function UnsafeLink({ type, value }: { type: string; value: string }) {
  return (
    <div className={MEASURE}>
      <p className="text-body text-ink">This {type === "pdf" ? "PDF" : "video"} can't be opened.</p>
      <p className="mt-1 text-small text-ink-muted">
        Its address doesn't start with https, so SkillForge won't open it. Ask your admin to update
        the course.
      </p>
      {/* Shown, not linked: the admin needs to see what was stored. */}
      <p className="mt-2 break-all text-small text-ink-muted">{value}</p>
    </div>
  );
}

/** A link out, always labelled and always saying that it leaves the page. */
function OpenLink({ url, children }: { url: string; children: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 text-body text-temper-blue underline underline-offset-4"
    >
      {children}
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Video({ url }: { url: string }) {
  const embed = toEmbed(url);
  return (
    <div className="space-y-3">
      {embed && (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-steel bg-ground">
          <iframe
            src={embed}
            title="Course video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {/* Not every video link is YouTube, and plenty of players refuse to be framed. */}
      <OpenLink url={url}>Open the video</OpenLink>
    </div>
  );
}

function Pdf({ url }: { url: string }) {
  return (
    <div className="space-y-3">
      {/* The link comes first: a framed PDF silently shows nothing on many hosts. */}
      <OpenLink url={url}>Open the PDF</OpenLink>
      <iframe
        src={url}
        title="Course PDF"
        className="h-[600px] w-full rounded-md border border-steel bg-ground"
      />
    </div>
  );
}

/** Turns a watch URL into its embeddable form. Only ever called with an https URL. */
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${encodeURIComponent(v)}` : null;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (u.hostname.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }
    return url;
  } catch {
    return null;
  }
}
