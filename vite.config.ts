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
      // Build-only server bundler; deploys to Cloudflare Workers unless a
      // NITRO_PRESET env var picks another target.
      command === "build" && nitro({ defaultPreset: "cloudflare-module" }),
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
