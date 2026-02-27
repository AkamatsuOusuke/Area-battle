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
    const originalText = btn.textContent; // 元のテキストを覚えておく
    btn.textContent = "登録中...";

    const { data, error } = await sb.auth.signUp({
        email: email,
        password: password,
    });// メールアドレスとパスワードをsupabaseに登録

    if (error) {
    alert("登録エラー: " + error.message);
    btn.disabled = false; // ボタン復活
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
    const originalText = btn.textContent;
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
        // document.getElementById("username").value = data.user.email; // HUDにコピー
        await updateLoginUI(); //表示を切り替える
        // document.getElementById("titleScreen").style.display = "none"; // タイトル画面消す
        // startGPS();

        // ボタンの表示だけ元に戻しておく（ログイン完了を示すため）
        btn.disabled = false;
        btn.textContent = "ログイン済み";
    }
}

// Googleログイン
async function loginWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      // 省略OK（Supabase側のSite URLが正しければ戻ってくる）
      // redirectTo: window.location.origin
    }
  });

  if (error) {
    console.error("Google login error:", error);
    alert("Googleログインに失敗しました");
  }
}

document.getElementById("googleLoginBtn").addEventListener("click", loginWithGoogle);


// ページ読み込み時にログイン状態確認
async function checkLogin() {
    const { data } = await sb.auth.getSession();
    // すでにログイン済み
    if (data.session) {
    // document.getElementById("username").value = data.session.user.email;
        await updateLoginUI();
        // document.getElementById("titleScreen").style.display = "none"; //タイトル削除
    }
}// ページをリロードしてもログイン状態を確認


// ログアウト
async function logout(){
    if(!sb) return;
    if(watchId !== null){
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    await sb.auth.signOut();

    alert("ログアウトしました");

    // UI更新
    await updateLoginUI();

    // タイトル画面に戻す
    document.getElementById("titleScreen").style.display = "flex";

    resetMap(); // 地図リセット
}


// ログイン時のUI切り替え
async function updateLoginUI(){
    const { data } = await sb.auth.getUser();
    const user = data.user;

    const startBtn = document.getElementById("startGameBtn");
    const emailBtn = document.getElementById("emailLoginBtn");
    const googleBtn = document.getElementById("googleLoginBtn");

    const displayNameDiv = document.getElementById("display-name");


    // スタートボタン更新（前のupdateStartButton)
    if (startBtn) {
        startBtn.innerHTML = user 
            ? "GPS開始" 
            : "GPS開始<br><span style='font-size: 0.7em;'>※ランキング参加はログインが必要です</span>";
    }

    if (emailBtn) {
        if (user) {
            emailBtn.textContent = "ログイン済み";
            emailBtn.disabled = true;          // 押せないようにする（任意）
        } else {
            emailBtn.textContent = "✉ メールでログイン";
            emailBtn.disabled = false;
        }
    }

    // 追加：Googleボタンもログイン済みにしたい場合（任意）
    if (googleBtn) {
        if (user) {
            googleBtn.disabled = true;
            // 中が span 構造なので textContent でまとめて変えるより、内側の文言だけ変える.
            const label = googleBtn.querySelector(".btn-content span:last-child");
        if (label) label.textContent = "ログイン済み";
        } else {
            googleBtn.disabled = false;
            const label = googleBtn.querySelector(".btn-content span:last-child");
        if (label) label.textContent = "Googleでログイン";
        }
    }

    if(user){
        // ログイン中：ログアウトボタン表示
        console.log("ログイン中のユーザ:", user);
        document.getElementById("logoutBtn").style.display = "block";
    } else {
        // 未ログイン時：ログアウトボタン非表示
        console.log("未ログイン状態");
        document.getElementById("logoutBtn").style.display = "none";
    }
}


// 前回の名前保存
async function restoreName(){

    const { data } = await sb.auth.getUser();
    const user = data.user;

    if(user){
        const name = user.user_metadata?.["display-name"];
        if(name){
            document.getElementById("titlename").value = name;
        }
    } else {
        const guest = localStorage.getItem("guest_name");

        if(guest){
            document.getElementById("titlename").value = guest;
        }
    }
}

// すべての初期化を一つの流れにまとめる
window.addEventListener('load', async () => {
    try {
        // Supabaseの本体が見つかるまで待つ
        const supabaseLib = await waitForSupabase();

        const SUPABASE_URL = "https://jysjolovimtyvimkhfpd.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c2pvbG92aW10eXZpbWtoZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDA5MzQsImV4cCI6MjA4NjI3NjkzNH0.YDrF0H_mq99R5LIhcFVe4EAc-Z0ZwyB-WUH9XwdqDTo";

        // クライアント作成
        window.sb = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        sb = window.sb;
        console.log("✅ Supabase Ready!");

        await checkLogin();
        await updateLoginUI();
        await restoreName();
        await loadRanking("daily"); // デイリーランキングを先に読み込む

        // 監視役👀
        sb.auth.onAuthStateChange((event, session) => {
            console.log("🔐 Auth状態変化:", event);
            if (typeof updateLoginUI === 'function') updateLoginUI();
        });

    } catch (e) {
        console.error("🚫 初期化中にエラーが発生:", e);
    }
});