import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
  type AuthError,
} from "@supabase/supabase-js";
import { createTabSessionClient, supabase } from "@/integrations/supabase/client";
import { PasswordField } from "@/components/PasswordField";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({
    meta: [
      { title: "Set your password — SkillForge" },
      { name: "description", content: "Set a password for your SkillForge account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

// Invite and password-reset emails both land here with a session in the URL fragment.
// That session is kept in this tab only: the app's shared client stores its session in
// localStorage, which every tab uses, so signing in or out elsewhere would replace or
// remove it while the user is still choosing a password.
const STORAGE_KEY = "skillforge-set-password";
const KIND_KEY = `${STORAGE_KEY}-kind`;

type LinkKind = "invite" | "recovery" | "unknown";
type LinkCheck = { valid: boolean; kind: LinkKind };

let linkClient: ReturnType<typeof createTabSessionClient> | undefined;
function getLinkClient() {
  linkClient ??= createTabSessionClient(STORAGE_KEY);
  return linkClient;
}

// Shared so React's development double-run of effects doesn't read the URL twice.
let pendingCheck: Promise<LinkCheck> | undefined;
function checkLink(): Promise<LinkCheck> {
  pendingCheck ??= (async () => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (window.location.hash) {
      // Keep the tokens out of the address bar and browser history.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
    // Our emails add ?type= so the kind is known even when Supabase reports an error instead.
    const type = new URLSearchParams(window.location.search).get("type") ?? params.get("type");
    if (type === "invite" || type === "recovery") sessionStorage.setItem(KIND_KEY, type);
    const kind = (sessionStorage.getItem(KIND_KEY) as LinkKind | null) ?? "unknown";

    // Supabase reports expired or already-used links in the fragment.
    if (params.has("error") || params.has("error_code")) return { valid: false, kind };

    const client = getLinkClient();
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      // setSession also checks with Supabase that the session is still active.
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { valid: !error && !!data.session, kind };
    }
    // No tokens: the page was reloaded after the link was opened in this tab.
    const { data } = await client.auth.getUser();
    return { valid: !!data.user, kind };
  })();
  return pendingCheck;
}

function clearLinkSession() {
  for (const key of [STORAGE_KEY, `${STORAGE_KEY}-user`, KIND_KEY]) sessionStorage.removeItem(key);
  pendingCheck = undefined;
}

function expiredMessage(kind: LinkKind) {
  if (kind === "recovery") {
    return "This reset link has expired or was already used. Request a new one from the login page.";
  }
  if (kind === "invite") {
    return "This invite link has expired or was already used. Ask your administrator to send you a new invite.";
  }
  return "This link has expired or was already used. Request a new reset link from the login page, or ask your administrator for a new invite.";
}

function isLinkDead(error: AuthError) {
  return (
    isAuthSessionMissingError(error) ||
    (isAuthApiError(error) && (error.status === 401 || error.status === 403))
  );
}

function friendlyError(error: AuthError) {
  if (isAuthWeakPasswordError(error)) {
    return "That password is too easy to guess. Use at least 8 characters with a mix of letters, numbers and symbols.";
  }
  if (error.code === "same_password") {
    return "Your new password must be different from your current one.";
  }
  if (isAuthRetryableFetchError(error)) {
    return "We couldn't reach the server. Check your internet connection and try again.";
  }
  return "We couldn't save your password. Please try again.";
}

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<LinkCheck | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkLink().then((result) => {
      if (!cancelled) setLink(result);
    });
    return () => {
      cancelled = true;
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
    if (!link) return;
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
    const client = getLinkClient();
    const { error: uErr } = await client.auth.updateUser({ password });
    if (uErr) {
      setLoading(false);
      if (isLinkDead(uErr)) {
        clearLinkSession();
        setLink({ valid: false, kind: link.kind });
      } else {
        setError(friendlyError(uErr));
      }
      return;
    }

    // Hand the session to the app's shared client so the user stays signed in.
    const { data } = await client.auth.getSession();
    clearLinkSession();
    const session = data.session;
    const { error: sErr } = session
      ? await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
      : { error: true };
    setLoading(false);
    if (!session || sErr) {
      setError("Your password was saved. Please sign in with your new password.");
      return;
    }
    await routeByRole(session.user.id);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-foreground">SkillForge</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {link?.kind === "recovery"
            ? "Choose a new password for your SkillForge account."
            : "Choose a password for your SkillForge account."}
        </p>

        {!link ? (
          <p className="text-sm text-muted-foreground">Verifying your link…</p>
        ) : !link.valid ? (
          <>
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {expiredMessage(link.kind)}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Go to sign in
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              id="password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />

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
