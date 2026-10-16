import { useEffect, useState } from "react";

export type ViewerRole = "admin" | "employee";

/*
 * Who is reading a public page: an admin, an employee, or nobody signed in.
 *
 * The marketing pages are the one place in the app where most readers are
 * signed out, so this is written to cost a signed-out visitor nothing:
 *
 *  - It renders null on the server and on the first client pass, so the HTML
 *    a visitor is served is the signed-out header. No layout shift for them.
 *  - It looks for supabase-js's session key in localStorage *before* importing
 *    supabase-js at all. No session key, no import — so a visitor never
 *    downloads the auth client to be told they are a visitor.
 *  - The import is dynamic, so supabase-js stays out of the public pages'
 *    first load even for a signed-in reader.
 *
 * If Supabase ever changes that storage key the worst case is a signed-in
 * reader seeing "Sign in" in the marketing header. That is cosmetic: page
 * guarding is `useRequireRole`, and the real boundary is RLS in the database.
 */
function hasStoredSession() {
  try {
    return Object.keys(window.localStorage).some(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
  } catch {
    // Private browsing can refuse storage. Treat it as nobody signed in.
    return false;
  }
}

export function useViewer(): ViewerRole | null {
  const [role, setRole] = useState<ViewerRole | null>(null);

  useEffect(() => {
    if (!hasStoredSession()) return;

    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled || !profile) return;

      setRole(profile.role === "admin" ? "admin" : "employee");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
