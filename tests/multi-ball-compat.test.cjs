const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
const noop = () => {};
const gradient = { addColorStop() {} };
const canvasContext = new Proxy({
  createRadialGradient: () => gradient,
  createLinearGradient: () => gradient,
  measureText: (value) => ({ width: String(value || "").length * 10 }),
  isPointInPath: () => false
}, { get: (target, key) => key in target ? target[key] : noop, set: (target, key, value) => (target[key] = value, true) });

function makeElement(id = "") {
  const element = {
    id,
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    textContent: "",
    innerHTML: "",
    width: 1200,
    height: 900,
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: classList(),
    children: [],
    options: [],
    appendChild(child) { this.children.push(child); this.options.push(child); return child; },
    append(...children) { this.children.push(...children); },
    remove: noop,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    removeAttribute: noop,
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    showModal: noop,
    close: noop,
    click: noop,
    focus: noop,
    getContext: () => canvasContext,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 900 }),
    setPointerCapture: noop,
    releasePointerCapture: noop,
    hasPointerCapture: () => false
  };
  return element;
}

const elements = new Map();
const document = {
  body: makeElement("body"),
  documentElement: makeElement("html"),
  fullscreenElement: null,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (tag) => makeElement(tag),
  createDocumentFragment: () => makeElement("fragment"),
  addEventListener: noop,
  removeEventListener: noop
};

const storage = new Map();
const localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};
const windowObject = {
  document,
  localStorage,
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 1,
  location: { protocol: "http:", hostname: "127.0.0.1", pathname: "/" },
  navigator: { userAgent: "node-test", mediaDevices: {} },
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  addEventListener: noop,
  removeEventListener: noop,
  setTimeout,
  clearTimeout,
  confirm: () => true,
  alert: noop,
  prompt: () => null,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: noop,
  URL: { createObjectURL: () => "blob:test", revokeObjectURL: noop }
};

const context = vm.createContext({
  window: windowObject,
  document,
  navigator: windowObject.navigator,
  localStorage,
  location: windowObject.location,
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: windowObject.requestAnimationFrame,
  cancelAnimationFrame: noop,
  crypto: { randomUUID: (() => { let value = 0; return () => `test-${++value}`; })() },
  structuredClone: (value) => JSON.parse(JSON.stringify(value)),
  ResizeObserver: class { observe() {} disconnect() {} },
  Image: class {},
  FileReader: class {},
  Blob: class {},
  URL: windowObject.URL,
  performance: { now: () => 0 }
});
windowObject.window = windowObject;
windowObject.requestAnimationFrame = context.requestAnimationFrame;

const appPath = path.join(__dirname, "..", "1_App", "js", "app.js");
let source = fs.readFileSync(appPath, "utf8");
source += `\n;globalThis.__multiBallTest = {
  migrateSnapshot,
  calculateStepEndState,
  assignDefaultPlayOrders,
  getStepBalls,
  getPrimaryBall,
  findPlayerAt,
  addStep,
  createSnapshot,
  state
};`;
vm.runInContext(source, context, { filename: appPath });

const api = context.__multiBallTest;
const plain = (value) => JSON.parse(JSON.stringify(value));

const oldSnapshot = {
  schemaVersion: 17,
  courtMode: "half",
  activeStepId: "legacy-step",
  steps: [{
    id: "legacy-step",
    players: [{ id: "o1", side: "offense", label: "1", x: 100, y: 200 }],
    ball: { id: "ball", x: 120, y: 220 },
    lines: [{ id: "legacy-pass", type: "pass", start: { x: 120, y: 220 }, end: { x: 300, y: 300 }, points: [{ x: 120, y: 220 }, { x: 300, y: 300 }] }]
  }]
};
const migrated = api.migrateSnapshot(oldSnapshot);
assert.equal(migrated.schemaVersion, 18);
assert.equal(migrated.steps[0].balls.length, 1);
assert.equal(migrated.steps[0].balls[0].x, 120);
assert.equal(migrated.steps[0].ball.id, migrated.steps[0].balls[0].id);
assert.equal(migrated.steps[0].lines[0].ballId, migrated.steps[0].balls[0].id);

