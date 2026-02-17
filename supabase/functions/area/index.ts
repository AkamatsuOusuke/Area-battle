import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
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
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  )
})
