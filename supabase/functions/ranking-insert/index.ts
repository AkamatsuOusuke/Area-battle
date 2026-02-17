import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    const { username, area } = await req.json()
    if (!username || typeof area !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const now = new Date().toISOString()

    // 既存行チェック
    const { data: existing, error: selErr } = await supabase
      .from("ranking")
      .select("area")
      .eq("username", username)
      .maybeSingle()

    if (selErr) throw selErr

    if (!existing) {
      // 新規
      const { error } = await supabase
        .from("ranking")
        .insert([{ username, area, created_at: now }])
      if (error) throw error
    } else if (area > Number(existing.area)) {
      // 最高記録のみ更新
      const { error } = await supabase
        .from("ranking")
        .update({ area, created_at: now })
        .eq("username", username)
      if (error) throw error
    }

    // 100位以下削除（FastAPI互換）
    await supabase.rpc("ranking_trim_to_top_100")

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
