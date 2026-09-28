/* eslint @typescript-eslint/no-explicit-any: off */
import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import classBlocks from "../../../lib/class-blocks.json";
import { currentSession } from "../_auth";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const validDate=(v:string)=>/^202[6-9]-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v));
const validTime=(v:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
async function seedClasses(){
  if(!env.DB)return;
  const exists=await env.DB.prepare("SELECT id FROM calendar_imports WHERE id=?").bind("golam-nyu-fall-2026-v2").first();
  if(exists)return;
  await env.DB.prepare("DELETE FROM team_events WHERE member_id=? AND kind='class' AND id LIKE 'nyu-%'").bind("golam").run();
  const stmts=(classBlocks as {date:string;start:string;end:string}[]).map((e)=>env.DB!.prepare("INSERT OR IGNORE INTO team_events (id,member_id,title,date,start,end,kind,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(`nyu-${e.date}-${e.start.replace(":","")}`,"golam","Class",e.date,e.start,e.end,"class",Date.now()));
  for(let i=0;i<stmts.length;i+=40)await env.DB.batch(stmts.slice(i,i+40));
  await env.DB.prepare("INSERT OR IGNORE INTO calendar_imports (id,imported_at) VALUES (?,?)").bind("golam-nyu-fall-2026-v2",Date.now()).run();
}
export async function GET(){
 const session=await currentSession();if(!session)return json({error:"Sign in and enter your intern PIN."},401);if(!env.DB)return json({error:"Shared schedule is unavailable."},503);
 try{await seedClasses();const result=await env.DB.prepare("SELECT id,member_id AS memberId,title,date,start,end,kind FROM team_events WHERE date>=? AND date<=? ORDER BY date,start").bind(new Date().toISOString().slice(0,10),"2026-12-31").all<any>();
  const rows=(result.results||[]).map((e:any)=>({id:e.id,memberId:e.memberId,title:e.kind==="class"||e.memberId===session.memberId?e.title:"Busy",date:e.date,start:e.start,end:e.end,kind:e.kind}));return json({events:rows});
 }catch{return json({error:"Couldn’t load the shared schedule. Refresh to try again."},503)}
}
export async function POST(req:NextRequest){
 const session=await currentSession();if(!session)return json({error:"Sign in and enter your intern PIN."},401);if(!env.DB)return json({error:"Shared schedule is unavailable."},503);
 let v:any;try{v=await req.json()}catch{return json({error:"Check the event details."},400)}
 if(!validDate(v.date)||!validTime(v.start)||!validTime(v.end)||v.end<=v.start||!['Work','Busy','Available'].includes(v.kind)||typeof v.kind!=="string")return json({error:"Add a valid date, time, and schedule type."},400);
 const id=crypto.randomUUID(),title=v.kind==='Available'?'Available':v.kind;await env.DB.prepare("INSERT INTO team_events (id,member_id,title,date,start,end,kind,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,session.memberId,title,v.date,v.start,v.end,v.kind.toLowerCase(),Date.now()).run();return json({ok:true,id});
}
export async function DELETE(req:NextRequest){
 const session=await currentSession();if(!session)return json({error:"Sign in and enter your intern PIN."},401);if(!env.DB)return json({error:"Shared schedule is unavailable."},503);
 const id=new URL(req.url).searchParams.get("id");if(!id)return json({error:"Choose an event."},400);
 const result=await env.DB.prepare("DELETE FROM team_events WHERE id=? AND member_id=? AND kind!='class'").bind(id,session.memberId).run();return json({ok:result.meta.changes===1});
}
