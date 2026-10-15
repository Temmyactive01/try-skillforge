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
import { AuthCard, authLink } from "@/components/AuthCard";
import { PasswordField } from "@/components/AuthField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

/** A dead link says what happened and who can give them a working one. */
function expiredMessage(kind: LinkKind) {
  if (kind === "recovery") {
    return "This reset link has expired or has already been used. Reset links work once and last an hour. Request a new one below.";
  }
  if (kind === "invite") {
    return "This invite link has expired or has already been used. Ask your admin to send you a new invite.";
  }
  return "This link has expired or has already been used. Request a new reset link below, or ask your admin for a new invite.";
}

function isLinkDead(error: AuthError) {
  return (
    isAuthSessionMissingError(error) ||
    (isAuthApiError(error) && (error.status === 401 || error.status === 403))
  );
}

function friendlyError(error: AuthError) {
  if (isAuthWeakPasswordError(error)) {
    return "That password is too easy to guess. Use at least 8 characters, with a mix of letters, numbers and symbols.";
  }
  if (error.code === "same_password") {
    return "Your new password must be different from your current one.";
  }
  if (isAuthRetryableFetchError(error)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return "Your password wasn't saved. Try again.";
}

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
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
      setErrors({ form: "Your account has no profile. Contact your administrator." });
      await supabase.auth.signOut();
      return;
    }
    navigate({ to: profile.role === "admin" ? "/admin/dashboard" : "/employee/home" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!link) return;

    const found: typeof errors = {};
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (confirm !== password) found.confirm = "Both passwords must match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const client = getLinkClient();
    const { error: uErr } = await client.auth.updateUser({ password });
    if (uErr) {
      setLoading(false);
      if (isLinkDead(uErr)) {
        clearLinkSession();
        setLink({ valid: false, kind: link.kind });
      } else {
        setErrors({ form: friendlyError(uErr) });
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
      setErrors({ form: "Your password was saved. Sign in with your new password." });
      return;
    }
    await routeByRole(session.user.id);
  }

  const recovery = link?.kind === "recovery";
  const title = recovery ? "Choose a new password" : "Set your password";
  const description = recovery
    ? "Pick a new password for your SkillForge account."
    : "Pick a password, and your SkillForge account is ready.";

  return (
    <AuthCard
      title={title}
      description={description}
      footer={
        <Link to="/login" className={authLink}>
          Back to sign in
        </Link>
      }
    >
      {!link ? (
        <p className="text-small text-ink-muted">Checking your link…</p>
      ) : !link.valid ? (
        <div className="space-y-4">
          <Alert variant="error">{expiredMessage(link.kind)}</Alert>
          {link.kind !== "invite" && (
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            hint="At least 8 characters."
          />
          <PasswordField
            id="confirm"
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
          />

          {errors.form && <Alert variant="error">{errors.form}</Alert>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Set password and continue"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
