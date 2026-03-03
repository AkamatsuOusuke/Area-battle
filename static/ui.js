let playedThisSession = false; // 今のセッションで遊んだかどうか。ランキング更新の条件に使う

const SUPABASE_FUNCTION_URL = "https://jysjolovimtyvimkhfpd.supabase.co/functions/v1";// Supabase Edge FunctionのURL

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c2pvbG92aW10eXZpbWtoZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDA5MzQsImV4cCI6MjA4NjI3NjkzNH0.YDrF0H_mq99R5LIhcFVe4EAc-Z0ZwyB-WUH9XwdqDTo"

// タイトル画面
async function startGame(){
// 【追加】sbがまだ準備できていなければ、少し待つか警告を出す
if (!sb) {
    alert("接続準備中です。数秒待ってからもう一度押してください。");
    return;
}

let name = document.getElementById("titlename").value;

name = name.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");// 前後のスペースを削除

if (!name) {
    alert("PLAYER NAMEを入力してね");
    return;
}

// ランキングデータを取得して、同じ名前がないか確認する。重複してる場合は警告を出す
const checkRes = await fetch(`${SUPABASE_FUNCTION_URL}/ranking-list`,{
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY
  }
});

const users = await checkRes.json();

// ログインしてるか確認
const { data } = await sb.auth.getUser();
const user = data.user;

// ログインしてる場合はSupabaseのユーザーデータを優先して保存
if (user) {

    const existingName = user.user_metadata?.["display-name"];

    // すでに名前が設定されている場合
    if (existingName) {

        // 同じ名前ならOK（弾かない）
        if (existingName === name) {
            // 何もしない
        } else {
            alert("ユーザー名は変更できません。");
            document.getElementById("titlename").value = existingName;
            return;
        }

    } else {
        if (users.some(u => u.username === name)) {
            alert("その名前は既に使われています。");
            return;
        }

        // 初回のみ保存
        await sb.auth.updateUser({
            data: { "display-name": name }
        });
    }

} else {
    // ゲストログイン時はLocalStorageに保存
    localStorage.setItem("guest_name", name);
}

// HUDにコピー。dispaly-nameはログイン状態に関わらず表示する。ただし、自分判定を回避するために名前は変える。（<div>なのでvalueは使えない）
if (user) {
    document.getElementById("display-name").textContent = "PLAYER: " + name;
} else {
    document.getElementById("display-name").textContent = "GUEST: " + name;
}

// タイトル画面消す
document.getElementById("titleScreen").style.display = "none";

// ゲーム画面を表示
reloadAdmax("gameAd", "https://adm.shinobi.jp/o/5f935d7a187da8b007cae1853c67ce1f");

// GPS開始
startGPS();
}

// 名前が未設定か確認して警告表示
async function checkNameStatus() {
    if (!sb) return;

    const { data } = await sb.auth.getUser();
    const user = data.user;

    if (user) {
        const existingName = user.user_metadata?.["display-name"];

        if (!existingName) {
            document.getElementById("nameWarning").style.display = "block";
        }
    }
}

// 面積計算用
async function sendArea() {
    if (points.length < 3) {
        alert("3点以上必要です。");
        return;
    }

    if (!sb) {
        alert("接続準備中です。");
        return;
    }

    // 既存の点線削除
    if (closeline) {
        map.removeLayer(closeline);
        closeline = null;
    }

    // 始点終点を点線で結ぶ
    let start = points[0];
    let end = points[points.length - 1];
    closeline = L.polyline(
        [
        [start[1], start[0]],
        [end[1], end[0]],
        ],
        {
        dashArray: "8,8", // 点線
        color: "#00fff7",
        weight: 3,
        },
    ).addTo(map);

    // 最初の点を最後に追加して、多角形を閉じる
    let sendPoints = [...points]; // 配列のコピー

    let first = sendPoints[0];
    let last = sendPoints[sendPoints.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
        sendPoints.push(first); // 始点と終点が一致していなければ、ここで最初の点を最後に追加
    }

    // 名前取得(ランキング用)
    let name;

    const { data } = await sb.auth.getUser();
    if(data.user){
        // ログイン中はsupabaseのdisplay-nameを優先
        name = data.user.user_metadata["display-name"];
    } else {
        // ゲストはLocalStorageから取得
        name = localStorage.getItem("guest_name") || "名無し";
    }

    const res = await fetch(`${SUPABASE_FUNCTION_URL}/area`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY, // 公開用キーをヘッダーに含める
            "Authorization": `Bearer ${SUPABASE_KEY}`,
         },
        body: JSON.stringify({
            coords: sendPoints
        }), // 座標データ送信(JS → JSON → Python)
    });

    if(!res.ok){
        alert("面積計算に失敗しました。");
        return;
    }

    const result = await res.json();
    document.getElementById("result").innerText = "面積: " + result.area;

    // 結果を地図に表示するための多角形描画
    if (polygonLayer) {
        map.removeLayer(polygonLayer); //既存の多角形を削除
    }
    polygonLayer = L.polygon(
        points.map((p) => [p[1], p[0]]),
        {
        color: "#adff2f", // 線の色
        fillColor: "#adff2f", // 塗りつぶしの色（黄緑色）
        fillOpacity: 0.3,
        },
    ).addTo(map);


    // ここから「ログインしてたら保存」
    // ランキング登録の処理。面積計算が終わった後に行う
    const { data: sessionData } = await sb.auth.getSession();
    // アクセストークンを取得(ログインしてない場合はnull)
    const accessToken = sessionData.session?.access_token;

    // ログインしてない場合はランキング登録できないようにする
    if (!accessToken) {
        console.log("guest: skip ranking insert");
        playedThisSession = true; // 1回プレイ扱い
        return;
    }    

    // Supabase Edge Functionにリクエストを送る。ランキングに結果を送信
    const insertRes = await fetch(`${SUPABASE_FUNCTION_URL}/ranking-insert`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            username: name,
            area: result.area
        }),
    });

    const insertText = await insertRes.text();
    console.log("insert status:", insertRes.status);
    console.log("insert body:", insertText);

    
    if (!insertRes.ok) {
        alert("ランキング登録に失敗しました。");
        return;
    }

    playedThisSession = true;
    await loadRanking(currentRange); // ランキング更新
}

