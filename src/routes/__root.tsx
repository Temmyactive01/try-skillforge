import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { PublicPage, container } from "@/components/public/PublicPage";

function NotFoundComponent() {
  /*
   * The root head() is static, and a not-found render is not a route, so there
   * is no head to attach a title to. Setting it here is the honest version of
   * the same thing: the tab says what happened rather than "SkillForge".
   */
  useEffect(() => {
    document.title = "Page not found — SkillForge";
  }, []);

  return (
    <PublicPage>
      <section className={`${container} py-12 lg:py-16`}>
        <p className="text-small text-ink-muted">Error 404</p>
        <h1 className="mt-2 max-w-[20ch] text-heading-1 font-expanded text-ink">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-6 max-w-[60ch] text-body text-ink-muted">
          The address may be mistyped, or the page may have moved. These still work:
        </p>

        <ul className="mt-8 border-t border-steel">
          {NOT_FOUND_LINKS.map((link) => (
            <li key={link.to} className="border-b border-steel">
              <Link
                to={link.to}
                className="flex items-baseline gap-4 py-4 text-body font-medium text-temper-blue hover:underline"
              >
                {link.label}
                <span className="text-small font-normal text-ink-muted">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicPage>
  );
}

const NOT_FOUND_LINKS = [
  { to: "/", label: "Home", detail: "What SkillForge does" },
  { to: "/tour", label: "Take the tour", detail: "Five screens from the product" },
  { to: "/features", label: "Features", detail: "What is in it, and what is not" },
  { to: "/login", label: "Sign in", detail: "If you already have an account" },
] as const;

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SkillForge" },
      {
        name: "description",
        content:
          "SkillForge — assign training, track completion, and see who's done what. All in one place.",
      },
      { name: "author", content: "SkillForge" },
      { property: "og:title", content: "SkillForge" },
      {
        property: "og:description",
        content:
          "SkillForge — assign training, track completion, and see who's done what. All in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "SkillForge" },
      {
        name: "twitter:description",
        content:
          "SkillForge — assign training, track completion, and see who's done what. All in one place.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      /*
       * The tempered billet, the same mark the shells and the sign-in pages
       * use. The .ico is there for browsers that still ask for /favicon.ico by
       * name — which also stops the 404 that used to clutter the dev log.
       */
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/*
 * Picks the theme before the first paint, so dark mode never flashes white.
 * With no stored choice we follow the operating system.
 *
 * The server can't know the answer, so the markup it sends has no data-theme
 * and this script adds one. That difference is deliberate, and
 * suppressHydrationWarning below tells React to accept it on <html> rather
 * than warn on every page load.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("skillforge-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  /*
   * Marks the document once React has attached. Until then the page is just
   * server-rendered HTML: a click on a form submits it the old-fashioned way,
   * the URL gains a "?" and nothing happens. The end-to-end tests wait for
   * this attribute instead of guessing with a timeout or retrying the form.
   *
   * An effect runs only after hydration, which is exactly the moment we mean.
   * The server never sends the attribute, and <html> already carries
   * suppressHydrationWarning for the theme script, so adding it is free.
   */
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
