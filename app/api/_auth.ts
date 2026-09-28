import { cookies } from "next/headers";
import { getChatGPTUser } from "../../app/chatgpt-auth";
import { env } from "cloudflare:workers";

const COOKIE = "fomo_team_session";
const MAX_AGE = 60 * 60 * 24 * 7;
export const TEAM = [
  { id: "pranav", name: "Pranav", color: "#4f83f1" },
  { id: "golam", name: "Golam", color: "#315fda" },
  { id: "kerem", name: "Kerem", color: "#71a2f7" },
  { id: "hammaad", name: "Hammaad", color: "#47a9bd"},
] as const;
export async function currentSession() {
  const user = await getChatGPTUser();
  if (!user || !env.DB) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await digest(token);
  const row = await env.DB.prepare("SELECT s.member_id AS memberId, m.name, m.color FROM team_sessions s JOIN team_members m ON m.id=s.member_id WHERE s.token_hash=? AND s.account_id=? AND s.expires_at>? LIMIT 1").bind(tokenHash, user.userId, Date.now()).first<{memberId:string;name:string;color:string}>();
  return row ? { ...row, color: TEAM.find((m)=>m.id===row.memberId)?.color ?? row.color, accountId: user.userId } : null;
}
export async function digest(value:string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function setSession(memberId:string, accountId:string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-","")}`;
  const db = env.DB!;
  await db.prepare("INSERT INTO team_sessions (token_hash,account_id,member_id,expires_at) VALUES (?,?,?,?)").bind(await digest(token),accountId,memberId,Date.now()+MAX_AGE*1000).run();
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:MAX_AGE});
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
