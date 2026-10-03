import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Labelled password input with a show/hide toggle. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
