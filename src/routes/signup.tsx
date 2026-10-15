import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { signupCompanyAdmin } from "@/lib/signup.functions";
import { AuthCard, authLink } from "@/components/AuthCard";
import { PasswordField, TextField } from "@/components/AuthField";
import { focusFirstError } from "@/lib/forms";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — SkillForge" },
      { name: "description", content: "Create your SkillForge company account." },
    ],
  }),
  component: SignupPage,
});

/** The shortest password Supabase will accept, stated where it is asked for. */
const MIN_PASSWORD = 8;

type Errors = {
  name?: string;
  company?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

function SignupPage() {
  const navigate = useNavigate();
  const signup = useServerFn(signupCompanyAdmin);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Every problem at once, beside the field it belongs to. */
  function validate(): Errors {
    const found: Errors = {};
    if (!name.trim()) found.name = "Enter your name.";
    if (!companyName.trim()) found.company = "Enter your company's name.";
    if (!email.trim()) found.email = "Enter your work email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      found.email = "That doesn't look like an email address. Check for a typo.";
    if (!password) found.password = "Choose a password.";
    else if (password.length < MIN_PASSWORD)
      found.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (confirm !== password) found.confirm = "Both passwords must match.";
    return found;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(["name", "company", "email", "password", "confirm"], found);
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        data: {
          name: name.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          password,
        },
      });
      if (!result.ok) {
        setErrors({ form: result.error });
        setLoading(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        // The account exists, so send them to sign in rather than make it twice.
        navigate({ to: "/login" });
        return;
      }
      navigate({ to: "/admin/dashboard" });
    } catch {
      setErrors({ form: "Couldn't create the account. Check your connection and try again." });
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create a company account"
      // Says what it makes, so nobody who was invited fills it in by mistake
      // and ends up an admin of a company of one with their invite unused.
      description="This sets up a new company on SkillForge, with you as its admin. If you were invited to join a company, use the invite link in your email instead."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={authLink}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          id="name"
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={errors.name}
        />
        <TextField
          id="company"
          label="Company name"
          autoComplete="organization"
          value={companyName}
          onChange={setCompanyName}
          error={errors.company}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
