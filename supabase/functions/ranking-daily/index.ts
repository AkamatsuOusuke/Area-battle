import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  };
}

function startOfDayJstIso(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const day = jst.getDay();
  const diffFromMon = (day + 6) % 7;
  jst.setDate(jst.getDate() - diffFromMon);
  jst.setHours(0, 0, 0, 0);
  const startUtc = new Date(jst.getTime() - 9 * 3600 * 1000);
  return startUtc.toISOString();
}

serve(async (req) => {

  const origin = req.headers.get("origin");

  // ✅ preflight対応（これが一番重要）
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(origin),
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const fromIso = startOfDayJstIso();

  const { data, error } = await supabase
    .from("ranking")
    .select("username, area")
    .gte("created_at", fromIso)
    .order("area", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }

  return new Response(JSON.stringify(data ?? []), {
    headers: corsHeaders(origin),
  });
});