import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

serve(async (req) => {
  try {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  const { coords } = await req.json()

  function polygonArea(points: number[][]) {
    let area = 0
    for (let i = 0; i < points.length - 1; i++) {
      area +=
        points[i][0] * points[i + 1][1] -
        points[i + 1][0] * points[i][1]
    }
    return Math.abs(area / 2)
  }

  const area = polygonArea(coords)

  return new Response(
    JSON.stringify({ area }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})