// 地図リセット用
function resetMap() {

    // 座標リストを空に
    points = [];
    lastLat = null;
    lastLng = null;
    firstMove = true;
    // 線を削除
    polyline.setLatLngs([]);

    // 円を削除
    for(let c of circles){
        map.removeLayer(c);
    }
    circles = [];
    // 点線を削除
    if (closeline) {
        map.removeLayer(closeline);
        closeline = null;
    }
    // 多角形を削除
    if (polygonLayer) {
        map.removeLayer(polygonLayer);
    }
    // 結果表示をクリア
    document.getElementById("result").innerText = "面積: 0";
}

// GPS関連
let watchId = null; // 監視ID
let marker = null; // 現在地マーカー
let circles = [];
let lastMyRank = null; // 自分の順位を保存する変数
let lastMyArea = null; // 自分の面積を保存する変数

// Supabaseクライアントの準備ができたら、ログイン状態を確認してUIを更新する

// SNS投稿用の面積フォーマット関数
function formatAreaForShare(area) {
  const n = Number(area);
  if (!Number.isFinite(n)) return String(area);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} km²`;
  if (n >= 10_000) return `${Math.round(n).toLocaleString()} m²`;
  return `${Math.round(n)} m²`;
}

// Xにシェア
async function shareToX() {
  if (lastMyRank == null || lastMyArea == null) {
    alert("シェアする記録がまだありません。先に面積計算してランキング登録してね！");
    return;
  }

  const areaText = formatAreaForShare(lastMyArea);
  const text = `🔥 ${areaText}制圧！\n現在${lastMyRank}位！\n#エリアバトル #AREABATTLE`;
  const url = location.href;

  // まずは端末の共有メニュー（PWA/スマホで強い）
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return;
    }
  } catch (e) {
    // ユーザーがキャンセル等 → フォールバックへ
  }

  // フォールバック：Xの投稿画面を開く（Web Intent）
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(intent, "_blank", "noopener,noreferrer");
}

// GPSスタート
function startGPS() {
// GPS対応確認
if (!navigator.geolocation) {
    alert("GPSがつかえないよ");
    return;
}

// GPS二重起動防止
if (watchId) {
    alert("すでに開始してるよ");
    return;
}

// 位置情報監視開始
watchId = navigator.geolocation.watchPosition(
    function (pos) {
    // lat: 緯度、lng: 経度を取得
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;

    if (lastLat !== null) {
        // あまりに近い場合は無視して追加しない（ノイズ対策）
        if (distance(lat, lng, lastLat, lastLng) < 0.00005) {
        return;
        }
    }

    // 更新
    lastLat = lat;
    lastLng = lng;

    // 面積計算用の形式(経度、緯度)で配列に追加
    points.push([lng, lat]);

    // 地図表示用(緯度、経度)でマーカー表示
    polyline.addLatLng([lat, lng]);

    // 現在地マーカー更新
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng], { icon: playerIcon }).addTo(map);
    }

    let c = L.circle([lat, lng], {
        radius: 2,
        color: "#00fff7",
        fillColor: "#00fff7",
        fillOpacity: 0.7,
    }).addTo(map);

    circles.push(c);

    // 地図中心を現在地に移動（初回のみ）
    if (firstMove) {
        map.panTo([lat, lng]);
        firstMove = false;
    }
    },
    function (err) {
    alert("位置情報取得失敗");
    },
    {
    enableHighAccuracy: true, // 高精度モード。できるだけ頻繁に位置情報を更新。
    maximumAge: 0, // 毎回新しい情報を取得
    timeout: 10000, // タイムアウト10秒
    },
);
}

