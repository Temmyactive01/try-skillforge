import { cleanupE2EData } from "./helpers";

// Runs after every test run, including failed ones.
export default async function globalTeardown() {
  const removed = await cleanupE2EData();
  console.log(`Cleaned up test data: ${removed.companies} companies, ${removed.users} users.`);
}