const multiStep = {
  id: "multi-step",
  label: "STEP 1",
  note: "",
  players: [{ id: "o1", side: "offense", label: "1", x: 100, y: 100 }],
  ball: { id: "ball", label: "1", x: 120, y: 120 },
  balls: [
    { id: "ball", label: "1", x: 120, y: 120 },
    { id: "ball-two", label: "2", x: 400, y: 120 }
  ],
  cones: [], texts: [], media: [],
  lines: [
    { id: "b1-pass-1", type: "pass", ballId: "ball", start: { x: 120, y: 120 }, end: { x: 220, y: 120 }, points: [{ x: 120, y: 120 }, { x: 220, y: 120 }], playOrder: null },
    { id: "b2-pass-1", type: "pass", ballId: "ball-two", start: { x: 400, y: 120 }, end: { x: 500, y: 120 }, points: [{ x: 400, y: 120 }, { x: 500, y: 120 }], playOrder: null },
    { id: "b1-pass-2", type: "pass", ballId: "ball", start: { x: 220, y: 120 }, end: { x: 320, y: 120 }, points: [{ x: 220, y: 120 }, { x: 320, y: 120 }], playOrder: null },
    { id: "o1-move-1", type: "move", playerId: "o1", start: { x: 100, y: 100 }, end: { x: 180, y: 180 }, points: [{ x: 100, y: 100 }, { x: 180, y: 180 }], playOrder: null },
    { id: "o1-move-2", type: "move", playerId: "o1", start: { x: 180, y: 180 }, end: { x: 260, y: 220 }, points: [{ x: 180, y: 180 }, { x: 260, y: 220 }], playOrder: null }
  ]
};
api.assignDefaultPlayOrders(multiStep);
assert.deepEqual(multiStep.lines.slice(0, 3).map((line) => line.playOrder), [1, 1, 2]);
assert.deepEqual(multiStep.lines.slice(3).map((line) => line.playOrder), [1, 2]);
const endState = api.calculateStepEndState(multiStep);
assert.deepEqual(plain(endState.balls.ball), { x: 320, y: 120 });
assert.deepEqual(plain(endState.balls["ball-two"]), { x: 500, y: 120 });
assert.deepEqual(plain(endState.players.o1), { x: 260, y: 220 });

api.state.steps = [multiStep];
api.state.activeStepId = multiStep.id;
const plannedPlayer = api.findPlayerAt({ x: 260, y: 220 });
assert.equal(plannedPlayer.id, "o1");
assert.equal(plannedPlayer.x, 260);
assert.equal(plannedPlayer.y, 220);

api.addStep();
assert.equal(api.state.steps.length, 2);
const nextStep = api.state.steps[1];
assert.deepEqual(nextStep.players[0].x, 260);
assert.deepEqual(nextStep.players[0].y, 220);
assert.deepEqual(plain(nextStep.balls.map(({ id, x, y }) => ({ id, x, y }))), [
  { id: "ball", x: 320, y: 120 },
  { id: "ball-two", x: 500, y: 120 }
]);
assert.equal(nextStep.ball.id, "ball");
assert.equal(nextStep.lines.length, 0);

const savedSnapshot = plain(api.createSnapshot());
assert.equal(savedSnapshot.schemaVersion, 18);
assert.equal(savedSnapshot.steps[1].balls.length, 2);
assert.equal(savedSnapshot.steps[1].ball.x, 320);
const reloadedSnapshot = api.migrateSnapshot(savedSnapshot);
assert.equal(reloadedSnapshot.steps[1].balls[1].id, "ball-two");
assert.equal(reloadedSnapshot.steps[1].balls[1].x, 500);

console.log("multi-ball compatibility tests passed");
