import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({
    meta: [
      { title: "Set your password — SkillForge" },
      { name: "description", content: "Complete your SkillForge account setup." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // detectSessionInUrl (default) parses the hash and creates a session.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
      setChecking(false);
    }

    // Give supabase a tick to process the URL hash on first load.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    check();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function routeByRole(userId: string) {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) {
      setError("Your account has no profile. Contact your administrator.");
      await supabase.auth.signOut();
      return;
    }
    navigate({ to: profile.role === "admin" ? "/admin/dashboard" : "/employee/home" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { data, error: uErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (uErr || !data.user) {
      setError(uErr?.message ?? "Could not set your password. The invite may have expired.");
      return;
    }
    await routeByRole(data.user.id);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-foreground">SkillForge</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Set a password to finish activating your account.
        </p>

        {checking ? (
          <p className="text-sm text-muted-foreground">Verifying your invite…</p>
        ) : !hasSession ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            This invite link is invalid or has expired. Ask your administrator to send a new invite.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
