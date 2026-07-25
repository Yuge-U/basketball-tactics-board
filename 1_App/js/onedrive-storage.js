/* Basketball Tactics Board - personal OneDrive storage via Microsoft Graph. */
window.OneDriveStorage = (() => {
  "use strict";

  const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
  const SCOPES = ["Files.ReadWrite.AppFolder"];
  const CLIENT_ID_KEY = "basketball-tactics-onedrive-client-id";
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

  async function collectFiles(parentId, prefix = "") {
    const children = await listChildren(parentId);
    const files = [];
    for (const item of children) {
      const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.folder) {
        files.push(...await collectFiles(item.id, relativePath));
      } else if (item.file && item.name.toLowerCase().endsWith(".json")) {
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
    list,
    load,
    remove,
    status,
    isConfigured,
    isConnected,
    setClientId,
    clearClientIdOverride,
    redirectUri,
    onStatusChange,
    OneDriveError
  };
})();
