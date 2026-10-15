import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

    if (resetError) {
      setError("Couldn't send the reset link. Check your connection and try again.");
      return;
    }
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
            {/* Says nothing about whether the address has an account. */}
            If an account exists for {email.trim()}, a reset link is on its way.
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
