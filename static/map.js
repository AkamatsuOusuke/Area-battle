// 地図を作る。東京を表示
let map = L.map("map", {
dragging: true, // ドラッグ移動有効
touchZoom: true, // ピンチズーム有効
scrollWheelZoom: true, // マウスホイールズーム有効
doubleClickZoom: true, // ダブルクリックズーム有効
boxZoom: true, // ドラッグでズーム範囲指定有効
keyboard: true, // キーボード操作有効
}).setView([35.68, 139.76], 13);

// アイコン
const playerIcon = L.icon({
iconUrl: "/static/Player.png", // 仮アイコン
iconSize: [40, 40],
iconAnchor: [20, 40], //アイコンの位置。少し上に
});

// サイズ再計算（スマホ画面表示崩れ防止）
window.addEventListener("resize", () => {
map.invalidateSize();
});

// インストールボタン表示
let installPrompt = null;
const installBtn = document.getElementById("installBtn");
installBtn.style.display = "none"; // 初期非表示

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();       // 自動表示を止める
    installPrompt = e;
    installBtn.style.display = "block"; // ボタン表示
});

//iOS Safari向け
if(navigator.userAgent.match(/iPhone|iPad|iPod/)){
installBtn.style.display = "block"; // 手動案内用に表示
}

// ボタンクリック処理
installBtn.addEventListener("click", async () => {
if(installPrompt){
    // ChromeOS用
    installPrompt.prompt();
    const choice = await installPrompt.userChoice; //ユーザが「インストールする/キャンセル」を選んだ結果を待つ
    console.log(choice.outcome === "accepted" ? "PWAがインストールされました" : "キャンセル");
    installPrompt = null; // 一度使ったら再度ボタンを押せないように
    installBtn.style.display = "none"; // ボタンを非表示
} else if(navigator.userAgent.match(/iPhone|iPad|iPod/)){
    // iOS用
    alert("Safariで開いていただき、共有 → 『ホーム画面に追加』でインストールできます");
} else {
    // それ以外
    alert("このブラウザでは自動インストールできません。ブラウザメニューからホーム画面に追加してください");
}
});

// 最初の1回だけ地図中心を現在地に移動する用flag
let firstMove = true;

// 無料地図を組み込む
L.tileLayer(
// 衛星写真
/*"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
{
attribution:"Tiles © Esri"
}).addTo(map);*/

// Dark Matter
"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
{
opacity: 0.7,
attribution:"©OpenStreetMap ©CartoDB"
}).addTo(map);

// 座標用の配列と、線オブジェクトを用意
let points = [];
let polyline = L.polyline([]).addTo(map);
let closeline = null;
let polygonLayer = null; // 多角形の色塗り

let lastLat = null;
let lastLng = null;

// 簡易距離計算（※緯度経度の差の大きさ）
function distance(a, b, c, d) {
    return Math.sqrt((a - c) ** 2 + (b - d) ** 2);
}
