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
async function signUp(evt){
    const email = prompt("メールアドレスを入力");
    const password = prompt("パスワードを入力");

    if (!email || !password) {
        alert("メールアドレスとパスワードは必須です");
        return;
    }

    // ボタンを無効化する
    const btn = (evt && (evt.currentTarget ||evt.target))|| document.getElementById("emailSignUpBtn");; // クリックされたボタンを取得
    if(btn) btn.disabled = true;
    const originalText = btn ? btn.textContent : ""; // 元のテキストを覚えておく
    if(btn)btn.textContent = "登録中...";

    const { data, error } = await sb.auth.signUp({
        email: email,
        password: password,
    });// メールアドレスとパスワードをsupabaseに登録

    if (error) {
    alert("登録エラー: " + error.message);
    if(btn) btn.disabled = false; // ボタン復活
    if(btn) btn.textContent = originalText;
    } else {
    alert("登録成功！メールを確認してください");
    // 成功時、メール認証待ちになるので「確認待ち」の状態にする
    if(btn) btn.textContent = "メール確認待ち";
    }
}


// サインイン(ログイン)
async function signIn(evt){
    const email = prompt("メールアドレスを入力");
    const password = prompt("パスワードを入力");

    if (!email || !password) {
        alert("メールアドレスとパスワードは必須です");
        return;
    }

    // ボタンを無効化
    const btn = (evt && (evt.currentTarget || evt.target)) || document.getElementById("emailLoginBtn");
    if(btn) btn.disabled = true;
    const originalText = btn ? btn.textContent : "";
    if(btn) btn.textContent = "ログイン中...";

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
    });// 入力したメールアドレスとパスワードでログイン

    if (error) {
        alert("ログインエラー: " + error.message);
        if(btn) btn.disabled = false;
        if(btn) btn.textContent = originalText;
    } else {
        alert("ログイン成功！ようこそ " + data.user.email);
        // document.getElementById("username").value = data.user.email; // HUDにコピー
        await updateLoginUI(); //表示を切り替える
        // document.getElementById("titleScreen").style.display = "none"; // タイトル画面消す
        // startGPS();

        // ボタンの表示だけ元に戻しておく（ログイン完了を示すため）
        if(btn) btn.disabled = false;
        if(btn) btn.textContent = "ログイン済み";
    }
}

// Googleログイン
async function loginWithGoogle() {
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
        redirectTo: window.location.origin, // ログイン後にリダイレクトするURL（必要に応じて変更）
        skipBrowserRedirect: true // ブラウザのリダイレクトをスキップして、ポップアップでログインする場合はtrueにする
    }
  });

  if (error) {
    console.error("Google login error:", error);
    alert("Googleログインに失敗しました");
    return;
  }

  if (data?.url) {
    location.href = data.url; // ← LINE内でも成功率が上がる
  }
}

document.getElementById("googleLoginBtn").addEventListener("click", loginWithGoogle);


async function healBrokenSession(){
    try{
        const { data, error } = await sb.auth.getSession();
        if(error) throw error;
        return data.session;
    } catch(e){
        const msg = String(e?.message || e);
        if(msg.includes("Invalid session")||msg.includes("Invalid Refresh Token")||msg.includes("Refresh Token Not Found")){
            console.warn("セッションが壊れている可能性があります。セッションをクリアして再試行します...");
            try{await sb.auth.signOut();} catch(e){console.warn("ログアウト中にエラーが発生しました:", e);}
            return null;
        }
        throw e;
    }
}


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

// LINE内ブラウザかどうかを判定する関数
function isLineInAppBrowser() {
  return /Line/i.test(navigator.userAgent);
}

// LINE内ブラウザで開いている場合の案内を表示する関数
function showOpenInBrowserGuide() {
  // 二重挿入防止
  if (document.getElementById("lineBrowserGuide")) return;

  const guide = document.createElement("div");
  guide.id = "lineBrowserGuide";
  guide.style.margin = "14px 0";
  guide.style.padding = "12px";
  guide.style.borderRadius = "12px";
  guide.style.background = "rgba(255,255,255,0.06)";
  guide.style.lineHeight = "1.4";
  guide.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">⚠ LINE内ブラウザで開いています</div>
    <div style="font-size:13px; opacity:0.9; margin-bottom:10px;">
      Googleログインがブロックされることがあります。<br>
      <b>右上の「︙」→「Safari/Chromeで開く」</b>で開いてください。
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button id="openExternalBtn" class="btn title-btn" type="button">外部ブラウザで開く</button>
      <button id="copyUrlBtn" class="btn title-btn" type="button">URLをコピー</button>
    </div>
  `;

  // タイトル画面の下に追加
  const target = document.querySelector("#titleScreen");
  if (target) target.appendChild(guide);

  // URLコピー
  document.getElementById("copyUrlBtn").addEventListener("click", async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("URLをコピーしました。Safari/Chromeで貼り付けて開いてください！");
    } catch {
      // iOSでclipboardが失敗することがあるのでfallback
      prompt("コピーできない場合は、下のURLを長押しでコピーしてください", url);
    }
  });

  // 外部ブラウザを“試す”（成功する端末もある）
  document.getElementById("openExternalBtn").addEventListener("click", () => {
    const url = location.href;

    // まず通常のwindow.open（LINEが許せば外部に飛ぶ）
    const w = window.open(url, "_blank");
    if (!w) {
      // ブロックされたら案内
      alert("外部ブラウザで開けませんでした。右上の「︙」→「Safari/Chromeで開く」を使ってください。");
    }
  });
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

        // LINE内ブラウザの案内
        if (isLineInAppBrowser()) {
            showOpenInBrowserGuide();
        }

        await healBrokenSession();
        await checkLogin();
        await updateLoginUI();
        await restoreName();

        // 監視役👀
        sb.auth.onAuthStateChange((event, session) => {
            console.log("🔐 Auth状態変化:", event);
            if (typeof updateLoginUI === 'function') updateLoginUI();
        });

    } catch (e) {
        console.error("🚫 初期化中にエラーが発生:", e);
    }
});