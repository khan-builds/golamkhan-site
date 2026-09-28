import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../app/chatgpt-auth";
import { TEAM, currentSession, setSession } from "../_auth";
export const dynamic = "force-dynamic";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET() {
  const session=await currentSession(); return json({member:session?{id:session.memberId,name:session.name,color:session.color}:null,team:TEAM});
}
export async function POST(request:NextRequest) {
  const user=await getChatGPTUser(); if(!user)return json({error:"Sign in with ChatGPT first."},401);
  if(!env.DB)return json({error:"Team storage is unavailable."},503);
  let data: Record<string,unknown>;try{data=await request.json()}catch{return json({error:"Enter your intern name and PIN."},400)}
  const member=TEAM.find(x=>x.id===data?.memberId), pin=String(data?.pin||"");
  if(!member||!/^\d{6}$/.test(pin))return json({error:"Choose your name and enter the six-digit PIN."},400);
  const now=Date.now(),old=await env.DB.prepare("SELECT started_at AS startedAt,count FROM login_attempts WHERE account_id=?").bind(user.userId).first<{startedAt:number;count:number}>();
  const count=old&&now-old.startedAt<15*60_000?old.count:0;
  if(count>=8)return json({error:"Too many tries. Wait 15 minutes before trying again."},429);
  let pins:Record<string,string>={};try{pins=JSON.parse(env.INTERN_PINS||"{}")}catch{}
  const expected=pins[member.id]||"", matches=expected.length===pin.length;
  let ok=false;if(matches){let diff=0;for(let i=0;i<pin.length;i++)diff|=pin.charCodeAt(i)^expected.charCodeAt(i);ok=diff===0}
  if(!ok){await env.DB.prepare("INSERT INTO login_attempts (account_id,started_at,count) VALUES (?,?,1) ON CONFLICT(account_id) DO UPDATE SET started_at=excluded.started_at,count=CASE WHEN login_attempts.started_at<? THEN 1 ELSE login_attempts.count+1 END").bind(user.userId,now,now-15*60_000).run();return json({error:"That name and PIN don’t match."},401)}
  await env.DB.prepare("INSERT OR IGNORE INTO team_members (id,name,color,account_id,created_at) VALUES (?,?,?,?,?)").bind(member.id,member.name,member.color,user.userId,now).run();
  const row=await env.DB.prepare("SELECT account_id AS accountId FROM team_members WHERE id=?").bind(member.id).first<{accountId:string|null}>();
  if(row?.accountId!==user.userId)return json({error:"This intern profile is already linked to another sign-in. Ask Golam to reset access."},403);
  await env.DB.prepare("DELETE FROM login_attempts WHERE account_id=?").bind(user.userId).run();
  await setSession(member.id,user.userId);
  return json({member:{id:member.id,name:member.name,color:member.color},team:TEAM});
}
