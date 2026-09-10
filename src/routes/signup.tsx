import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signupCompanyAdmin } from "@/lib/signup.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — SkillForge" },
      { name: "description", content: "Create your SkillForge company account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const signup = useServerFn(signupCompanyAdmin);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!name.trim() || !companyName.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        data: { name: name.trim(), companyName: companyName.trim(), email: trimmedEmail, password },
      });
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInErr) {
        setError("Account created. Please sign in.");
        setLoading(false);
        navigate({ to: "/login" });
        return;
      }
      navigate({ to: "/admin/dashboard" });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-foreground">SkillForge</h1>
        <p className="mb-6 text-sm text-muted-foreground">Create your company account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="name" label="Full name" value={name} onChange={setName} autoComplete="name" />
          <Field id="company" label="Company name" value={companyName} onChange={setCompanyName} autoComplete="organization" />
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField id="confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

          {error && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id, label, value, onChange, type = "text", autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
