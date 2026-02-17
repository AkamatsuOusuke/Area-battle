import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import area from "https://esm.sh/@turf/area@6.5.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  try {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  const { coords } = await req.json()
  if (!Array.isArray(coords) || coords.length < 4) {
    return new Response(JSON.stringify({ error: "Invalid coords" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // coords は [lng, lat] の配列想定（あなたの points と同じ）
  const poly = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  } as const

  const m2 = area(poly) // ← m²
    return new Response(JSON.stringify({ area: m2 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
