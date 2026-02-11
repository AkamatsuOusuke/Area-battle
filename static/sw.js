// オフラインでも起動できるように
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("area-battle-v1").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/static/icon.png"
      ]);
    })
  );
});