// タイトル画面
async function startGame(){

const { data } = await sb.auth.getUser();
const user = data.user;

let name;

// ユーザー名取得(ログイン時はemailがユーザ名に)
if(user){

    // display_name優先。supabaseのuser_metadataを使う
    name = user.user_metadata?.display_name;

    // 無ければ入力させる
    if(!name){
    name = prompt("表示名を入力してね");
    if(!name) return;

    // supabaseに保存
    await sb.auth.updateUser({
        data:{ display_name:name }
    });
    }

} else {
    //　ゲストログイン時はtitlenameが非表示になるので、入力欄(username)も見るようにする。
    name = document.getElementById("titlename").value || document.getElementById("username").value;

    if (!name) {
    alert("PLAYER NAMEを入力してね");
    return;
    }

    // ゲストはLocalStorage保存
    localStorage.setItem("guest_name", name);
}

// HUDの名前欄にコピー
document.getElementById("username").value = name;

// タイトル画面消す
document.getElementById("titleScreen").style.display = "none";

// GPS開始
startGPS();
}

// 面積計算用
async function sendArea() {
if (points.length < 3) {
    alert("3点以上必要です。");
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

// ユーザー名取得
let name = document.getElementById("username").value;
if (!name) {
    alert("PLAYER NAMEを入力してね");
    return;
}

//　fetchで、サーバーにPOSTリクエストを送って面積を取得
const { data: userData } = await sb.auth.getUser();
const user = userData.user;

let res = await fetch("https://area-battle.onrender.com/area", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
    coords: sendPoints,
    name: name,
    user_id: user ? user.id : null
    }), // 座標・名前データ送信(JS → JSON → Python)
});

let result = await res.json(); //　面積データ受信(Python → JSON → JS)
// ↑ result = { "area": 面積の数値 } という構造で受け取れる
document.getElementById("result").innerText = "面積: " + result.area;

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

loadRanking(); // ランキング更新
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
document.getElementById("result").innerText = "";
}

// GPS関連
let watchId = null; // 監視ID
let marker = null; // 現在地マーカー
let circles = [];

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
async function loadRanking() {
let res = await fetch("https://area-battle.onrender.com/ranking");
let data = await res.json();

let text = "";
let rank = 1;

for (let r of data) {
    let crown = ""

    if (rank == 1) {
    crown = "🥇";
    } else if (rank == 2) {
    crown = "🥈";
    } else if (rank == 3) {
    crown = "🥉";
    } else {
    crown = "";
    }

    text += crown + rank + "位 " + r.display_name + " : " + r.area + "<br>";
    rank++;
}
document.getElementById("ranking").innerHTML = text;
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

// まとめる
window.addEventListener("load", ()=>{
    checkLogin();
    updateStartButton();
    updateLoginUI();
    restoreName();
    loadRanking();
});
