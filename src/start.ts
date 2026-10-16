import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/*
 * Server functions are same-origin RPC endpoints, and without this nothing stops
 * a cross-site request reaching one — which matters most for `createEmployee` and
 * `submitQuiz`, both of which write with the service role.
 *
 * TanStack Start applies its own CSRF middleware only when a project exports no
 * `startInstance`. This file exports one, so the default was skipped and the dev
 * server warned on every run. This is that warning's own fix, not
 * `disableCsrfMiddlewareWarning`.
 *
 * The filter leaves page requests alone: a 403 on a `router` request would break
 * ordinary navigation from a link on another site.
 *
 * How it decides, in order: `Sec-Fetch-Site` if the browser sent one, else the
 * `Origin` header against this request's own origin, else `Referer`. A request
 * carrying none of the three is refused, which is what we want — every caller
 * here is a browser. `npm run verify:security` proves both directions.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  // errorMiddleware first, so a throw from inside CSRF still gets the branded page.
  // CSRF *returns* its 403 rather than throwing, so it passes back through untouched.
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
