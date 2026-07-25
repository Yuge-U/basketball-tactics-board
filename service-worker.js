// GitHub Pages上でアプリ本体をオフライン利用できるようにします。
const CACHE_NAME = "basketball-tactics-board-v27-icon-first-compact-ui";

// アプリ本体として保存するファイルです。
const APP_FILES = [
  "./",
  "./index.html",
  "./Basketball_Tactics_Board.html",
  "./1_App/manifest.webmanifest",
  "./1_App/css/styles.css",
  "./1_App/js/vendor/msal-browser.min.js",
  "./1_App/js/vendor/MSAL-LICENSE.txt",
  "./1_App/js/onedrive-config.js",
  "./1_App/js/onedrive-storage.js",
  "./1_App/js/folder-access.js",
  "./1_App/js/app.js",
  "./1_App/img/coach_icon.png",
  "./1_App/img/coach_icon_192.png",
  "./1_App/img/coach_icon_512.png"
];

// 初回公開時にアプリファイルを端末へ保存します。
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

// 新しい版へ更新したときに古いキャッシュを削除します。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// 通信できる場合は最新版を優先し、通信できない場合は保存済みファイルを使います。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
