import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://area-battle.pages.dev",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    // 認証（Bearerトークンのみ簡易的にチェック）
    const authHeader = req.headers.get("Authorization") || ""
    // "Bearer " で始まることを確認
    if(!authHeader.startsWith("Bearer ")){
       return new Response(JSON.stringify({ error: "Login required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // supabaseクライアントは認証ヘッダーをグローバルに設定して作成
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // ユーザ情報取得でトークンの有効性を確認
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    // 認証失敗（トークン無効など）
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const user_id = userRes.user.id // ユーザIDを取得
    // 以降は user_id を使ってランキングを更新（username は supabase の auth.users テーブルから取得する想定）
    const { username, area } = await req.json()
    // バリデーション（username は文字列、area は数値であることを確認）
    if (!username || typeof area !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ここで user_id と username を紐付ける（ユーザIDはsupabase authから、usernameはリクエストから）
    const now = new Date().toISOString()

    // 既存行があれば upsert で更新、なければ新規挿入（username はユニーク制約を想定）
    const { error } = await supabase.from("ranking").upsert(
      { user_id, username, area, created_at: now },
      { onConflict: "user_id" }
    )
    if (error) throw error

    // 100位以下削除（FastAPI互換）
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

    
  } catch (err) {
    // エラーハンドリング（例外発生時にエラーメッセージを返す）
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,  
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})