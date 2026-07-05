import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyAssignments from "./tools/list-my-assignments";
import getMyProfile from "./tools/get-my-profile";
import listCompanyCourses from "./tools/list-company-courses";

// The OAuth issuer MUST be the direct Supabase host. See app-mcp-server-authoring.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "skillforge-mcp",
  title: "SkillForge",
  version: "0.1.0",
  instructions:
    "Tools for SkillForge — assigned training courses, quiz results, and company course catalog for the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyAssignments, listCompanyCourses],
});
