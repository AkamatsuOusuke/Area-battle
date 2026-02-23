const CACHE_NAME = "area-battle-v2"; // キャッシュ名
const urlsToCache = [
  "/",
  "/static/icon.png",
  "/static/google.png",
  "/static/auth.js",
  "/static/map.js",
  "/static/ui.js",
  "/static/Player.png",
  "/static/manifest.json"
];

// インストール時にキャッシュ
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("キャッシュ開始...");
      for (const url of urlsToCache) {
        try {
          // cache.add ではなく fetch を使うことで詳細な制御が可能
          const response = await fetch(url, { 
            cache: 'no-cache', // 最新の状態を取得
            mode: url.includes('static') ? 'cors' : 'same-origin' 
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          await cache.put(url, response);
          console.log(`✅ 成功: ${url}`);
        } catch (err) {
          console.error(`❌ 失敗: ${url} - 原因:`, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 古いキャッシュを削除（安全なアップデート用）
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // 今のキャッシュ以外を削除
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // すぐにコントロールを引き継ぐ
});

// フェッチ時はキャッシュ優先(オフラインでもキャッシュから返す)
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
