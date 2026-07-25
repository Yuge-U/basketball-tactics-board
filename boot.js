// 圧縮したv20系アプリ一式を読み込み、元の画面と機能を復元します。
async function readBundle() {
  const partListResponse = await fetch("./bundle/parts.json", { cache: "no-cache" });
  if (!partListResponse.ok) throw new Error(`parts HTTP ${partListResponse.status}`);
  const partUrls = await partListResponse.json();
  const parts = await Promise.all(partUrls.map(async (url) => {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
    return response.text();
  }));
  const base64 = parts.join("");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (!("DecompressionStream" in window)) throw new Error("このブラウザーは圧縮データの展開に対応していません。OSとブラウザーを更新してください。");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
try {
  const bundle = await readBundle();
  const parsed = new DOMParser().parseFromString(bundle.html, "text/html");
  document.documentElement.replaceWith(document.importNode(parsed.documentElement, true));
  const style = document.createElement("style");
  style.dataset.source = "v20-styles";
  style.textContent = bundle.css;
  document.head.appendChild(style);
  const iconData = `data:image/png;base64,${bundle.icon}`;
  document.querySelectorAll(".brand-mark img").forEach((img) => { img.src = iconData; });
  const appleIcon = document.createElement("link");
  appleIcon.rel = "apple-touch-icon";
  appleIcon.href = iconData;
  document.head.appendChild(appleIcon);
  (0, eval)(`${bundle.folder}\n//# sourceURL=folder-access.js`);
  (0, eval)(`${bundle.app}\n//# sourceURL=app.js`);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      if (document.documentElement.dataset.appReady === "true") return;
      const panel = document.createElement("div");
      panel.style.cssText = "position:fixed;inset:16px;z-index:9999;display:grid;place-items:center;padding:24px;border:2px solid #b91c1c;border-radius:16px;color:#7f1d1d;background:#fff7f7;font:700 16px/1.7 sans-serif;text-align:center;";
      panel.textContent = "作戦ボードの起動に失敗しました。ページを再読み込みしてください。";
      document.body.appendChild(panel);
    }, 1200);
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(console.warn));
} catch (error) {
  console.error(error);
  document.body.innerHTML = `<div style="max-width:720px;padding:24px;color:#7f1d1d;font:700 16px/1.7 sans-serif;text-align:center">作戦ボードを読み込めませんでした。ページを再読み込みしてください。<br><small>${String(error.message || error)}</small></div>`;
}
