// supabase 初期化
const SUPABASE_URL = "https://jysjolovimtyvimkhfpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c2pvbG92aW10eXZpbWtoZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDA5MzQsImV4cCI6MjA4NjI3NjkzNH0.YDrF0H_mq99R5LIhcFVe4EAc-Z0ZwyB-WUH9XwdqDTo";
if(!window.supabase){
    console.error("supabase not loaded");
}
      
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); //windowをつけると、他のjsから使えるようになる


// サインアップ(新規登録)
async function signUp(){
    const email = prompt("メールアドレスを入力");
    const password = prompt("パスワードを入力");

    if (!email || !password) {
    alert("メールアドレスとパスワードは必須です");
    return;
    }

    const { data, error } = await sb.auth.signUp({
    email: email,
    password: password,
    });// メールアドレスとパスワードをsupabaseに登録

    if (error) {
    alert("登録エラー: " + error.message);
    } else {
    alert("登録成功！メールを確認してください");
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

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
    });// 入力したメールアドレスとパスワードでログイン

    if (error) {
        alert("ログインエラー: " + error.message);
    } else {
        alert("ログイン成功！ようこそ " + data.user.email);
        document.getElementById("username").value = data.user.email; // HUDにコピー
        document.getElementById("titleScreen").style.display = "none"; // タイトル画面消す
        startGPS(); // GPS開始
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
        btn.textContent = "GPS開始" ;
    } else {
        btn.textContent = "GPS開始（ゲストログイン）";
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


// auth監視
sb.auth.onAuthStateChange((event, session) => {
    updateStartButton();
    updateLoginUI();
});

