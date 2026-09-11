import { Link } from "@tanstack/react-router";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground sm:flex-row sm:gap-4">
        <span>&copy; {year} SkillForge. All rights reserved.</span>
        <Link
          to="/privacy"
          className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          Terms of Service
        </Link>
        <Link
          to="/security"
          className="font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          Security
        </Link>
      </div>
    </footer>
  );
}
