// supabase 初期化
let sb;

// Supabaseの準備ができるまで待機する関数
async function waitForSupabase() {
    return new Promise((resolve) => {
        const check = () => {
            const sp = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            if (sp) {
                resolve(sp);
            } else {
                console.log("Supabaseを待っています...");
                setTimeout(check, 100); // 0.1秒ごとに確認
            }
        };
        check();
    });
}

function initSupabase(){
    // window.supabase または supabase が存在するかチェック
    const supabaseClient = window.supabase || supabase; 
    
    if (!supabaseClient) {
        console.error("Supabase SDK not found");
        return false;
    }

    const SUPABASE_URL = "https://jysjolovimtyvimkhfpd.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c2pvbG92aW10eXZpbWtoZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDA5MzQsImV4cCI6MjA4NjI3NjkzNH0.YDrF0H_mq99R5LIhcFVe4EAc-Z0ZwyB-WUH9XwdqDTo";

    window.sb = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); //windowをつけると、他のjsから使えるようになる
    sb = window.sb;
    return true;
}

// サインアップ(新規登録)
async function signUp(){
    const email = prompt("メールアドレスを入力");
    const password = prompt("パスワードを入力");

    if (!email || !password) {
    alert("メールアドレスとパスワードは必須です");
    return;
    }

    // ボタンを無効化する
    const btn = event.target; // クリックされたボタンを取得
    btn.disabled = true;
    btn.textContent = "登録中...";

    const { data, error } = await sb.auth.signUp({
    email: email,
    password: password,
    });// メールアドレスとパスワードをsupabaseに登録

    if (error) {
    alert("登録エラー: " + error.message);
    btn.disabled = false;
    btn.textContent = originalText;
    } else {
    alert("登録成功！メールを確認してください");
    // 成功時、メール認証待ちになるので「確認待ち」の状態にする
    btn.textContent = "メール確認待ち";
    }
}


// サインイン(ログイン)
async function signIn(){
    const email = prompt("メールアドレスを入力");
    const password = prompt("パスワードを入力");

    if (!email || !password) {
        alert("メールアドレスとパスワードは必須です");
        return;
    }

    // ボタンを無効化
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = "ログイン中...";

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
    });// 入力したメールアドレスとパスワードでログイン

    if (error) {
        alert("ログインエラー: " + error.message);
        btn.disabled = false;
        btn.textContent = originalText;
    } else {
        alert("ログイン成功！ようこそ " + data.user.email);
        document.getElementById("username").value = data.user.email; // HUDにコピー
        document.getElementById("titleScreen").style.display = "none"; // タイトル画面消す
        startGPS();
    }
}


// ページ読み込み時にログイン状態確認
async function checkLogin() {
    const { data } = await sb.auth.getSession();
    if (data.session) {
    // すでにログイン済み
    document.getElementById("username").value = data.session.user.email;
    document.getElementById("titleScreen").style.display = "none";
    startGPS();// map.js
    }
}// ページをリロードしてもログイン状態を確認


// GPS開始(ゲストログイン)とGPS開始の切り替え
async function updateStartButton(){
    const { data } = await sb.auth.getUser();
    const user = data.user;

    const btn = document.getElementById("startGameBtn");

    if(!btn) return;

    if(user){
        btn.innerHTML = "GPS開始" ;
    } else {
        btn.innerHTML = "GPS開始<br><span style='font-size: 0.7em;'>（ゲストログイン）</span>";
    }
}


// ログイン時のUI切り替え
async function updateLoginUI(){
    const { data } = await sb.auth.getUser();
    const user = data.user;

    // 
    const inputs = document.querySelectorAll(".playerNameInput");

    if(user){
        inputs.forEach(el => el.style.display = "none");
    } else {
        inputs.forEach(el => el.style.display = "block");
    }
}

// 前回の名前保存
async function restoreName(){

    const { data } = await sb.auth.getUser();
    const user = data.user;

    if(user){
        const name = user.user_metadata?.display_name;

        if(name){
        document.getElementById("username").value = name;
        }
    } else {
        const guest = localStorage.getItem("guest_name");

        if(guest){
        document.getElementById("titlename").value = guest;
        document.getElementById("username").value = guest;
        }
    }
}

// すべての初期化を一つの流れにまとめる
window.addEventListener('load', async () => {
    try {
        // 1. Supabaseの本体が見つかるまで待つ
        const supabaseLib = await waitForSupabase();

        const SUPABASE_URL = "https://jysjolovimtyvimkhfpd.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c2pvbG92aW10eXZpbWtoZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDA5MzQsImV4cCI6MjA4NjI3NjkzNH0.YDrF0H_mq99R5LIhcFVe4EAc-Z0ZwyB-WUH9XwdqDTo";

        // 2. クライアント作成
        window.sb = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        sb = window.sb;
        
        console.log("✅ Supabase Ready!");

        // 3. auth監視の設定
        sb.auth.onAuthStateChange((event, session) => {
            if (typeof updateStartButton === 'function') updateStartButton();
            if (typeof updateLoginUI === 'function') updateLoginUI();
        });

        // 4. その他の初期化関数を順番に実行
        await checkLogin();
        await updateStartButton();
        await updateLoginUI();
        await restoreName();
        await loadRanking();

    } catch (e) {
        console.error("🚫 初期化中にエラーが発生:", e);
    }
});