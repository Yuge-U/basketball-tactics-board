const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let contentRequests = 0;
let remoteUpdatedAt = "2026-08-01T10:00:00Z";

const account = { username: "coach@example.com", name: "Coach" };
class PublicClientApplication {
  async initialize() {}
  async handleRedirectPromise() { return { account }; }
  getActiveAccount() { return account; }
  getAllAccounts() { return [account]; }
  setActiveAccount() {}
  async acquireTokenSilent() { return { accessToken: "test-token" }; }
}

async function graphFetch(url) {
  const pathname = new URL(url).pathname;
  if (pathname.endsWith("/me/drive/special/approot")) {
    return Response.json({ id: "root", name: "AppRoot" });
  }
  if (pathname.endsWith("/me/drive/items/root/children")) {
    return Response.json({ value: [{ id: "shared", name: "Shared", folder: {} }] });
  }
  if (pathname.endsWith("/me/drive/items/shared/children")) {
    return Response.json({
      value: [{
        id: "play-file",
        name: "Fast Play.json",
        file: {},
        size: 500,
        lastModifiedDateTime: remoteUpdatedAt
      }]
    });
  }
  if (pathname.endsWith("/me/drive/items/play-file/content")) {
    contentRequests += 1;
    return new Response(JSON.stringify({
      format: "basketball-tactics-board",
      snapshot: {
        playName: "Fast Play",
        libraryMeta: { folder: "Shared", tags: ["cache"], favorite: true },
        steps: [{ id: "step-1" }]
      }
    }), { headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`Unexpected Graph URL: ${url}`);
}

const storage = new Map();
const context = vm.createContext({
  window: {
    location: { protocol: "https:", href: "https://example.test/app/index.html" },
    OneDriveConfig: {
      clientId: "11111111-1111-1111-1111-111111111111",
      authority: "https://login.microsoftonline.com/consumers"
    },
    msal: { PublicClientApplication, InteractionRequiredAuthError: class extends Error {} }
  },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  fetch: graphFetch,
  Headers,
  Response,
  URL,
  Blob,
  console,
  setTimeout,
  clearTimeout
});

const source = fs.readFileSync(path.join(__dirname, "..", "1_App", "js", "onedrive-storage.js"), "utf8");
vm.runInContext(source, context, { filename: "onedrive-storage.js" });

(async () => {
  const api = context.window.OneDriveStorage;
  await api.init();

  const first = await api.list();
  assert.equal(first.length, 1);
  assert.equal(first[0].name, "Fast Play");
  assert.equal(first[0].snapshot.steps.length, 1);
  assert.equal(contentRequests, 1);

  const unchanged = await api.list({ cachedItems: first });
  assert.equal(unchanged[0].snapshot.playName, "Fast Play");
  assert.equal(contentRequests, 1, "unchanged JSON should be reused from cache");

  remoteUpdatedAt = "2026-08-01T11:00:00Z";
  const changed = await api.list({ cachedItems: unchanged });
  assert.equal(changed[0].updatedAt, remoteUpdatedAt);
  assert.equal(contentRequests, 2, "changed JSON should be downloaded again");

  console.log("onedrive prefetch cache tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
