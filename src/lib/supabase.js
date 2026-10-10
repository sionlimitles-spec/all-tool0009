"use client";

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseReady = URL.startsWith("https://") && KEY.length > 20 && KEY.startsWith("eyJ");

export const supabase = supabaseReady
  ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function signUp(email, password) {
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { data };
  } catch (e) { return { error: e.message }; }
}

export async function signIn(email, password) {
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { data };
  } catch (e) { return { error: e.message }; }
}

export async function signOut() {
  if (!supabase) return;
  try { await supabase.auth.signOut(); } catch {}
}

export async function getUser() {
  if (!supabase) return null;
  try { const { data } = await supabase.auth.getUser(); return data?.user || null; }
  catch { return null; }
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  try {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user || null));
    return () => { try { data.subscription.unsubscribe(); } catch {} };
  } catch { return () => {}; }
}

export async function cloudGetFavorites(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase.from("favorites").select("tool_id").eq("user_id", userId);
    if (error) return [];
    return (data || []).map((x) => x.tool_id);
  } catch { return []; }
}

export async function cloudAddFavorite(userId, toolId) {
  if (!supabase || !userId) return false;
  try {
    const { data: ex } = await supabase.from("favorites").select("id").eq("user_id", userId).eq("tool_id", toolId).maybeSingle();
    if (ex) return true;
    const { error } = await supabase.from("favorites").insert({ user_id: userId, tool_id: toolId });
    return !error;
  } catch { return false; }
}

export async function cloudRemoveFavorite(userId, toolId) {
  if (!supabase || !userId) return false;
  try {
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("tool_id", toolId);
    return !error;
  } catch { return false; }
}
