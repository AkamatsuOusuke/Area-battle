import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://area-battle.pages.dev",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Login required" }), { status: 401, headers: corsHeaders });
    }

    // ① JWT検証用：anon + auth.getUser()
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    const user_id = userRes.user.id;

    const body = await req.json();
    const username = body?.username;
    const area = body?.area;

    if (!username || typeof username !== "string" || typeof area !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    // ② DB書き込み
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, 
    );

    // A) runs：必ずinsert
    const { error: insErr } = await db.from("ranking_runs").insert({
      user_id,
      username,
      area,
      created_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;

    // B) best：上回った時だけ更新
    const { data: bestRow, error: selErr } = await db
      .from("ranking_best")
      .select("area")
      .eq("user_id", user_id)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!bestRow || area > bestRow.area) {
      const { error: upErr } = await db.from("ranking_best").upsert(
        { user_id, username, area, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (upErr) throw upErr;
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});