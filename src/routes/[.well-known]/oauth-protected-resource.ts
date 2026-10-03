import { createFileRoute } from "@tanstack/react-router";
import { protectedResourceMetadata } from "@/lib/mcp/auth";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => Response.json(protectedResourceMetadata(new URL(request.url).origin)),
    },
  },
});
