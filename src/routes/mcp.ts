import { createFileRoute } from "@tanstack/react-router";
import { handleMcpRequest } from "@/lib/mcp";

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      // ANY: methods missing from `handlers` would fall through to SPA HTML.
      ANY: ({ request }) => handleMcpRequest(request),
    },
  },
});
