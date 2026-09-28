/* eslint @typescript-eslint/no-explicit-any: off */
import {NextRequest,NextResponse} from "next/server";
import {env} from "cloudflare:workers";
import {currentSession} from "../_auth";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const equal=(a:string,b:string)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
async function gate(code:unknown){
 const s=await currentSession();if(!s)return{error:json({error:"Sign in first."},401)};
 if(s.memberId!=="golam")return{error:json({error:"This portal is for the admin account."},403)};
 if(!env.DB||!env.ADMIN_PORTAL_CODE)return{error:json({error:"Admin access is not configured."},503)};
 const now=Date.now(),prior=await env.DB.prepare("SELECT started_at AS startedAt,count FROM login_attempts WHERE account_id=?").bind(s.accountId).first<{startedAt:number;count:number}>(),count=prior&&now-prior.startedAt<15*60_000?prior.count:0;
 if(count>=8)return{error:json({error:"Too many attempts. Wait 15 minutes and try again."},429)};
 if(typeof code!=="string"||!equal(code,env.ADMIN_PORTAL_CODE)){await env.DB.prepare("INSERT INTO login_attempts (account_id,started_at,count) VALUES (?,?,1) ON CONFLICT(account_id) DO UPDATE SET started_at=excluded.started_at,count=CASE WHEN login_attempts.started_at<? THEN 1 ELSE login_attempts.count+1 END").bind(s.accountId,now,now-15*60_000).run();return{error:json({error:"That admin code didn’t match."},401)}}
 await env.DB.prepare("DELETE FROM login_attempts WHERE account_id=?").bind(s.accountId).run();return{s};
}
export async function POST(req:NextRequest){
 let input:any;try{input=await req.json()}catch{return json({error:"Admin request was invalid."},400)}
 const access=await gate(input?.code);if(access.error)return access.error;const db=env.DB!;
 try{
  if(input.action==="overview"){
   const [members,expenses,shifts,events,contacts]=await Promise.all([
    db.prepare("SELECT id,name,color,account_id AS accountId,created_at AS createdAt FROM team_members ORDER BY name").all(),
    db.prepare("SELECT id,member_id AS memberId,merchant,category,amount_cents AS amountCents,date,purpose,status,created_at AS createdAt FROM reimbursements ORDER BY date DESC LIMIT 300").all(),
    db.prepare("SELECT id,member_id AS memberId,clock_in AS clockIn,clock_out AS clockOut,breaks FROM time_shifts ORDER BY clock_in DESC LIMIT 300").all(),
    db.prepare("SELECT id,member_id AS memberId,title,date,start,end,kind FROM team_events WHERE date>=? ORDER BY date,start LIMIT 500").bind(new Date().toISOString().slice(0,10)).all(),
    db.prepare("SELECT id,owner_id AS ownerId,name,organization,stage,follow_up AS followUp,updated_at AS updatedAt FROM crm_contacts ORDER BY updated_at DESC LIMIT 300").all()
   ]);
   return json({members:members.results||[],expenses:expenses.results||[],shifts:(shifts.results||[]).map((x:any)=>({...x,breaks:JSON.parse(x.breaks||"[]")})),events:events.results||[],contacts:contacts.results||[]});
  }
  if(input.action==="reset_login"&&typeof input.memberId==="string"){
   if(input.memberId==="golam")return json({error:"The admin account can’t reset itself here."},400);
   await db.batch([db.prepare("DELETE FROM team_sessions WHERE member_id=?").bind(input.memberId),db.prepare("UPDATE team_members SET account_id=NULL WHERE id=?").bind(input.memberId)]);return json({ok:true});
  }
  if(input.action==="expense_status"&&typeof input.id==="string"&&["Submitted","In review","Needs info","Approved","Paid","Declined"].includes(input.status)){const r=await db.prepare("UPDATE reimbursements SET status=?,updated_at=? WHERE id=?").bind(input.status,Date.now(),input.id).run();return json({ok:r.meta.changes===1})}
  if(input.action==="expense_delete"&&typeof input.id==="string"){const r=await db.prepare("DELETE FROM reimbursements WHERE id=?").bind(input.id).run();return json({ok:r.meta.changes===1})}
  if(input.action==="event_delete"&&typeof input.id==="string"){const r=await db.prepare("DELETE FROM team_events WHERE id=? AND kind!='class'").bind(input.id).run();return json({ok:r.meta.changes===1})}
  if(input.action==="clock_close"&&typeof input.id==="string"){const r=await db.prepare("UPDATE time_shifts SET clock_out=? WHERE id=? AND clock_out IS NULL").bind(Date.now(),input.id).run();return json({ok:r.meta.changes===1})}
  if(input.action==="contact_delete"&&typeof input.id==="string"){const r=await db.prepare("DELETE FROM crm_contacts WHERE id=?").bind(input.id).run();return json({ok:r.meta.changes===1})}
  return json({error:"Unknown admin action."},400);
 }catch{return json({error:"Admin action couldn’t be completed. Refresh and try again."},503)}
}