// ランキング更新用
async function loadRanking(range = "daily") {
    let endpoint = "ranking-daily"; // デフォルトは日間ランキングのエンドポイント
    if (range === "weekly") endpoint = "ranking-weekly"; // 週間ランキングのエンドポイントに切り替え
     if (range === "all") endpoint = "ranking-list"; // 全期間ランキングのエンドポイントに切り替え（今回は同じエンドポイントで処理する想定）

    // endpointにアクセスしてランキングデータを取得する。Supabase Edge Functionで処理する
    let res = await fetch(`${SUPABASE_FUNCTION_URL}/${endpoint}`,{
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
        }
    });
    let data = await res.json();

    // 今の自分の名前を取得
    let myName;
    const { data: userData } = await sb.auth.getUser();

    if(userData.user){
        myName = userData.user.user_metadata["display-name"]|| userData.user.email;  // fallback;
    } else {
        myName = localStorage.getItem("guest_name") || "匿名さん";
    }

    let text = "";
    let rank = 1;

    let myRank = null;   
    let myArea = null;  


    for (let r of data) {
        let crown = ""
        if (rank == 1) crown = "🥇";
        else if (rank == 2) crown = "🥈";
        else if (rank == 3) crown = "🥉";

        let isMe = (r.username === myName) && playedThisSession;
        // 自分なら記録保存
        if (isMe && myRank === null) {
            myRank = rank;
            myArea = r.area;
        }

        // r = { username: "ユーザ名", area: 面積の数値 }
        text += 
            `<div class="rank-item ${isMe ? "my-rank" : ""}">` +
            `${crown}${rank}位 ${r.username}: ${r.area} m²` +
            `</div>`;   
        rank++;
    }
    document.getElementById("ranking").innerHTML = text;

    if(myRank !== null && playedThisSession && userData.user){// ランキングに載る条件：名前があって、今のセッションで遊んでいて、ログインしていること
        lastMyRank = myRank;
        lastMyArea = myArea;
        document.getElementById("myRank").innerHTML = `あなたは${myRank}位です！<br>面積: ${myArea} m²`;
        document.getElementById("myRankBox").style.display = "block";
    } else {
        lastMyRank = null;
        lastMyArea = null;
        document.getElementById("myRankBox").style.display = "none";
    }
}

// タイトルに戻る処理
function backToTitle() {

    // GPS停止
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    // 地図リセット
    resetMap();

    // タイトル画面を表示
    document.getElementById("titleScreen").style.display = "flex";

    //広告リロード（タイトルに戻るたびに広告を更新して、収益機会を増やす）
    reloadAdmax("titleAd", "https://adm.shinobi.jp/o/7cac4f23f66e3c35678ae719b3d4873d");

    // 面積表示クリア
    document.getElementById("result").innerText = "面積: 0";
}

// アプリを閉じたとき
window.addEventListener("pagehide", () => {
if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
}

});

// 画面が裏に回ったとき
document.addEventListener("visibilitychange", () => {
if (document.hidden) {
    firstMove = true;
}
});

// ページロード時に名前の状態を確認して警告表示
window.addEventListener("load", () => {
    checkNameStatus();

    const shareBtn = document.getElementById("shareXBtn");
    if (shareBtn) {
        shareBtn.addEventListener("click", shareToX);// Xシェアボタンのクリックイベントを設定
    }
});

/*タブのクリックでランキングを切り替える処理*/
let currentRange = "daily"; // デフォルトは日間ランキング

function setActiveTab(range){// タブのアクティブ状態を切り替える
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.classList.toggle("is-active", btn.dataset.range === range);
  });
}

window.addEventListener("load", () => {// タブボタンにクリックイベントを設定
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", async () => {
      currentRange = btn.dataset.range;
      setActiveTab(currentRange);
      await loadRanking(currentRange);// タブ切り替えのたびにランキングを更新
    });
  });
  loadRanking(currentRange);
});

// 広告リロード用（ランキング更新のタイミングなどで呼び出す想定）
function reloadAdmax(containerId, scriptSrc){
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = "";                 // 一回消す
  const s = document.createElement("script");
  s.src = scriptSrc;
  s.async = true;
  el.appendChild(s);                 // もう一回読み込む
}

// ページロード時に広告を読み込む
window.addEventListener("load", () => {
  reloadAdmax("titleAd", "https://adm.shinobi.jp/o/7cac4f23f66e3c35678ae719b3d4873d");
});

