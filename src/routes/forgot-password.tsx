import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authLink } from "@/components/AuthCard";
import { TextField } from "@/components/AuthField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — SkillForge" },
      { name: "description", content: "Get a link to set a new SkillForge password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setSending(true);
    /*
     * The emailed link lands on /accept-invite, which is the page that asks for
     * a new password — not on this page and not on /login, which would simply
     * sign the user in and never ask. ?type=recovery tells that page which kind
     * of link it is even when Supabase reports an error instead of a session.
     */
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/accept-invite?type=recovery`,
    });
    setSending(false);

    /*
     * Only a failure to reach Supabase at all is reported. Supabase answers
     * the same whether or not the address has an account, but its *other*
     * errors are not so even-handed: the send rate limit can only be hit by an
     * address it actually sends to, so showing it would say "this one exists".
     * Everything except a transport failure therefore gets the confirmation.
     *
     * A transport failure reveals nothing — the request never arrived — and
     * silently claiming success there would be a worse lie than the one this
     * avoids.
     */
    if (resetError && isAuthRetryableFetchError(resetError)) {
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }
    if (resetError) console.error("Password reset request failed", resetError);
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to set a new one."
      footer={
        <Link to="/login" className={authLink}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Alert variant="done">
            {/*
             * Word for word the same whatever the address was, so the page
             * can't be used to ask whether someone has an account here.
             */}
            If an account exists for that email, we've sent a link to reset your password.
          </Alert>
          <p className="text-small text-ink-muted">
            The link works once and expires after an hour. If it doesn't arrive, check your spam
            folder, or ask your admin to confirm the address.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Use a different address
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={error ?? undefined}
          />
          <Button type="submit" disabled={sending} className="w-full">
            {sending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
