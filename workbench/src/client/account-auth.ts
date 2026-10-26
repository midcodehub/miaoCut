"use client";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const clients=new Map<string,SupabaseClient>();
export const accountConfigured=()=>!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function accountClient(storageKey:string) {
  if(!accountConfigured())return null;
  if(!clients.has(storageKey)) {
    const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
      auth:{storageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'},
    });
    client.auth.onAuthStateChange(()=>window.dispatchEvent(new Event('mc.workbench-auth')));
    clients.set(storageKey,client);
  }
  return clients.get(storageKey)!;
}
export async function accountToken(storageKey:string) {
  let saved;
  try {saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{/* No usable session. */}
  // Explicit loopback/staging transport fixtures have no refresh credential and never enter real Auth.
  if(saved?.access_token&&!saved.refresh_token)return saved.access_token as string;
  const client=accountClient(storageKey);
  if(!client)return saved?.access_token as string|undefined;
  const {data,error}=await client.auth.getSession();
  return error?undefined:data.session?.access_token;
}
