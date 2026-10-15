import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, authLink } from "@/components/AuthCard";
import { PasswordField, TextField } from "@/components/AuthField";
import { focusFirstError } from "@/lib/forms";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — SkillForge" },
      { name: "description", content: "Sign in to your SkillForge account." },
    ],
  }),
  component: LoginPage,
});

/** Only ever send people to a path on this site, never to a URL someone supplied. */
function safeNext(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByRole(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeByRole(userId: string) {
    const target = safeNext(next);
    if (target) {
      window.location.assign(target);
      return;
    }
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

    // Checked here so an empty field is answered instantly, rather than by a
    // round trip that comes back saying the password was wrong.
    const found: typeof errors = {};
    if (!email.trim()) found.email = "Enter the email address you were invited with.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(["email", "password"], found);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error || !data.user) {
      /*
       * One message for both a wrong address and a wrong password, on purpose:
       * saying which was wrong tells anyone who asks whether an address has an
       * account here.
       */
      setErrors({
        form: "That email and password don't match an account. Check both and try again.",
      });
      return;
    }
    await routeByRole(data.user.id);
  }

  return (
    <AuthCard
      title="Sign in"
      description="Sign in to see the training assigned to you."
      footer={
        <>
          New to SkillForge?{" "}
          <Link to="/signup" className={authLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
          <p className="mt-2 text-small">
            <Link to="/forgot-password" className={authLink}>
              Forgot your password?
            </Link>
          </p>
        </div>

        {errors.form && <Alert variant="error">{errors.form}</Alert>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
