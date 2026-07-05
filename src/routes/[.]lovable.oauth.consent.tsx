import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string; logo_uri?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

function oauth(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) {
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-foreground">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl font-semibold text-foreground">
        Connect {clientName} to your SkillForge account
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        This lets {clientName} read your SkillForge assignments, courses, and profile as you.
      </p>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Working…" : "Approve"}
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          Deny
        </button>
      </div>
    </main>
  );
}
