import { env } from "cloudflare:workers";
export function getDb() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}
