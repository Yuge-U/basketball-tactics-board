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
// Connection rendering is exercised separately in the series browser checks.
windowObject.ZeroOneConnection = { create: () => ({ update() {}, open() {} }) };

const appPath = path.join(__dirname, "..", "1_App", "js", "app.js");
let source = fs.readFileSync(appPath, "utf8");
source += `\n;globalThis.__multiBallTest = {
  migrateSnapshot,
  calculateStepEndState,
  assignDefaultPlayOrders,
  getStepBalls,
  getPrimaryBall,
  createInitialState,
  findCarriedBallIds,
  findDraggableAt,
  getPlayerRadius,
  getBallRadius,
  findPlayerAt,
  addStep,
  createSnapshot,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  cancelCanvasOperation,
  undo,
  redo,
  setViewportForTest(width, scale) {
    window.innerWidth = width;
    mobileLayoutEnabled = width <= 600;
    viewport.scale = scale;
  },
  pointerAt(point) {
    return { pointerId: 1, preventDefault() {},
      clientX: viewport.offsetX + (point.x + COURT_OUTER_MARGIN) * viewport.scale,
      clientY: viewport.offsetY + (point.y + COURT_OUTER_MARGIN) * viewport.scale };
  },
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

// Choosing the initial arrangement copies every original position rather than any action endpoint.
api.state.steps = [plain({ ...multiStep, note: "元のコーチングポイント" })];
api.state.activeStepId = multiStep.id;
api.state.steps = api.migrateSnapshot(plain(api.createSnapshot())).steps;
const beforeCopySnapshot = plain(api.createSnapshot());
api.addStep("before");
const initialCopy = api.state.steps[1];
assert.deepEqual(plain(api.state.steps[0]), beforeCopySnapshot.steps[0], "step duplication leaves the source unchanged");
assert.deepEqual(plain(initialCopy.players), beforeCopySnapshot.steps[0].players);
assert.deepEqual(plain(initialCopy.balls), beforeCopySnapshot.steps[0].balls);
assert.equal(initialCopy.ball, initialCopy.balls[0]);
assert.equal(initialCopy.lines.length, 0);
assert.equal(initialCopy.note, "");
assert.notEqual(initialCopy.id, multiStep.id);
assert.equal(api.state.activeStepId, initialCopy.id);
const copiedInitialSnapshot = plain(api.createSnapshot());
api.undo();
assert.deepEqual(plain(api.createSnapshot()), beforeCopySnapshot);
api.redo();
assert.deepEqual(plain(api.createSnapshot()), copiedInitialSnapshot);
const reloadedInitialCopy = api.migrateSnapshot(copiedInitialSnapshot).steps[1];
assert.equal(reloadedInitialCopy.players[0].x, 100);
assert.equal(reloadedInitialCopy.balls[0].x, 120);
assert.equal(reloadedInitialCopy.balls[1].x, 400);

// Manual player dragging carries only the balls held at the start, without changing their offsets.
const dragStep = {
  id: "drag-step", label: "STEP 1", note: "", cones: [], texts: [], media: [], lines: [],
  players: [
    { id: "holder", side: "offense", label: "1", x: 300, y: 400 },
    { id: "other-holder", side: "offense", label: "2", x: 500, y: 400 }
  ],
  balls: [
    { id: "ball", label: "1", x: 350, y: 400 },
    { id: "other-ball", label: "2", x: 540, y: 400 },
    { id: "second-held-ball", label: "3", x: 300, y: 450 },
    { id: "loose-ball", label: "4", x: 900, y: 500 }
  ]
};
api.state.steps = [plain(dragStep)];
api.state.activeStepId = dragStep.id;
api.state.activeTool = "select";
const active = () => api.state.steps[0];
const positions = (items) => plain(items.map(({ id, x, y }) => ({
  id, x: Math.round(x * 1e8) / 1e8, y: Math.round(y * 1e8) / 1e8
})));
assert.deepEqual(plain(api.findCarriedBallIds(active(), "holder")), ["ball", "second-held-ball"]);
assert.deepEqual(plain(api.findCarriedBallIds(active(), "other-holder")), ["other-ball"]);
const adjacentPlayers = { players: [
  { id: "left", x: 300, y: 400 }, { id: "right", x: 350, y: 400 }
], balls: [{ id: "near-right", x: 335, y: 400 }] };
assert.deepEqual(plain(api.findCarriedBallIds(adjacentPlayers, "left")), []);
assert.deepEqual(plain(api.findCarriedBallIds(adjacentPlayers, "right")), ["near-right"]);
const originalDragSnapshot = plain(api.createSnapshot());
api.handlePointerDown(api.pointerAt({ x: 300, y: 400 }));
for (const point of [{ x: 700, y: 500 }, { x: 900, y: 500 }, { x: 950, y: 550 }]) {
  api.handlePointerMove(api.pointerAt(point));
}
api.handlePointerUp(api.pointerAt({ x: 950, y: 550 }));
assert.deepEqual(positions(active().players), [
  { id: "holder", x: 950, y: 550 }, { id: "other-holder", x: 500, y: 400 }
]);
assert.deepEqual(positions(active().balls), [
  { id: "ball", x: 1000, y: 550 }, { id: "other-ball", x: 540, y: 400 },
  { id: "second-held-ball", x: 950, y: 600 }, { id: "loose-ball", x: 900, y: 500 }
]);
assert.equal(active().ball, active().balls[0], "legacy ball reference follows the primary ball");
const movedDragSnapshot = plain(api.createSnapshot());
api.undo();
assert.deepEqual(plain(api.createSnapshot()), originalDragSnapshot, "one undo restores both player and held balls");
api.redo();
assert.deepEqual(plain(api.createSnapshot()), movedDragSnapshot);

// A ball remains independently draggable, and cancelling a later player drag restores the whole group.
api.handlePointerDown(api.pointerAt({ x: 1000, y: 550 }));
api.handlePointerMove(api.pointerAt({ x: 800, y: 700 }));
api.handlePointerUp(api.pointerAt({ x: 800, y: 700 }));
assert(Math.abs(active().balls[0].x - 800) < 1e-8);
assert(Math.abs(active().players[0].x - 950) < 1e-8);
const beforeCancel = plain(api.createSnapshot());
api.handlePointerDown(api.pointerAt({ x: 950, y: 550 }));
api.handlePointerMove(api.pointerAt({ x: 850, y: 350 }));
api.cancelCanvasOperation();
assert.deepEqual(plain(api.createSnapshot()), beforeCancel, "Escape restores player and all followed balls");
const restoredManualMove = api.migrateSnapshot(plain(api.createSnapshot()));
assert.equal(restoredManualMove.schemaVersion, 18);
assert(Math.abs(restoredManualMove.steps[0].balls[0].x - 800) < 1e-8);
assert.equal("carriedBallIds" in restoredManualMove.steps[0], false, "drag associations are not persisted");

// On a 390px iPhone layout, the ball's touch halo must not cover the visible player body.
Object.assign(api.state, api.createInitialState());
api.setViewportForTest(390, 0.323);
const initialMobilePlayer = plain(active().players[0]);
const initialMobileBall = plain(api.getPrimaryBall(active()));
assert.equal(initialMobilePlayer.x, 525);
assert.equal(initialMobileBall.x, 567);
assert(api.getPlayerRadius() > 33 && api.getPlayerRadius() < 34);
assert(api.getBallRadius() > 24 && api.getBallRadius() < 25);
assert.deepEqual(plain(api.findDraggableAt(initialMobilePlayer)), { type: "player", id: initialMobilePlayer.id });
assert.deepEqual(plain(api.findDraggableAt(initialMobileBall)), { type: "ball", id: initialMobileBall.id });
assert.deepEqual(plain(api.findDraggableAt({ x: initialMobilePlayer.x + 30, y: initialMobilePlayer.y })),
  { type: "ball", id: initialMobileBall.id }, "the visible ball body retains priority where the drawn circles overlap");
const mobileTarget = { x: initialMobilePlayer.x + 100, y: initialMobilePlayer.y - 120 };
api.handlePointerDown(api.pointerAt(initialMobilePlayer));
api.handlePointerMove(api.pointerAt(mobileTarget));
api.handlePointerUp(api.pointerAt(mobileTarget));
assert(Math.abs(active().players[0].x - mobileTarget.x) < 1e-8, "the visible player center starts a player drag");
assert(Math.abs(active().players[0].y - mobileTarget.y) < 1e-8);
assert(Math.abs(active().balls[0].x - (initialMobileBall.x + 100)) < 1e-8, "its held ball follows on mobile");
assert(Math.abs(active().balls[0].y - (initialMobileBall.y - 120)) < 1e-8);
const mobilePlayerAfterDrag = plain(active().players[0]);
api.handlePointerDown(api.pointerAt(active().balls[0]));
api.handlePointerMove(api.pointerAt({ x: 300, y: 300 }));
api.handlePointerUp(api.pointerAt({ x: 300, y: 300 }));
assert.deepEqual(plain(active().players[0]), mobilePlayerAfterDrag, "dragging the visible mobile ball does not move its player");
assert(Math.abs(active().balls[0].x - 300) < 1e-8);
assert(Math.abs(active().balls[0].y - 300) < 1e-8);

console.log("multi-ball compatibility tests passed");
