/* eslint @typescript-eslint/no-explicit-any: off */
import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { currentSession, TEAM } from "../_auth";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const stages=["New","In conversation","Waiting","Connected"], statuses=["Submitted","In review","Needs info","Approved","Paid","Declined"], categories=["Travel","Meals","Software","Supplies","Other"];
const isoDate=(x:any)=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x));
export async function GET(){
 const s=await currentSession();if(!s)return json({error:"Sign in to open the team workspace."},401);if(!env.DB)return json({error:"Shared workspace is unavailable."},503);
 try{const [contacts,expenses,shifts]=await Promise.all([
  env.DB.prepare("SELECT id,owner_id AS ownerId,name,organization,role,email,phone,kind,stage,follow_up AS followUp,notes,created_at AS createdAt,updated_at AS updatedAt FROM crm_contacts ORDER BY updated_at DESC").all(),
  env.DB.prepare("SELECT id,member_id AS memberId,merchant,category,amount_cents AS amountCents,date,purpose,receipt,status,created_at AS createdAt,updated_at AS updatedAt FROM reimbursements ORDER BY date DESC").all(),
  env.DB.prepare("SELECT id,member_id AS memberId,clock_in AS clockIn,clock_out AS clockOut,breaks FROM time_shifts ORDER BY clock_in DESC LIMIT 500").all()
 ]);return json({contacts:contacts.results||[],expenses:expenses.results||[],shifts:(shifts.results||[]).map((x:any)=>({...x,breaks:JSON.parse(x.breaks||"[]")})),members:TEAM,currentMemberId:s.memberId});}
 catch{return json({error:"Couldn’t load the shared workspace. Refresh to try again."},503)}
}
export async function POST(req:NextRequest){
 const s=await currentSession();if(!s)return json({error:"Sign in to use the team workspace."},401);if(!env.DB)return json({error:"Shared workspace is unavailable."},503);
 let v:any;try{v=await req.json()}catch{return json({error:"Check the submitted details."},400)}
 const db=env.DB,now=Date.now();
 try{
 switch(v.action){
 case "contact_save":{
  if(typeof v.name!=="string"||!v.name.trim()||v.name.length>120||!stages.includes(v.stage)||typeof v.notes!=="string"||v.notes.length>2000||typeof v.organization!=="string"||v.organization.length>120||typeof v.role!=="string"||v.role.length>120||typeof v.email!=="string"||v.email.length>180||typeof v.phone!=="string"||v.phone.length>60||!['Coworker','Partner','Lead','Other'].includes(v.kind)||v.followUp&&!isoDate(v.followUp))return json({error:"Check the contact details and try again."},400);
  const id=String(v.id||crypto.randomUUID());const old=v.id?await db.prepare("SELECT owner_id AS ownerId FROM crm_contacts WHERE id=?").bind(id).first<any>():null;if(old&&old.ownerId!==s.memberId)return json({error:"Only the contact owner can edit it."},403);
  await db.prepare("INSERT INTO crm_contacts (id,owner_id,name,organization,role,email,phone,kind,stage,follow_up,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,organization=excluded.organization,role=excluded.role,email=excluded.email,phone=excluded.phone,kind=excluded.kind,stage=excluded.stage,follow_up=excluded.follow_up,notes=excluded.notes,updated_at=excluded.updated_at").bind(id,s.memberId,v.name.trim(),v.organization,v.role,v.email,v.phone,v.kind,v.stage,v.followUp||"",v.notes,old?now:now,now).run();return json({ok:true,id});}
 case "contact_delete":{const r=await db.prepare("DELETE FROM crm_contacts WHERE id=? AND owner_id=?").bind(v.id,s.memberId).run();return json({ok:r.meta.changes===1});}
 case "expense_create":{
  const cents=Math.round(Number(v.amount)*100);if(typeof v.merchant!=="string"||!v.merchant.trim()||v.merchant.length>120||!categories.includes(v.category)||!Number.isInteger(cents)||cents<=0||cents>100000000||!isoDate(v.date)||typeof v.purpose!=="string"||!v.purpose.trim()||v.purpose.length>1000||typeof v.receipt!=="string"||v.receipt.length>1000)return json({error:"Add the merchant, amount, date, category, and business purpose."},400);
  const id=`FOM-${v.date.replaceAll("-","")}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;await db.prepare("INSERT INTO reimbursements (id,member_id,merchant,category,amount_cents,date,purpose,receipt,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id,s.memberId,v.merchant.trim(),v.category,cents,v.date,v.purpose.trim(),v.receipt,"Submitted",now,now).run();return json({ok:true,id});}
 case "expense_status":{if(!statuses.includes(v.status))return json({error:"Choose a valid status."},400);const r=await db.prepare("UPDATE reimbursements SET status=?,updated_at=? WHERE id=?").bind(v.status,now,v.id).run();return json({ok:r.meta.changes===1});}
 case "clock_in":{const live=await db.prepare("SELECT id FROM time_shifts WHERE member_id=? AND clock_out IS NULL LIMIT 1").bind(s.memberId).first();if(live)return json({error:"You already have an open shift."},409);const id=crypto.randomUUID();await db.prepare("INSERT INTO time_shifts (id,member_id,clock_in,clock_out,breaks) VALUES (?,?,?,NULL,'[]')").bind(id,s.memberId,now).run();return json({ok:true,id});}
 case "clock_out":{const row=await db.prepare("SELECT id,breaks FROM time_shifts WHERE member_id=? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1").bind(s.memberId).first<any>();if(!row)return json({error:"There is no open shift."},409);const breaks=JSON.parse(row.breaks||"[]");if(breaks.at(-1)?.end===null)breaks[breaks.length-1].end=now;await db.prepare("UPDATE time_shifts SET clock_out=?,breaks=? WHERE id=? AND member_id=?").bind(now,JSON.stringify(breaks),row.id,s.memberId).run();return json({ok:true});}
 case "break_start":case "break_end":{const row=await db.prepare("SELECT id,breaks FROM time_shifts WHERE member_id=? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1").bind(s.memberId).first<any>();if(!row)return json({error:"Clock in before recording a break."},409);const breaks=JSON.parse(row.breaks||"[]");if(v.action==="break_start"){if(breaks.at(-1)?.end===null)return json({error:"Your break is already running."},409);breaks.push({start:now,end:null})}else{if(breaks.at(-1)?.end!==null)return json({error:"You don’t have a break in progress."},409);breaks[breaks.length-1].end=now}await db.prepare("UPDATE time_shifts SET breaks=? WHERE id=? AND member_id=?").bind(JSON.stringify(breaks),row.id,s.memberId).run();return json({ok:true});}
 default:return json({error:"Unknown workspace action."},400);
 }}catch{return json({error:"Couldn’t save that change. Your form is still here; try again."},503)}
}
