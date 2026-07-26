/* Basketball Tactics Board - personal OneDrive storage via Microsoft Graph. */
window.OneDriveStorage = (() => {
  "use strict";

  const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
  const SCOPES = ["Files.ReadWrite.AppFolder"];
  const CLIENT_ID_KEY = "basketball-tactics-onedrive-client-id";
  const SAVE_FOLDER_SETTINGS_FILE = "_save-folders.settings.json";
  const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const listeners = new Set();

  let client = null;
  let account = null;
  let initPromise = null;
  let appRoot = null;
  let lastError = "";

  class OneDriveError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = "OneDriveError";
      this.code = code;
      this.cause = cause;
    }
  }

  function redirectUri() {
    if (!/^https?:$/.test(window.location.protocol)) return "";
    // index.html、ホーム画面版、別名HTMLのどこから開いても公開フォルダURLへ統一します。
    const directoryUrl = new URL("./", window.location.href);
    return `${directoryUrl.origin}${directoryUrl.pathname}`;
  }

  function configuredClientId() {
    const localValue = String(localStorage.getItem(CLIENT_ID_KEY) || "").trim();
    if (GUID_PATTERN.test(localValue)) return localValue;
    const fileValue = String(window.OneDriveConfig?.clientId || "").trim();
    return GUID_PATTERN.test(fileValue) ? fileValue : "";
  }

  function isConfigured() {
    return Boolean(configuredClientId());
  }

  function isConnected() {
    return Boolean(client && account);
  }

  function status() {
    return {
      configured: isConfigured(),
      connected: isConnected(),
      username: account?.username || "",
      name: account?.name || "",
      error: lastError,
      redirectUri: redirectUri(),
      clientId: configuredClientId()
    };
  }

  function emitStatus() {
    const current = status();
    listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (error) {
        console.warn("OneDrive状態表示を更新できませんでした。", error);
      }
    });
  }

  function onStatusChange(listener) {
    listeners.add(listener);
    listener(status());
    return () => listeners.delete(listener);
  }

  function setClientId(value) {
    const next = String(value || "").trim();
    if (!GUID_PATTERN.test(next)) {
      throw new OneDriveError("invalid-client-id", "クライアントIDの形式が正しくありません。Microsoft Entraの「アプリケーション (クライアント) ID」を入力してください。");
    }
    localStorage.setItem(CLIENT_ID_KEY, next);
  }

  function clearClientIdOverride() {
    localStorage.removeItem(CLIENT_ID_KEY);
  }

  function hasClientIdOverride() {
    return GUID_PATTERN.test(String(localStorage.getItem(CLIENT_ID_KEY) || "").trim());
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!isConfigured()) {
        lastError = "";
        emitStatus();
        return status();
      }
      if (!window.msal?.PublicClientApplication) {
        throw new OneDriveError("msal-unavailable", "Microsoftサインイン用ライブラリを読み込めませんでした。通信状態を確認してページを再読み込みしてください。");
      }
      if (!redirectUri()) {
        throw new OneDriveError("https-required", "OneDrive連携はGitHub PagesなどのHTTPSページから利用してください。");
      }

      client = new window.msal.PublicClientApplication({
        auth: {
          clientId: configuredClientId(),
          authority: window.OneDriveConfig?.authority || "https://login.microsoftonline.com/consumers",
          redirectUri: redirectUri(),
          postLogoutRedirectUri: redirectUri(),
          navigateToLoginRequestUrl: true
        },
        cache: {
          cacheLocation: "localStorage"
        },
        system: {
          allowPlatformBroker: false
        }
      });

      await client.initialize();
      const response = await client.handleRedirectPromise();
      account = response?.account || client.getActiveAccount() || client.getAllAccounts()[0] || null;
      if (account) client.setActiveAccount(account);
      lastError = "";
      emitStatus();
      return status();
    })().catch((error) => {
      lastError = readableAuthError(error);
      client = null;
      account = null;
      initPromise = null;
      emitStatus();
      throw error;
    });
    return initPromise;
  }

  function readableAuthError(error) {
    const code = String(error?.errorCode || error?.code || "");
    if (code.includes("user_cancel")) return "サインインがキャンセルされました。";
    if (code.includes("redirect_uri")) return "Microsoft Entraに登録したリダイレクトURIと、このページのURLが一致していません。";
    if (code.includes("consent")) return "OneDriveへのアクセス許可が完了していません。";
    return error?.message || "Microsoftアカウントへ接続できませんでした。";
  }

  async function signIn() {
    if (!isConfigured()) {
      throw new OneDriveError("setup-required", "先にMicrosoft EntraのクライアントIDを設定してください。");
    }
    await init();
    if (account) return status();
    await client.loginRedirect({
      scopes: SCOPES,
      redirectUri: redirectUri(),
      redirectStartPage: redirectUri(),
      prompt: "select_account"
    });
    return new Promise(() => {});
  }

  async function signOut() {
    await init();
    if (!account) return;
    await client.logoutRedirect({
      account,
      postLogoutRedirectUri: redirectUri()
    });
  }

  async function accessToken() {
    await init();
    if (!account) {
      throw new OneDriveError("not-signed-in", "OneDriveへ接続してください。");
    }
    try {
      const result = await client.acquireTokenSilent({ scopes: SCOPES, account });
      return result.accessToken;
    } catch (error) {
      if (error instanceof window.msal.InteractionRequiredAuthError || error?.name === "InteractionRequiredAuthError") {
        await client.acquireTokenRedirect({
          scopes: SCOPES,
          account,
          redirectUri: redirectUri(),
          redirectStartPage: redirectUri()
        });
        return new Promise(() => {});
      }
      throw error;
    }
  }

  async function graphRequest(path, options = {}, responseType = "json") {
    const token = await accessToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    const url = /^https:\/\//i.test(path) ? path : `${GRAPH_ROOT}${path}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let details = {};
      try {
        details = await response.json();
      } catch {
        details = {};
      }
      const graphMessage = details?.error?.message || "";
      if (response.status === 401 || response.status === 403) {
        throw new OneDriveError("permission-denied", "OneDriveへのアクセス許可を確認してください。", details);
      }
      if (response.status === 404) {
        throw new OneDriveError("not-found", "OneDrive上の作戦データが見つかりません。", details);
      }
      throw new OneDriveError("graph-error", graphMessage || `OneDrive通信エラー (${response.status})`, details);
    }
    if (responseType === "none" || response.status === 204) return null;
    if (responseType === "text") return response.text();
    if (responseType === "blob") return response.blob();
    return response.json();
  }

  async function getAppRoot() {
    if (appRoot) return appRoot;
    appRoot = await graphRequest("/me/drive/special/approot?$select=id,name,webUrl");
    return appRoot;
  }

  async function listChildren(parentId) {
    const items = [];
    let next = `/me/drive/items/${encodeURIComponent(parentId)}/children?$select=id,name,lastModifiedDateTime,size,file,folder`;
    while (next) {
      const page = await graphRequest(next);
      items.push(...(page.value || []));
      next = page["@odata.nextLink"] || "";
    }
    return items;
  }

  async function ensureFolder(parentId, name) {
    const existing = (await listChildren(parentId)).find((item) => item.folder && item.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    try {
      return await graphRequest(`/me/drive/items/${encodeURIComponent(parentId)}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail"
        })
      });
    } catch (error) {
      const afterConflict = (await listChildren(parentId)).find((item) => item.folder && item.name.toLowerCase() === name.toLowerCase());
      if (afterConflict) return afterConflict;
      throw error;
    }
  }

  async function ensureFolderPath(relativePath) {
    let parent = await getAppRoot();
    for (const segment of String(relativePath || "Shared").split("/").filter(Boolean)) {
      parent = await ensureFolder(parent.id, safeFolderName(segment));
    }
    return parent;
  }

  function safeFolderName(value) {
    return String(value || "Shared").replace(/["*:<>?\/\\|]/g, "_").replace(/[.\s]+$/g, "").trim() || "Shared";
  }

  function safeFileName(value) {
    const cleaned = String(value || "名称未設定の作戦")
      .replace(/["*:<>?\/\\|]/g, "_")
      .replace(/[.\s]+$/g, "")
      .trim()
      .slice(0, 120);
    return cleaned || "名称未設定の作戦";
  }

  function buildRelativePath(folder, name) {
    const normalizedFolder = String(folder || "Shared")
      .split("/")
      .filter(Boolean)
      .map(safeFolderName)
      .join("/") || "Shared";
    return `${normalizedFolder}/${safeFileName(name)}.json`;
  }

  async function save(folder, name, data) {
    const targetFolder = await ensureFolderPath(folder);
    const filename = `${safeFileName(name)}.json`;
    const uploaded = await graphRequest(
      `/me/drive/items/${encodeURIComponent(targetFolder.id)}:/${encodeURIComponent(filename)}:/content`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(data, null, 2)
      }
    );
    return {
      id: uploaded.id,
      relativePath: `${String(folder || "Shared").replace(/^\/+|\/+$/g, "")}/${filename}`
    };
  }

  // 端末間で共通利用する保存フォルダ一覧をアプリ専用領域へ保存します。
  async function saveFolderSettings(folders) {
    const root = await getAppRoot();
    const payload = {
      format: "basketball-tactics-save-folders",
      version: 1,
      updatedAt: new Date().toISOString(),
      folders: Array.isArray(folders) ? folders.map(String) : []
    };
    await graphRequest(
      `/me/drive/items/${encodeURIComponent(root.id)}:/${encodeURIComponent(SAVE_FOLDER_SETTINGS_FILE)}:/content`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload, null, 2)
      }
    );
    return payload;
  }

  // OneDriveに保存済みの保存フォルダ一覧を読み込みます。
  async function loadFolderSettings() {
    const root = await getAppRoot();
    const settingsFile = (await listChildren(root.id)).find((item) => (
      item.file && item.name.toLowerCase() === SAVE_FOLDER_SETTINGS_FILE.toLowerCase()
    ));
    if (!settingsFile) return null;
    const parsed = await loadJsonById(settingsFile.id);
    if (parsed?.format !== "basketball-tactics-save-folders" || !Array.isArray(parsed.folders)) {
      throw new OneDriveError("invalid-folder-settings", "OneDrive上の保存フォルダ設定を読み込めませんでした。");
    }
    return parsed;
  }

  async function backupAll(onProgress) {
    const root = await getAppRoot();
    const files = await collectFiles(root.id);
    const plays = [];
    const failures = [];
    let completed = 0;
    const notifyProgress = () => {
      if (typeof onProgress === "function") {
        onProgress({ completed, total: files.length, success: plays.length, failed: failures.length });
      }
    };
    notifyProgress();
    for (let index = 0; index < files.length; index += 4) {
      const batch = files.slice(index, index + 4);
      const parsed = await Promise.all(batch.map(async (file) => {
        try {
          const data = await loadJsonById(file.id);
          const snapshot = data?.snapshot || data;
          if (!Array.isArray(snapshot?.steps) || snapshot.steps.length === 0) {
            throw new OneDriveError("invalid-play-data", "STEPデータがありません。");
          }
          const pathParts = String(file.relativePath || file.name).replace(/\\/g, "/").split("/");
          pathParts.pop();
          return {
            ok: true,
            play: {
              name: snapshot.playName || file.name.replace(/\.json$/i, ""),
              folder: pathParts.join("/") || snapshot?.libraryMeta?.folder || "Shared",
              relativePath: file.relativePath,
              updatedAt: file.lastModifiedDateTime || "",
              data
            }
          };
        } catch (error) {
          console.warn(`OneDrive上の「${file.relativePath}」をバックアップできませんでした。`, error);
          return {
            ok: false,
            failure: {
              relativePath: file.relativePath,
              reason: error?.code === "invalid-play-data" ? "作戦データの形式が正しくありません。" : "作戦データを取得できませんでした。"
            }
          };
        } finally {
          completed += 1;
          notifyProgress();
        }
      }));
      parsed.forEach((result) => {
        if (result.ok) plays.push(result.play);
        else failures.push(result.failure);
      });
      notifyProgress();
    }
    return { plays, failures, total: files.length };
  }

  function mediaExtension(media) {
    const originalName = String(media?.name || "");
    const originalExtension = originalName.match(/\.([a-z0-9]{1,10})$/i)?.[1];
    if (originalExtension) return originalExtension.toLowerCase();
    const mimeType = String(media?.mimeType || "").toLowerCase();
    if (mimeType.includes("quicktime")) return "mov";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("x-m4v")) return "m4v";
    return "mp4";
  }

  function mediaFileName(playName, media) {
    const safePlayName = safeFileName(playName).slice(0, 72);
    const assetKey = String(media?.assetId || media?.id || Date.now())
      .replace(/[^a-z0-9_-]/gi, "")
      .slice(-40) || String(Date.now());
    return `${safePlayName}__video-${assetKey}.${mediaExtension(media)}`;
  }

  async function saveMedia(folder, playName, media, blob) {
    if (!(blob instanceof Blob)) {
      throw new OneDriveError("missing-media", "アップロードする動画データが見つかりません。");
    }
    const targetFolder = await ensureFolderPath(folder);
    const filename = mediaFileName(playName, media);
    const mimeType = String(media?.mimeType || blob.type || "application/octet-stream");
    const uploaded = await graphRequest(
      `/me/drive/items/${encodeURIComponent(targetFolder.id)}:/${encodeURIComponent(filename)}:/content`,
      {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: blob
      }
    );
    const normalizedFolder = String(folder || "Shared").replace(/^\/+|\/+$/g, "") || "Shared";
    return {
      provider: "onedrive",
      itemId: uploaded.id,
      fileName: uploaded.name || filename,
      relativePath: `${normalizedFolder}/${uploaded.name || filename}`,
      folder: normalizedFolder,
      size: Number(uploaded.size ?? blob.size ?? 0),
      mimeType
    };
  }

  async function loadMedia(itemId) {
    if (!itemId) {
      throw new OneDriveError("missing-media-id", "動画のOneDriveファイルIDがありません。");
    }
    return graphRequest(`/me/drive/items/${encodeURIComponent(itemId)}/content`, {}, "blob");
  }

  async function collectFiles(parentId, prefix = "") {
    const children = await listChildren(parentId);
    const files = [];
    for (const item of children) {
      const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.folder) {
        files.push(...await collectFiles(item.id, relativePath));
      } else if (
        item.file
        && item.name.toLowerCase().endsWith(".json")
        && (prefix || item.name.toLowerCase() !== SAVE_FOLDER_SETTINGS_FILE.toLowerCase())
      ) {
        files.push({ ...item, relativePath });
      }
    }
    return files;
  }

  async function loadJsonById(id) {
    const text = await graphRequest(`/me/drive/items/${encodeURIComponent(id)}/content`, {}, "text");
    return JSON.parse(text);
  }

  async function list() {
    const root = await getAppRoot();
    const files = await collectFiles(root.id);
    const results = [];
    for (let index = 0; index < files.length; index += 4) {
      const batch = files.slice(index, index + 4);
      const parsed = await Promise.all(batch.map(async (file) => {
        try {
          const data = await loadJsonById(file.id);
          const snapshot = data?.snapshot || data;
          return {
            id: file.id,
            name: snapshot?.playName || file.name.replace(/\.json$/i, ""),
            relativePath: file.relativePath,
            updatedAt: file.lastModifiedDateTime,
            stepCount: Array.isArray(snapshot?.steps) ? snapshot.steps.length : 0,
            tags: Array.isArray(snapshot?.libraryMeta?.tags) ? snapshot.libraryMeta.tags : [],
            favorite: Boolean(snapshot?.libraryMeta?.favorite),
            source: "onedrive"
          };
        } catch (error) {
          console.warn(`OneDrive上の「${file.relativePath}」を読み飛ばしました。`, error);
          return null;
        }
      }));
      results.push(...parsed.filter(Boolean));
    }
    return results.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
  }

  async function load(item) {
    return loadJsonById(item.id);
  }

  async function remove(item) {
    await graphRequest(`/me/drive/items/${encodeURIComponent(item.id)}`, { method: "DELETE" }, "none");
  }

  return {
    init,
    signIn,
    signOut,
    save,
    saveFolderSettings,
    loadFolderSettings,
    backupAll,
    saveMedia,
    loadMedia,
    list,
    load,
    remove,
    status,
    isConfigured,
    isConnected,
    setClientId,
    clearClientIdOverride,
    hasClientIdOverride,
    buildRelativePath,
    redirectUri,
    onStatusChange,
    OneDriveError
  };
})();
