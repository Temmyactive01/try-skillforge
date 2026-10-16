import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // `npm run build:dev`: unminified-name development build.
  const isDevBuild = command === "build" && mode === "development";

  // Inline VITE_* env vars into both the client and the SSR server bundle.
  const envDefine = Object.fromEntries(
    Object.entries(loadEnv(mode, process.cwd(), "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    plugins: [
      tailwindcss(),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
        // Fail the build if client code imports server-only modules.
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      /*
       * Build-only server bundler. Netlify is the deploy target as of Stage 5,
       * so it is the default here too: a local `npm run build` then produces
       * exactly what production runs, rather than a Cloudflare bundle nobody
       * deploys. Nitro also auto-detects Netlify on their builder, and
       * netlify.toml sets NITRO_PRESET as well, so the target is stated three
       * times over rather than inferred.
       *
       * Cloudflare Workers still works — `NITRO_PRESET=cloudflare-module npm run
       * build` — and that path is deliberately kept alive, because Netlify's
       * free plan is a hard 300-credit cap that pauses the site when it runs
       * out. See docs/launch-plan.md, item 3.
       */
      command === "build" && nitro({ defaultPreset: "netlify" }),
      viteReact(),
    ],
    define: envDefine,
    ...(isDevBuild
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
          build: { rolldownOptions: { output: { keepNames: true } } },
        }
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      tsconfigPaths: true,
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
  };
});
