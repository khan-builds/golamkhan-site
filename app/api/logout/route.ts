import { NextResponse } from "next/server";
import { clearSession, currentSession } from "../_auth";
export const dynamic="force-dynamic";
export async function POST(){if(await currentSession())await clearSession();return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}})}
