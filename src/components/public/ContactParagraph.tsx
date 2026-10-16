import { CONTACT_EMAIL, CONTACT_PENDING } from "@/lib/seo";

/**
 * The contact line both legal pages end on.
 *
 * It lives in one component so that the address lives in one place, and so the
 * two pages cannot drift apart while there still isn't one. The addresses that
 * used to be printed here (privacy@ and legal@skillforge.example) were never
 * real; a page that says the details are coming is better than one that gives
 * an address nobody reads.
 */
export function ContactParagraph({ lead, subject }: { lead: string; subject: string }) {
  if (!CONTACT_EMAIL) {
    return (
      <p>
        {lead}, please get in touch. {CONTACT_PENDING}
      </p>
    );
  }

  return (
    <p>
      {lead}, email{" "}
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
        className="rounded-sm font-medium text-temper-blue hover:underline"
      >
        {CONTACT_EMAIL}
      </a>
      .
    </p>
  );
}
