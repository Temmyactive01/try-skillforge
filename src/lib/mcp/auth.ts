import { createClient } from "@supabase/supabase-js";
import type { McpUser } from "./supabase-for-user";

export const MCP_PATH = "/mcp";
export const METADATA_PATH = "/.well-known/oauth-protected-resource";

// Supabase Auth is the OAuth authorization server; this app is only the
// protected resource. Clients discover the issuer through RFC 9728 metadata.
export function oauthIssuer() {
  return `${process.env.SUPABASE_URL}/auth/v1`;
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [oauthIssuer()],
    bearer_methods_supported: ["header"],
    resource_name: "SkillForge",
  };
}

// Verifies a Supabase access token for a signed-in user. Anonymous tokens
// (such as the publishable key) are rejected because they carry no user.
export async function verifyBearer(request: Request): Promise<McpUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub || claims.role !== "authenticated") return null;
    return { userId: claims.sub, token };
  } catch {
    // getClaims throws (rather than returning an error) on malformed JWTs.
    return null;
  }
}

export function unauthorized(origin: string, invalidToken: boolean) {
  const params = [`resource_metadata="${origin}${METADATA_PATH}"`];
  if (invalidToken) params.push('error="invalid_token"');
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer ${params.join(", ")}`,
    },
  });
}
