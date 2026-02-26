import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://area-battle.pages.dev", // ←まずは固定でOK
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function startOfDayJstIso(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  jst.setHours(0, 0, 0, 0);
  const startUtc = new Date(jst.getTime() - 9 * 3600 * 1000);
  return startUtc.toISOString();
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const fromIso = startOfDayJstIso();

  const { data, error } = await supabase
    .from("ranking") // ←ここだけ重要
    .select("username, area")
    .gte("created_at", fromIso)
    .order("area", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data ?? []), {
    headers: { "Content-Type": "application/json" },
  });
});