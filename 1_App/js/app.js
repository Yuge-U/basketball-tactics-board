// 半面コートをFIBA寸法比の15m×14mで扱う論理サイズを定義します。
const HALF_COURT = { width: 1050, height: 980 };
// 全面コートをFIBA寸法比の28m×15mで扱う論理サイズを定義します。
const FULL_COURT = { width: 1120, height: 600 };
// スローイン配置に使うコート外周の論理余白を定義します。
const COURT_OUTER_MARGIN = 76;
// v8の半面コート論理サイズを移行処理用に定義します。
const V8_HALF_COURT = { width: 1280, height: 760 };
// v6までの半面コート論理サイズを移行処理用に定義します。
const V6_HALF_COURT = { width: 1400, height: 760 };
// v4の半面コート論理サイズを移行処理用に定義します。
const PREVIOUS_HALF_COURT = { width: 980, height: 840 };
// v2からv3の半面コート論理サイズを移行処理用に定義します。
const V2_HALF_COURT = { width: 900, height: 840 };
// 初期版の半面コート論理サイズを移行処理用に定義します。
const LEGACY_HALF_COURT = { width: 1000, height: 600 };
// 旧版の全面コート論理サイズを移行処理用に定義します。
const LEGACY_FULL_COURT = { width: 1200, height: 700 };
// 保存データの構造バージョンを定義します。
const SCHEMA_VERSION = 11;
// 選手マーカーの大・中・小サイズを定義します。
const PLAYER_SIZES = {
  // 現在まで使っていた最大サイズです。
  large: { radius: 27, fontSize: 23, lineWidth: 5 },
  // 最大サイズより約2割小さい中サイズです。
  medium: { radius: 22, fontSize: 19, lineWidth: 4 },
  // 混雑した配置で使いやすい小サイズです。
  small: { radius: 17, fontSize: 15, lineWidth: 3 }
};

// 選手サイズ名を利用可能な値へ補正します。
function normalizePlayerSize(value) {
  // 定義済みサイズならその値を返します。
  if (PLAYER_SIZES[value]) {
    // 有効なサイズ名を返します。
    return value;
  }
  // 未定義の場合は従来サイズの大へ戻します。
  return "large";
}

// 現在選択中の選手表示設定を返します。
function getPlayerStyle() {
  // 状態のサイズ名を補正して対応設定を返します。
  return PLAYER_SIZES[normalizePlayerSize(state?.playerSize)];
}

// 現在選択中の選手半径を返します。
function getPlayerRadius() {
  // 選手表示設定から半径を返します。
  return getPlayerStyle().radius;
}

// 速度設定を利用可能な範囲へ補正します。
function normalizeSpeed(value) {
  // 数値へ変換します。
  const parsed = Number(value);
  // 数値でない場合は標準速度を返します。
  if (!Number.isFinite(parsed)) {
    // 標準速度を返します。
    return 1;
  }
  // 0.25刻みに丸めて最小値と最大値の範囲へ収めます。
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(parsed * 4) / 4));
}
// ボールマーカーの半径を定義します。
const BALL_RADIUS = 17;
// コーンの描画幅を定義します。
const CONE_WIDTH = 34;
// コーンの描画高さを定義します。
const CONE_HEIGHT = 42;
// 速度設定の最小値を定義します。
const MIN_SPEED = 0.5;
// 速度設定の最大値を定義します。
const MAX_SPEED = 2;
// コート上へ配置するテキストの標準サイズを定義します。
const TEXT_FONT_SIZE = 34;
// 自動保存に使うキーを定義します。
const AUTOSAVE_KEY = "basketball-tactics-autosave-v1";
// 作戦ライブラリに使うキーを定義します。
const LIBRARY_KEY = "basketball-tactics-library-v1";
// 選択可能な線色を定義します。
const LINE_COLORS = {
  // 黒線の色です。
  black: "#111827",
  // 赤線の色です。
  red: "#dc2626",
  // 青線の色です。
  blue: "#2563eb"
};
// 選手が軌道に沿って動く線種を定義します。
const MOVEMENT_LINE_TYPES = new Set(["move", "dribbleFree", "dribbleStraight", "screenFree", "screenStraight", "dribble", "screen"]);
// ボールが選手へ追従するドリブル線種を定義します。
const DRIBBLE_LINE_TYPES = new Set(["dribbleFree", "dribbleStraight", "dribble"]);
// 終点にスクリーン記号を描く線種を定義します。
const SCREEN_LINE_TYPES = new Set(["screenFree", "screenStraight", "screen"]);
// 指の軌跡をそのまま点列として記録する線種を定義します。
const FREEHAND_LINE_TYPES = new Set(["move", "dribbleFree", "screenFree", "dribble", "free"]);

// 指定した線種が選手移動を伴うか返します。
function isMovementLineType(type) {
  // 対応する線種ならtrueを返します。
  return MOVEMENT_LINE_TYPES.has(type);
}

// 指定した線種がドリブルか返します。
function isDribbleLineType(type) {
  // 対応する線種ならtrueを返します。
  return DRIBBLE_LINE_TYPES.has(type);
}

// 指定した線種がスクリーンか返します。
function isScreenLineType(type) {
  // 対応する線種ならtrueを返します。
  return SCREEN_LINE_TYPES.has(type);
}

// 指定した線種が再生対象か返します。
function isAnimatedLineType(type) {
  // パスまたは選手移動を伴う線種ならtrueを返します。
  return type === "pass" || isMovementLineType(type);
}

// 指定した線種がボールの順番管理を必要とするか返します。
function isBallSequenceLineType(type) {
  // パスまたはドリブルならtrueを返します。
  return type === "pass" || isDribbleLineType(type);
}

// 再生順として利用できる正の整数へ補正します。
function normalizePlayOrder(value, fallback = 1) {
  // 数値へ変換します。
  const parsed = Number(value);
  // 1以上の整数ならその値を返します。
  if (Number.isInteger(parsed) && parsed >= 1) {
    // 有効な再生順を返します。
    return parsed;
  }
  // 無効な場合は指定された初期値を返します。
  return fallback;
}

// STEP内の動作線へ初期再生順を設定します。
function assignDefaultPlayOrders(step, onlyMissing = false) {
  // STEPや線配列がない場合は処理しません。
  if (!step || !Array.isArray(step.lines)) {
    // 処理を終了します。
    return;
  }
  // 次のボール動作に使う順番を初期化します。
  let nextBallOrder = 1;
  // 選手ごとの直前動作順を保持します。
  const lastPlayerOrder = {};
  // 描画順に戦術線を確認します。
  step.lines.forEach((line) => {
    // 再生対象外の線は処理しません。
    if (!isAnimatedLineType(line.type)) {
      // 次の線へ進みます。
      return;
    }
    // 対象選手の次に使える順番を計算します。
    const nextPlayerOrder = line.playerId ? (lastPlayerOrder[line.playerId] ?? 0) + 1 : 1;
    // 線種に応じた初期順番を保持します。
    let suggestedOrder = 1;
    // パスの場合はボール動作の次順を使います。
    if (line.type === "pass") {
      // ボール動作の次順を設定します。
      suggestedOrder = nextBallOrder;
    } else if (isDribbleLineType(line.type)) {
      // ドリブルはボール順と同じ選手の直前動作順の両方を守ります。
      suggestedOrder = Math.max(nextBallOrder, nextPlayerOrder);
    } else {
      // 移動とスクリーンは別選手なら同時の1、同じ選手なら次順にします。
      suggestedOrder = Math.max(1, nextPlayerOrder);
    }
    // 既存順番を保持する条件を判定します。
    const keepExisting = onlyMissing && Number.isInteger(Number(line.playOrder)) && Number(line.playOrder) >= 1;
    // 再生順を既存値または初期値で確定します。
    line.playOrder = keepExisting ? Number(line.playOrder) : suggestedOrder;
    // ボール動作の場合は次のボール順を更新します。
    if (isBallSequenceLineType(line.type)) {
      // 現在順より後になるよう更新します。
      nextBallOrder = Math.max(nextBallOrder, line.playOrder + 1);
    }
    // 選手動作の場合は選手ごとの直前順を更新します。
    if (line.playerId && isMovementLineType(line.type)) {
      // 現在の最大順を保存します。
      lastPlayerOrder[line.playerId] = Math.max(lastPlayerOrder[line.playerId] ?? 0, line.playOrder);
    }
  });
}

// STEP内の再生対象を順番ごとのグループへ分けます。
function getOrderedActionGroups(step) {
  // 再生対象線を描画順付きで抽出します。
  const actions = (step?.lines ?? []).map((line, index) => ({ line, index })).filter(({ line }) => line.type === "pass" || (line.playerId && isMovementLineType(line.type)));
  // 順番ごとのMapを作ります。
  const grouped = new Map();
  // 各動作を対応する順番へ追加します。
  actions.forEach((action) => {
    // 再生順を正の整数へ補正します。
    const order = normalizePlayOrder(action.line.playOrder, 1);
    // 対象順の配列がなければ作ります。
    if (!grouped.has(order)) {
      // 空配列を登録します。
      grouped.set(order, []);
    }
    // 描画順情報付きで追加します。
    grouped.get(order).push(action);
  });
  // 再生順の昇順へ並べて返します。
  return [...grouped.entries()].sort((left, right) => left[0] - right[0]).map(([order, items]) => ({ order, items: items.sort((left, right) => left.index - right.index) }));
}

// Canvas要素を取得します。
const canvas = document.getElementById("tacticsCanvas");
// Canvasの描画コンテキストを取得します。
const context = canvas.getContext("2d");
// Canvasの外枠を取得します。
const canvasShell = document.getElementById("canvasShell");
// 作戦名入力欄を取得します。
const playNameInput = document.getElementById("playName");
// STEPメモ入力欄を取得します。
const stepNoteInput = document.getElementById("stepNote");
// STEP一覧を取得します。
const stepList = document.getElementById("stepList");
// ツール状態表示を取得します。
const toolStatus = document.getElementById("toolStatus");
// 操作ヒントを取得します。
const canvasHint = document.getElementById("canvasHint");
// 一時メッセージ要素を取得します。
const toast = document.getElementById("toast");
// 保存済み作戦ダイアログを取得します。
const libraryDialog = document.getElementById("libraryDialog");
// 保存済み作戦一覧を取得します。
const libraryList = document.getElementById("libraryList");
const playFolderInput = document.getElementById("playFolder");
const playTagsInput = document.getElementById("playTags");
const playFavoriteInput = document.getElementById("playFavorite");
const librarySearchInput = document.getElementById("librarySearch");
const libraryFolderFilter = document.getElementById("libraryFolderFilter");
const libraryFavoriteOnly = document.getElementById("libraryFavoriteOnly");
const connectFolderButton = document.getElementById("connectFolderButton");
const refreshLibraryButton = document.getElementById("refreshLibraryButton");
const folderModeMessage = document.getElementById("folderModeMessage");
const oneDriveDialog = document.getElementById("oneDriveDialog");
const oneDriveButton = document.getElementById("oneDriveButton");
const oneDriveConnectionCard = document.getElementById("oneDriveConnectionCard");
const oneDriveConnectionTitle = document.getElementById("oneDriveConnectionTitle");
const oneDriveConnectionDetail = document.getElementById("oneDriveConnectionDetail");
const oneDriveClientIdInput = document.getElementById("oneDriveClientId");
const oneDriveRedirectUriInput = document.getElementById("oneDriveRedirectUri");
const connectOneDriveButton = document.getElementById("connectOneDriveButton");
const disconnectOneDriveButton = document.getElementById("disconnectOneDriveButton");
let lastLibraryItems = [];
// JSON読込用のファイル選択欄を取得します。
const importJsonInput = document.getElementById("importJsonInput");
// 移動線表示切替を取得します。
const showMovementLinesToggle = document.getElementById("showMovementLinesToggle");
// 最大表示用の操作領域を取得します。
const focusControls = document.getElementById("focusControls");
// 最大表示用の再生ボタンを取得します。
const focusPlayButton = document.getElementById("focusPlayButton");
// 最大表示用のSTEP一覧を取得します。
const focusStepList = document.getElementById("focusStepList");
// 最大表示中の再生ボタン表示切替を取得します。
const focusPlayVisibilityButton = document.getElementById("focusPlayVisibilityButton");
// 最大表示中のSTEP一覧表示切替を取得します。
const focusStepsVisibilityButton = document.getElementById("focusStepsVisibilityButton");
// 最大表示中の編集パネルを取得します。
const focusEditorPanel = document.getElementById("focusEditorPanel");
// 最大表示中の編集パネル開閉ボタンを取得します。
const focusEditorToggleButton = document.getElementById("focusEditorToggleButton");
// 最大表示中の元に戻すボタンを取得します。
const focusUndoButton = document.getElementById("focusUndoButton");
// 最大表示中のやり直しボタンを取得します。
const focusRedoButton = document.getElementById("focusRedoButton");
// オフェンス番号ボタンの配置先を取得します。
const offenseNumberGrid = document.getElementById("offenseNumberGrid");
// ディフェンス番号ボタンの配置先を取得します。
const defenseNumberGrid = document.getElementById("defenseNumberGrid");
// 選手人数の表示欄を取得します。
const offensePlayerCount = document.getElementById("offensePlayerCount");
const defensePlayerCount = document.getElementById("defensePlayerCount");
// 全番号の開閉要素を取得します。
const playerNumberDetails = document.getElementById("playerNumberDetails");
const playerNumberDetailsToggle = document.getElementById("playerNumberDetailsToggle");
// 現在STEPの動作順一覧を取得します。
const actionOrderList = document.getElementById("actionOrderList");
// 動作順を初期値へ戻すボタンを取得します。
const resetActionOrderButton = document.getElementById("resetActionOrderButton");
// 移動速度スライダーを取得します。
const movementSpeedRange = document.getElementById("movementSpeedRange");
// 移動速度の表示欄を取得します。
const movementSpeedValue = document.getElementById("movementSpeedValue");
// 連続再生速度スライダーを取得します。
const playbackSpeedRange = document.getElementById("playbackSpeedRange");
// 連続再生速度の表示欄を取得します。
const playbackSpeedValue = document.getElementById("playbackSpeedValue");
// 赤コーン数の表示欄を取得します。
const redConeCount = document.getElementById("redConeCount");
// 青コーン数の表示欄を取得します。
const blueConeCount = document.getElementById("blueConeCount");
// 通常表示の一つ前ボタンを取得します。
const previousFrameButton = document.getElementById("previousFrameButton");
// 通常表示の次へボタンを取得します。
const nextFrameButton = document.getElementById("nextFrameButton");
// 最大表示の一つ前ボタンを取得します。
const focusPreviousFrameButton = document.getElementById("focusPreviousFrameButton");
// 最大表示の次へボタンを取得します。
const focusNextFrameButton = document.getElementById("focusNextFrameButton");

// ツール名の表示文言を定義します。
const TOOL_LABELS = {
  select: "選択・移動",
  move: "選手の移動線",
  pass: "パス線",
  dribbleFree: "ドリブル・フリーハンド",
  dribbleStraight: "ドリブル・直線",
  screenFree: "スクリーン・フリーハンド",
  screenStraight: "スクリーン・直線",
  free: "自由線",
  text: "テキスト配置",
  erase: "線・テキストを削除"
};

// アプリ全体の状態を定義します。
let state = createInitialState();
// 元に戻す履歴を保持します。
let undoStack = [];
// やり直す履歴を保持します。
let redoStack = [];
// 現在のドラッグ操作を保持します。
let dragSession = null;
// 現在の描画操作を保持します。
let drawSession = null;
// STEP再生中かどうかを保持します。
let playbackTimer = null;
// 選手移動アニメーションのフレームIDを保持します。
let playbackFrame = null;
// 再生中だけ使う選手とボールの表示位置を保持します。
let playbackVisual = null;
// 再生処理を識別して安全に中断する番号を保持します。
let playbackRunId = 0;
// Toastを消すタイマーを保持します。
let toastTimer = null;
// Canvasの表示変換情報を保持します。
let viewport = { scale: 1, offsetX: 0, offsetY: 0, cssWidth: 1, cssHeight: 1 };
// コートだけを最大表示しているかを保持します。
let isFocusMode = false;
// 最大表示中の編集パネルを開いているか保持します。
let isFocusEditorOpen = false;
// 全番号選択欄を開いているか保持します。
let playerNumberDetailsVisible = false;
// コマ送り再生の現在位置を保持します。
let framePlayback = null;

// 一意なIDを作ります。
function makeId(prefix) {
  // 現在時刻と乱数を組み合わせて返します。
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 初期状態を作ります。
function createInitialState() {
  // 最初のSTEPを作ります。
  const firstStep = createDefaultStep(1, HALF_COURT);
  // アプリ状態を返します。
  return {
    playName: "新しい作戦",
    libraryMeta: { folder: "Shared", tags: [], favorite: false },
    courtMode: "half",
    activeTool: "select",
    activeLineColor: "black",
    playerSize: "large",
    movementSpeed: 1,
    playbackSpeed: 1,
    showMovementLines: true,
    focusShowPlayButton: false,
    focusShowSteps: false,
    activeStepId: firstStep.id,
    steps: [firstStep]
  };
}

// 初期配置のSTEPを作ります。
function createDefaultStep(number, size) {
  // コート幅を短い変数へ格納します。
  const width = size.width;
  // コート高さを短い変数へ格納します。
  const height = size.height;
  // STEPデータを返します。
  return {
    id: makeId("step"),
    label: `STEP ${number}`,
    note: "",
    players: [
      { id: "o1", side: "offense", label: "1", x: width * 0.5, y: height * 0.78 },
      { id: "o2", side: "offense", label: "2", x: width * 0.24, y: height * 0.65 },
      { id: "o3", side: "offense", label: "3", x: width * 0.76, y: height * 0.65 },
      { id: "o4", side: "offense", label: "4", x: width * 0.35, y: height * 0.36 },
      { id: "o5", side: "offense", label: "5", x: width * 0.65, y: height * 0.36 }
    ],
    ball: { id: "ball", x: width * 0.54, y: height * 0.78 },
    cones: [],
    lines: [],
    texts: []
  };
}

// 現在のコートサイズを返します。
function getCourtSize() {
  // 全面の場合は全面サイズを返します。
  if (state.courtMode === "full") {
    return FULL_COURT;
  }
  // それ以外は半面サイズを返します。
  return HALF_COURT;
}

// コート本体にスローイン用外周を加えたCanvas論理サイズを返します。
function getCourtDisplaySize() {
  const size = getCourtSize();
  return {
    width: size.width + COURT_OUTER_MARGIN * 2,
    height: size.height + COURT_OUTER_MARGIN * 2
  };
}

// 現在選択中のSTEPを返します。
function getActiveStep() {
  // IDが一致するSTEPを探して返します。
  return state.steps.find((step) => step.id === state.activeStepId) ?? state.steps[0];
}

// 状態を履歴保存用に複製します。
function createSnapshot() {
  // JSON変換を使って深いコピーを作ります。
  return JSON.parse(JSON.stringify({
    // 保存データの構造バージョンを記録します。
    schemaVersion: SCHEMA_VERSION,
    // 作戦名を保存します。
    playName: state.playName,
    // ライブラリ管理情報を保存します。
    libraryMeta: state.libraryMeta ?? { folder: "Shared", tags: [], favorite: false },
    // コート種別を保存します。
    courtMode: state.courtMode,
    // 選択中の線色を保存します。
    activeLineColor: state.activeLineColor,
    // 選手マーカーの表示サイズを保存します。
    playerSize: state.playerSize,
    // 選手とボールの移動速度を保存します。
    movementSpeed: state.movementSpeed,
    // 連続再生のテンポを保存します。
    playbackSpeed: state.playbackSpeed,
    // 移動線の表示設定を保存します。
    showMovementLines: state.showMovementLines,
    // 選択中STEPを保存します。
    activeStepId: state.activeStepId,
    // 全STEPを保存します。
    steps: state.steps
  }));
}

// 旧版の保存データを現在のコート寸法へ変換します。
function migrateSnapshot(snapshot) {
  // 元データを壊さないように深いコピーを作ります。
  const migrated = JSON.parse(JSON.stringify(snapshot ?? {}));
  // 保存データの元バージョンを取得します。
  const sourceVersion = Number(migrated.schemaVersion ?? 1);
  // 保存時のコート種別を取得します。
  const mode = migrated.courtMode === "full" ? "full" : "half";
  // 現行版より古い場合だけ座標を変換します。
  if (sourceVersion < SCHEMA_VERSION) {
    // 保存バージョンに対応する半面寸法を選びます。
    const previousHalfSize = sourceVersion >= 8 ? HALF_COURT : sourceVersion >= 7 ? V8_HALF_COURT : sourceVersion >= 4 ? V6_HALF_COURT : sourceVersion >= 3 ? PREVIOUS_HALF_COURT : sourceVersion >= 2 ? V2_HALF_COURT : LEGACY_HALF_COURT;
    // v2以降の全面データは現在と同じ寸法を基準にします。
    const previousFullSize = sourceVersion >= 2 ? FULL_COURT : LEGACY_FULL_COURT;
    // 旧版の基準サイズをコート種別に応じて取得します。
    const oldSize = mode === "full" ? previousFullSize : previousHalfSize;
    // 現行版の基準サイズを取得します。
    const newSize = mode === "full" ? FULL_COURT : HALF_COURT;
    // X方向の変換倍率を計算します。
    const scaleX = newSize.width / oldSize.width;
    // Y方向の変換倍率を計算します。
    const scaleY = newSize.height / oldSize.height;
    // 全STEPを安全に走査します。
    (migrated.steps ?? []).forEach((step) => {
      // 全選手の座標を新しい寸法へ変換します。
      (step.players ?? []).forEach((player) => {
        // 選手のX座標を変換します。
        player.x *= scaleX;
        // 選手のY座標を変換します。
        player.y *= scaleY;
      });
      // ボールがある場合は座標を変換します。
      if (step.ball) {
        // ボールのX座標を変換します。
        step.ball.x *= scaleX;
        // ボールのY座標を変換します。
        step.ball.y *= scaleY;
      }
      // 全コーンの座標を新しい寸法へ変換します。
      (step.cones ?? []).forEach((cone) => {
        // コーンのX座標を変換します。
        cone.x *= scaleX;
        // コーンのY座標を変換します。
        cone.y *= scaleY;
      });
      // 全戦術線を新しい寸法へ変換します。
      (step.lines ?? []).forEach((line) => {
        // 開始点がある場合は座標を変換します。
        if (line.start) {
          // 開始点Xを変換します。
          line.start.x *= scaleX;
          // 開始点Yを変換します。
          line.start.y *= scaleY;
        }
        // 終了点がある場合は座標を変換します。
        if (line.end) {
          // 終了点Xを変換します。
          line.end.x *= scaleX;
          // 終了点Yを変換します。
          line.end.y *= scaleY;
        }
        // 曲線の各点がある場合はすべて変換します。
        (line.points ?? []).forEach((point) => {
          // 曲線点Xを変換します。
          point.x *= scaleX;
          // 曲線点Yを変換します。
          point.y *= scaleY;
        });
      });
      // コート上の全テキストを新しい寸法へ変換します。
      (step.texts ?? []).forEach((textItem) => {
        // テキストのX座標を変換します。
        textItem.x *= scaleX;
        // テキストのY座標を変換します。
        textItem.y *= scaleY;
        // 文字サイズを縦横倍率の小さい方へ合わせます。
        textItem.fontSize = Number(textItem.fontSize ?? TEXT_FONT_SIZE) * Math.min(scaleX, scaleY);
      });
    });
  }
  // 全STEPの不足項目を補います。
  (migrated.steps ?? []).forEach((step) => {
    // コーン配列がなければ空配列を設定します。
    step.cones = Array.isArray(step.cones) ? step.cones : [];
    // 保存済みコーンの不足項目を補います。
    step.cones.forEach((cone) => {
      // コーン色を赤または青へ補正します。
      cone.color = cone.color === "blue" ? "blue" : "red";
    });
    // 線配列がなければ空配列を設定します。
    step.lines = Array.isArray(step.lines) ? step.lines : [];
    // テキスト配列がなければ空配列を設定します。
    step.texts = Array.isArray(step.texts) ? step.texts : [];
    // 保存済みテキストの不足項目を補います。
    step.texts.forEach((textItem) => {
      // テキスト内容を文字列へ補正します。
      textItem.text = String(textItem.text ?? "テキスト");
      // 有効な色名でなければ黒へ戻します。
      textItem.color = LINE_COLORS[textItem.color] ? textItem.color : "black";
      // 有効な文字サイズでなければ標準サイズを設定します。
      textItem.fontSize = Number.isFinite(Number(textItem.fontSize)) ? Number(textItem.fontSize) : TEXT_FONT_SIZE;
    });
    // 旧版の線へ黒色を補います。
    step.lines.forEach((line) => {
      // 旧版のフリーハンドドリブルを新しい線種名へ移行します。
      if (line.type === "dribble") {
        // 曲線ドリブルとして扱います。
        line.type = "dribbleFree";
      }
      // 旧版の直線スクリーンを新しい線種名へ移行します。
      if (line.type === "screen") {
        // 直線スクリーンとして扱います。
        line.type = "screenStraight";
      }
      // 有効な色名でなければ黒へ戻します。
      line.color = LINE_COLORS[line.color] ? line.color : "black";
    });
    // 旧版データや順番未設定の線へ初期再生順を補います。
    assignDefaultPlayOrders(step, true);
  });
  // 選択中の線色を補正します。
  migrated.activeLineColor = LINE_COLORS[migrated.activeLineColor] ? migrated.activeLineColor : "black";
  // 選手マーカーサイズを補正し、旧版は従来サイズの大へ設定します。
  migrated.playerSize = normalizePlayerSize(migrated.playerSize);
  // 移動速度を補正します。
  migrated.movementSpeed = normalizeSpeed(migrated.movementSpeed);
  // 連続再生速度を補正します。
  migrated.playbackSpeed = normalizeSpeed(migrated.playbackSpeed);
  // 移動線表示設定を補います。
  migrated.showMovementLines = migrated.showMovementLines !== false;
  // ライブラリ管理情報を補います。
  migrated.libraryMeta = migrated.libraryMeta ?? { folder: "Shared", tags: [], favorite: false };
  migrated.libraryMeta.folder = String(migrated.libraryMeta.folder || "Shared");
  migrated.libraryMeta.tags = Array.isArray(migrated.libraryMeta.tags) ? migrated.libraryMeta.tags.map(String) : [];
  migrated.libraryMeta.favorite = Boolean(migrated.libraryMeta.favorite);
  // 現行バージョンへ更新します。
  migrated.schemaVersion = SCHEMA_VERSION;
  // 変換済みデータを返します。
  return migrated;
}

// 履歴スナップショットを状態へ適用します。
function applySnapshot(snapshot) {
  // 最大表示中の一時的な表示切替は履歴や保存データとは分離します。
  const focusVisibility = {
    play: isFocusMode ? state.focusShowPlayButton : false,
    steps: isFocusMode ? state.focusShowSteps : false
  };
  // 旧版データを含めて現行形式へ変換します。
  const migrated = migrateSnapshot(snapshot);
  // 作戦名を復元します。
  state.playName = migrated.playName ?? "新しい作戦";
  // ライブラリ管理情報を復元します。
  state.libraryMeta = migrated.libraryMeta ?? { folder: "Shared", tags: [], favorite: false };
  if (playFolderInput) playFolderInput.value = state.libraryMeta.folder || "Shared";
  if (playTagsInput) playTagsInput.value = (state.libraryMeta.tags || []).join(", ");
  if (playFavoriteInput) playFavoriteInput.checked = Boolean(state.libraryMeta.favorite);
  // コート種別を復元します。
  state.courtMode = migrated.courtMode ?? "half";
  // 選択中の線色を復元します。
  state.activeLineColor = migrated.activeLineColor ?? "black";
  // 選手マーカーの表示サイズを復元します。
  state.playerSize = normalizePlayerSize(migrated.playerSize);
  // 移動速度を復元します。
  state.movementSpeed = normalizeSpeed(migrated.movementSpeed);
  // 連続再生速度を復元します。
  state.playbackSpeed = normalizeSpeed(migrated.playbackSpeed);
  // 移動線の表示設定を復元します。
  state.showMovementLines = migrated.showMovementLines !== false;
  // 最大表示の再生ボタンとSTEP一覧は標準表示とし、最大表示中だけ一時切替を維持します。
  state.focusShowPlayButton = focusVisibility.play;
  state.focusShowSteps = focusVisibility.steps;
  // STEPを復元します。
  state.steps = migrated.steps ?? [];
  // 各STEPに不足している配列を補います。
  state.steps.forEach((step) => {
    // コーン配列がなければ空配列を設定します。
    step.cones = Array.isArray(step.cones) ? step.cones : [];
    // 線配列がなければ空配列を設定します。
    step.lines = Array.isArray(step.lines) ? step.lines : [];
    // テキスト配列がなければ空配列を設定します。
    step.texts = Array.isArray(step.texts) ? step.texts : [];
  });
  // 選択中STEPを復元します。
  state.activeStepId = migrated.activeStepId ?? state.steps[0]?.id;
  // 作戦名入力欄を同期します。
  playNameInput.value = state.playName;
  // 画面全体を同期します。
  syncInterface();
}

// 変更前の状態を履歴へ積みます。
function pushUndo(snapshot = createSnapshot()) {
  // 履歴へスナップショットを追加します。
  undoStack.push(snapshot);
  // 履歴数が多すぎる場合は古いものを削除します。
  if (undoStack.length > 80) {
    undoStack.shift();
  }
  // 新しい変更後はやり直し履歴を消します。
  redoStack = [];
  // ボタン状態を更新します。
  updateHistoryButtons();
}

// 変更処理を履歴付きで実行します。
function commitMutation(mutator) {
  // 変更前の状態を保存します。
  pushUndo();
  // 渡された変更処理を実行します。
  mutator();
  // 変更後の画面を更新します。
  syncInterface();
}

// 元に戻します。
function undo() {
  // 履歴がない場合は終了します。
  if (undoStack.length === 0) {
    return;
  }
  // 現在状態をやり直し履歴へ保存します。
  redoStack.push(createSnapshot());
  // 一つ前の状態を取り出します。
  const snapshot = undoStack.pop();
  // 状態を復元します。
  applySnapshot(snapshot);
  // ボタン状態を更新します。
  updateHistoryButtons();
  // 操作結果を通知します。
  showToast("元に戻しました");
}

// やり直します。
function redo() {
  // やり直し履歴がない場合は終了します。
  if (redoStack.length === 0) {
    return;
  }
  // 現在状態を元に戻す履歴へ保存します。
  undoStack.push(createSnapshot());
  // 次の状態を取り出します。
  const snapshot = redoStack.pop();
  // 状態を復元します。
  applySnapshot(snapshot);
  // ボタン状態を更新します。
  updateHistoryButtons();
  // 操作結果を通知します。
  showToast("やり直しました");
}

// Canvasの表示サイズを調整します。
function resizeCanvas() {
  // 現在のコートサイズを取得します。
  const size = getCourtDisplaySize();
  // コートの縦横比を計算します。
  const courtRatio = size.width / size.height;
  // 通常編集画面ではコートの実寸比率を崩さず、画面の高さへ収めます。
  if (!isFocusMode) {
    // 外枠の縦横比をコート比率へ設定します。
    canvasShell.style.aspectRatio = `${size.width} / ${size.height}`;
    // ボード列の利用可能な横幅を取得します。
    const availableWidth = canvasShell.parentElement?.clientWidth || window.innerWidth;
    // Canvas上端から画面下端までの高さを取得します。
    const top = canvasShell.getBoundingClientRect().top;
    // STEP操作分を少し残しながら使える高さを計算します。
    const availableHeight = Math.max(300, window.innerHeight - top - 70);
    // 横幅と高さの両方へ収まる表示幅を計算します。
    const fittedWidth = Math.min(availableWidth, availableHeight * courtRatio);
    // 計算した幅を設定します。
    canvasShell.style.width = `${Math.max(360, fittedWidth)}px`;
    // ボード列の中央へ配置します。
    canvasShell.style.alignSelf = "center";
  } else {
    // 最大表示では画面全体を使うため比率指定を解除します。
    canvasShell.style.aspectRatio = "auto";
    // 最大表示時は横幅指定を解除します。
    canvasShell.style.width = "100%";
    // 最大表示時は配置指定を解除します。
    canvasShell.style.alignSelf = "stretch";
  }
  // 外枠の表示サイズを取得します。
  const rect = canvasShell.getBoundingClientRect();
  // 高解像度画面の倍率を取得します。
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  // Canvas内部幅を設定します。
  canvas.width = Math.round(rect.width * pixelRatio);
  // Canvas内部高さを設定します。
  canvas.height = Math.round(rect.height * pixelRatio);
  // CanvasのCSS幅を設定します。
  canvas.style.width = `${rect.width}px`;
  // CanvasのCSS高さを設定します。
  canvas.style.height = `${rect.height}px`;
  // コート全体が収まる倍率を計算します。
  const scale = Math.min(rect.width / size.width, rect.height / size.height);
  // 左右の余白を計算します。
  const offsetX = (rect.width - size.width * scale) / 2;
  // 上下の余白を計算します。
  const offsetY = (rect.height - size.height * scale) / 2;
  // 変換情報を保存します。
  viewport = { scale, offsetX, offsetY, cssWidth: rect.width, cssHeight: rect.height, pixelRatio };
  // 再描画します。
  render();
}

// 画面座標をコート座標へ変換します。
function pointerToCourt(event) {
  // Canvasの画面位置を取得します。
  const rect = canvas.getBoundingClientRect();
  // Canvas内のX座標を求めます。
  const localX = event.clientX - rect.left;
  // Canvas内のY座標を求めます。
  const localY = event.clientY - rect.top;
  // コート座標へ変換して返します。
  return {
    x: (localX - viewport.offsetX) / viewport.scale - COURT_OUTER_MARGIN,
    y: (localY - viewport.offsetY) / viewport.scale - COURT_OUTER_MARGIN
  };
}

// 座標をスローイン用外周を含む範囲内へ収めます。
function clampPoint(point, margin = 0) {
  // 現在のコートサイズを取得します。
  const size = getCourtSize();
  // 範囲内へ収めた座標を返します。
  return {
    x: Math.max(-COURT_OUTER_MARGIN + margin, Math.min(size.width + COURT_OUTER_MARGIN - margin, point.x)),
    y: Math.max(-COURT_OUTER_MARGIN + margin, Math.min(size.height + COURT_OUTER_MARGIN - margin, point.y))
  };
}

// Canvas全体を描画します。
function render() {
  // 描画倍率を取得します。
  const pixelRatio = viewport.pixelRatio || 1;
  // 変換を初期化します。
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  // Canvas全体を消去します。
  context.clearRect(0, 0, viewport.cssWidth, viewport.cssHeight);
  // 外側背景を描きます。
  context.fillStyle = "#e5e7eb";
  // 外側背景を塗ります。
  context.fillRect(0, 0, viewport.cssWidth, viewport.cssHeight);
  // コート座標系へ移動します。
  context.save();
  // コートの表示位置へ移動します。
  context.translate(viewport.offsetX, viewport.offsetY);
  // コート倍率を適用します。
  context.scale(viewport.scale, viewport.scale);
  // 外周余白の内側へ従来寸法のコート本体を配置します。
  context.translate(COURT_OUTER_MARGIN, COURT_OUTER_MARGIN);
  // コートを描画します。
  drawCourt(context);
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがある場合だけ中身を描きます。
  if (step) {
    // 保存済み戦術線を描きます。
    step.lines.forEach((line) => {
      // 移動線が非表示設定の場合は描画だけを省略します。
      if (line.type === "move" && !state.showMovementLines) {
        // 次の線へ進みます。
        return;
      }
      // 対象の戦術線を描きます。
      drawTacticLine(context, line);
    });
    // 描画途中の線を表示します。
    if (drawSession) {
      // 描画中の点列を使ってプレビュー線を作ります。
      const previewPoints = drawSession.points?.length >= 2 ? drawSession.points : [drawSession.start, drawSession.current];
      // プレビュー線を描画します。
      drawTacticLine(context, {
        // プレビュー用IDを設定します。
        id: "preview",
        // 選択中の線種を設定します。
        type: drawSession.type,
        // 開始点を設定します。
        start: previewPoints[0],
        // 終了点を設定します。
        end: previewPoints[previewPoints.length - 1],
        // 曲線点列を設定します。
        points: previewPoints,
        // 選択中の線色を指定します。
        color: state.activeLineColor,
        // プレビュー表示を指定します。
        preview: true
      });
    }
    // コーンを選手より先に描きます。
    step.cones.forEach((cone) => drawCone(context, cone));
    // 現在ドラッグまたは移動線作成で選択中の選手IDを取得します。
    const activeInteractionPlayerId = getActiveInteractionPlayerId();
    // 守備マーカーを先に描きます。
    step.players.filter((player) => player.side === "defense").forEach((player) => drawPlayer(context, getPlaybackPlayer(player, step.id), player.id === activeInteractionPlayerId));
    // 攻撃マーカーを後に描きます。
    step.players.filter((player) => player.side === "offense").forEach((player) => drawPlayer(context, getPlaybackPlayer(player, step.id), player.id === activeInteractionPlayerId));
    // ボールを描きます。
    drawBall(context, getPlaybackBall(step.ball, step.id));
    // コート上へ配置したテキストを最前面に描きます。
    step.texts.forEach((textItem) => drawCourtText(context, textItem));
  }
  // コート座標系を解除します。
  context.restore();
}

// 再生中の選手位置があれば表示用に合成します。
function getPlaybackPlayer(player, stepId) {
  // 再生中のSTEPと一致しない場合は元の選手を返します。
  if (!playbackVisual || playbackVisual.stepId !== stepId) {
    return player;
  }
  // 選手ごとの再生位置を取得します。
  const position = playbackVisual.players?.[player.id];
  // 再生位置がなければ元の選手を返します。
  if (!position) {
    return player;
  }
  // 元データへ再生位置だけを重ねて返します。
  return { ...player, ...position };
}

// 再生中のボール位置があれば表示用に合成します。
function getPlaybackBall(ball, stepId) {
  // 再生中のSTEPと一致しない場合は元のボールを返します。
  if (!playbackVisual || playbackVisual.stepId !== stepId || !playbackVisual.ball) {
    return ball;
  }
  // 元データへ再生位置だけを重ねて返します。
  return { ...ball, ...playbackVisual.ball };
}

// コートを描きます。
function drawCourt(ctx) {
  // 現在のコートサイズを取得します。
  const size = getCourtSize();
  // 木目色で背景を塗ります。
  ctx.fillStyle = "#d7a760";
  // コート全面を塗ります。
  ctx.fillRect(0, 0, size.width, size.height);
  // 木目の板目を描きます。
  drawWoodPattern(ctx, size);
  // コートラインの基本設定を行います。
  ctx.strokeStyle = "#f8fafc";
  // コートラインの太さを設定します。
  ctx.lineWidth = 4;
  // 線端を自然につなぎます。
  ctx.lineJoin = "round";
  // 外周線を少し内側へ描きます。
  ctx.strokeRect(3, 3, size.width - 6, size.height - 6);
  // 半面と全面を描き分けます。
  if (state.courtMode === "half") {
    // FIBA半面コートを描きます。
    drawHalfCourtFiba(ctx, size);
  } else {
    // FIBA全面コートを描きます。
    drawFullCourtFiba(ctx, size);
  }
}

// 木目の板目を控えめに描きます。
function drawWoodPattern(ctx, size) {
  // 木目線の色を設定します。
  ctx.strokeStyle = "rgba(91, 59, 25, 0.12)";
  // 木目線の太さを設定します。
  ctx.lineWidth = 1;
  // コート方向に合わせた板目間隔を設定します。
  const spacing = state.courtMode === "half" ? size.width / 15 : size.height / 15;
  // 半面では縦板、全面では横板として描きます。
  if (state.courtMode === "half") {
    // 横方向へ板目を繰り返します。
    for (let x = 0; x <= size.width; x += spacing) {
      // 新しい線を開始します。
      ctx.beginPath();
      // 上端へ移動します。
      ctx.moveTo(x, 0);
      // 下端へ線を伸ばします。
      ctx.lineTo(x, size.height);
      // 板目を描画します。
      ctx.stroke();
    }
  } else {
    // 縦方向へ板目を繰り返します。
    for (let y = 0; y <= size.height; y += spacing) {
      // 新しい線を開始します。
      ctx.beginPath();
      // 左端へ移動します。
      ctx.moveTo(0, y);
      // 右端へ線を伸ばします。
      ctx.lineTo(size.width, y);
      // 板目を描画します。
      ctx.stroke();
    }
  }
}

// FIBAの15m×14m比率を保った半面コートを描きます。
function drawHalfCourtFiba(ctx, size) {
  // コート幅15mを画面幅いっぱいへ変換するX倍率を計算します。
  const unitX = size.width / 15;
  // 半面の奥行14mを画面高さへ変換するY倍率を計算します。
  const unitY = size.height / 14;
  // リングなど丸さを保ちたい小物用に小さい倍率を選びます。
  const symbolUnit = Math.min(unitX, unitY);
  // コート中央Xを計算します。
  const centerX = size.width / 2;
  // リング中心のY位置を計算します。
  const hoopY = 1.575 * unitY;
  // バックボードのY位置を計算します。
  const boardY = 1.2 * unitY;
  // フリースローラインのY位置を計算します。
  const freeThrowY = 5.8 * unitY;
  // ペイントエリア幅を計算します。
  const keyWidth = 4.9 * unitX;
  // フリースロー円のX半径を計算します。
  const freeThrowRadiusX = 1.8 * unitX;
  // フリースロー円のY半径を計算します。
  const freeThrowRadiusY = 1.8 * unitY;
  // 3ポイント円弧のX半径を計算します。
  const threeRadiusX = 6.75 * unitX;
  // 3ポイント円弧のY半径を計算します。
  const threeRadiusY = 6.75 * unitY;
  // 左コーナーラインのX位置を計算します。
  const leftCornerX = 0.9 * unitX;
  // 右コーナーラインのX位置を計算します。
  const rightCornerX = size.width - 0.9 * unitX;
  // 物理寸法上の横方向距離を計算します。
  const cornerDistanceMeters = 7.5 - 0.9;
  // 3ポイント直線と円弧が接続する物理Y位置を計算します。
  const cornerJoinMeters = 1.575 + Math.sqrt(Math.max(0, 6.75 ** 2 - cornerDistanceMeters ** 2));
  // 接続点を画面Y座標へ変換します。
  const cornerJoinY = cornerJoinMeters * unitY;
  // 接続角度を物理寸法上で計算します。
  const cornerAngle = Math.atan2(cornerJoinMeters - 1.575, cornerDistanceMeters);
  // ペイントエリアを描きます。
  ctx.strokeRect(centerX - keyWidth / 2, 0, keyWidth, freeThrowY);
  // バックボードを描きます。
  ctx.beginPath();
  // バックボード左端へ移動します。
  ctx.moveTo(centerX - 0.9 * unitX, boardY);
  // バックボード右端へ線を伸ばします。
  ctx.lineTo(centerX + 0.9 * unitX, boardY);
  // バックボードを描画します。
  ctx.stroke();
  // リングを丸い記号として描きます。
  drawHoop(ctx, centerX, hoopY, symbolUnit);
  // ノーチャージセミサークルを横長表示に合わせた半楕円で描きます。
  ctx.beginPath();
  // リングからコート側へ半楕円を描きます。
  ctx.ellipse(centerX, hoopY, 1.25 * unitX, 1.25 * unitY, 0, 0, Math.PI);
  // 半楕円を描画します。
  ctx.stroke();
  // フリースロー円のコート側を実線で描きます。
  ctx.beginPath();
  // 下側の半楕円を描きます。
  ctx.ellipse(centerX, freeThrowY, freeThrowRadiusX, freeThrowRadiusY, 0, 0, Math.PI);
  // 半楕円を描画します。
  ctx.stroke();
  // フリースロー円のゴール側を破線で描きます。
  ctx.save();
  // 破線パターンを設定します。
  ctx.setLineDash([12, 10]);
  // 破線円弧を開始します。
  ctx.beginPath();
  // 上側の半楕円を描きます。
  ctx.ellipse(centerX, freeThrowY, freeThrowRadiusX, freeThrowRadiusY, 0, Math.PI, Math.PI * 2);
  // 破線円弧を描画します。
  ctx.stroke();
  // 線設定を戻します。
  ctx.restore();
  // 左右のコーナー3ポイント直線を描きます。
  ctx.beginPath();
  // 左ベースライン上へ移動します。
  ctx.moveTo(leftCornerX, 0);
  // 左接続点へ線を伸ばします。
  ctx.lineTo(leftCornerX, cornerJoinY);
  // 右ベースライン上へ移動します。
  ctx.moveTo(rightCornerX, 0);
  // 右接続点へ線を伸ばします。
  ctx.lineTo(rightCornerX, cornerJoinY);
  // コーナー直線を描画します。
  ctx.stroke();
  // 3ポイント円弧を開始します。
  ctx.beginPath();
  // 右接続点から左接続点までコート内側の楕円弧を描きます。
  ctx.ellipse(centerX, hoopY, threeRadiusX, threeRadiusY, 0, cornerAngle, Math.PI - cornerAngle);
  // 3ポイント円弧を描画します。
  ctx.stroke();
  // ハーフラインを描きます。
  ctx.beginPath();
  // 左端へ移動します。
  ctx.moveTo(0, size.height - 3);
  // 右端へ線を伸ばします。
  ctx.lineTo(size.width, size.height - 3);
  // ハーフラインを描画します。
  ctx.stroke();
  // センターサークルの半円を横長表示に合わせて描きます。
  ctx.beginPath();
  // コート内側の上半楕円を描きます。
  ctx.ellipse(centerX, size.height, 1.8 * unitX, 1.8 * unitY, 0, Math.PI, Math.PI * 2);
  // 半楕円を描画します。
  ctx.stroke();
  // レーンマークを描きます。
  drawHalfLaneMarks(ctx, centerX, keyWidth, unitX, unitY);
}

// 半面コートのレーンマークを描きます。
function drawHalfLaneMarks(ctx, centerX, keyWidth, unitX, unitY) {
  // レーンマークのY位置をメートルで定義します。
  const marks = [1.75, 2.65, 3.65, 4.65];
  // 左右のペイント境界Xを計算します。
  const leftX = centerX - keyWidth / 2;
  // 右側の境界Xを計算します。
  const rightX = centerX + keyWidth / 2;
  // 各位置へ短いマークを描きます。
  marks.forEach((meter) => {
    // Y位置を計算します。
    const y = meter * unitY;
    // 線を開始します。
    ctx.beginPath();
    // 左境界から外側へ描きます。
    ctx.moveTo(leftX, y);
    // 左側の短線を伸ばします。
    ctx.lineTo(leftX - 0.18 * unitX, y);
    // 右境界へ移動します。
    ctx.moveTo(rightX, y);
    // 右側の短線を伸ばします。
    ctx.lineTo(rightX + 0.18 * unitX, y);
    // レーンマークを描画します。
    ctx.stroke();
  });
}

// FIBA寸法比で全面コートを描きます。
function drawFullCourtFiba(ctx, size) {
  // 1mあたりの論理ピクセル数を計算します。
  const unit = size.width / 28;
  // コート中央Yを計算します。
  const centerY = size.height / 2;
  // センターラインを描きます。
  ctx.beginPath();
  // 上端へ移動します。
  ctx.moveTo(size.width / 2, 0);
  // 下端へ線を伸ばします。
  ctx.lineTo(size.width / 2, size.height);
  // センターラインを描画します。
  ctx.stroke();
  // センターサークルを描きます。
  ctx.beginPath();
  // 中央へ円を描きます。
  ctx.arc(size.width / 2, centerY, 1.8 * unit, 0, Math.PI * 2);
  // 円を描画します。
  ctx.stroke();
  // 左側のゴール周辺を描きます。
  drawFullBasketEnd(ctx, "left", size, unit);
  // 右側のゴール周辺を描きます。
  drawFullBasketEnd(ctx, "right", size, unit);
}

// 全面コートの片側ゴール周辺を描きます。
function drawFullBasketEnd(ctx, side, size, unit) {
  // 左側かどうかを判定します。
  const isLeft = side === "left";
  // コート中央Yを計算します。
  const centerY = size.height / 2;
  // リング中心Xを計算します。
  const hoopX = isLeft ? 1.575 * unit : size.width - 1.575 * unit;
  // バックボードXを計算します。
  const boardX = isLeft ? 1.2 * unit : size.width - 1.2 * unit;
  // フリースローラインXを計算します。
  const freeThrowX = isLeft ? 5.8 * unit : size.width - 5.8 * unit;
  // ペイントエリア幅を計算します。
  const keyWidth = 4.9 * unit;
  // ペイントエリアの開始Xを計算します。
  const keyX = isLeft ? 0 : freeThrowX;
  // ペイントエリア長さを計算します。
  const keyLength = 5.8 * unit;
  // ペイントエリアを描きます。
  ctx.strokeRect(keyX, centerY - keyWidth / 2, keyLength, keyWidth);
  // バックボードを描きます。
  ctx.beginPath();
  // 上端へ移動します。
  ctx.moveTo(boardX, centerY - 0.9 * unit);
  // 下端へ線を伸ばします。
  ctx.lineTo(boardX, centerY + 0.9 * unit);
  // バックボードを描画します。
  ctx.stroke();
  // リングを描きます。
  drawHoop(ctx, hoopX, centerY, unit);
  // ノーチャージセミサークルを描きます。
  ctx.beginPath();
  // コート中央側へ半円を描きます。
  if (isLeft) {
    // 左ゴールは右向きの半円を描きます。
    ctx.arc(hoopX, centerY, 1.25 * unit, -Math.PI / 2, Math.PI / 2);
  } else {
    // 右ゴールは左向きの半円を描きます。
    ctx.arc(hoopX, centerY, 1.25 * unit, Math.PI / 2, Math.PI * 1.5);
  }
  // 半円を描画します。
  ctx.stroke();
  // フリースロー円を描きます。
  drawFullFreeThrowCircle(ctx, freeThrowX, centerY, 1.8 * unit, isLeft);
  // 3ポイントラインを描きます。
  drawFullThreePoint(ctx, hoopX, centerY, isLeft, size, unit);
  // レーンマークを描きます。
  drawFullLaneMarks(ctx, isLeft, centerY, keyWidth, unit, size);
}

// 全面コートのフリースロー円を実線と破線で描き分けます。
function drawFullFreeThrowCircle(ctx, x, y, radius, isLeft) {
  // コート中央側の半円を実線で描きます。
  ctx.beginPath();
  // 左ゴールは右半円、右ゴールは左半円を描きます。
  ctx.arc(x, y, radius, isLeft ? -Math.PI / 2 : Math.PI / 2, isLeft ? Math.PI / 2 : Math.PI * 1.5);
  // 実線半円を描画します。
  ctx.stroke();
  // ゴール側の半円を破線で描きます。
  ctx.save();
  // 破線パターンを設定します。
  ctx.setLineDash([10, 8]);
  // 破線半円を開始します。
  ctx.beginPath();
  // 反対側の半円を描きます。
  ctx.arc(x, y, radius, isLeft ? Math.PI / 2 : -Math.PI / 2, isLeft ? Math.PI * 1.5 : Math.PI / 2);
  // 破線半円を描画します。
  ctx.stroke();
  // 線設定を戻します。
  ctx.restore();
}

// 全面コートの3ポイントラインを描きます。
function drawFullThreePoint(ctx, hoopX, centerY, isLeft, size, unit) {
  // 3ポイント半径を計算します。
  const radius = 6.75 * unit;
  // 上側コーナーラインのY位置を計算します。
  const topY = 0.9 * unit;
  // 下側コーナーラインのY位置を計算します。
  const bottomY = size.height - 0.9 * unit;
  // 円弧との接続距離を計算します。
  const joinOffset = Math.sqrt(Math.max(0, radius ** 2 - (centerY - topY) ** 2));
  // 円弧接続Xを計算します。
  const joinX = isLeft ? hoopX + joinOffset : hoopX - joinOffset;
  // 上下のコーナー直線を描きます。
  ctx.beginPath();
  // 上側ベースラインから開始します。
  ctx.moveTo(isLeft ? 0 : size.width, topY);
  // 上側接続点へ線を伸ばします。
  ctx.lineTo(joinX, topY);
  // 下側ベースラインへ移動します。
  ctx.moveTo(isLeft ? 0 : size.width, bottomY);
  // 下側接続点へ線を伸ばします。
  ctx.lineTo(joinX, bottomY);
  // コーナー直線を描画します。
  ctx.stroke();
  // 接続点の角度を計算します。
  const topAngle = Math.atan2(topY - centerY, joinX - hoopX);
  // 下側接続点の角度を計算します。
  const bottomAngle = Math.atan2(bottomY - centerY, joinX - hoopX);
  // 円弧を開始します。
  ctx.beginPath();
  // 左右に応じてコート中央側の円弧を描きます。
  if (isLeft) {
    // 左側は右向きの円弧を描きます。
    ctx.arc(hoopX, centerY, radius, topAngle, bottomAngle);
  } else {
    // 右側は左向きの円弧を反時計回りで描きます。
    ctx.arc(hoopX, centerY, radius, topAngle, bottomAngle, true);
  }
  // 円弧を描画します。
  ctx.stroke();
}

// 全面コートのレーンマークを描きます。
function drawFullLaneMarks(ctx, isLeft, centerY, keyWidth, unit, size) {
  // ベースラインからのレーンマーク位置を定義します。
  const marks = [1.75, 2.65, 3.65, 4.65];
  // 上側のペイント境界Yを計算します。
  const topY = centerY - keyWidth / 2;
  // 下側のペイント境界Yを計算します。
  const bottomY = centerY + keyWidth / 2;
  // 各位置へ短いマークを描きます。
  marks.forEach((meter) => {
    // 左右方向を考慮してX位置を計算します。
    const x = isLeft ? meter * unit : size.width - meter * unit;
    // 線を開始します。
    ctx.beginPath();
    // 上境界から外側へ描きます。
    ctx.moveTo(x, topY);
    // 上側短線を伸ばします。
    ctx.lineTo(x, topY - 0.18 * unit);
    // 下境界へ移動します。
    ctx.moveTo(x, bottomY);
    // 下側短線を伸ばします。
    ctx.lineTo(x, bottomY + 0.18 * unit);
    // レーンマークを描画します。
    ctx.stroke();
  });
}

// リングを見やすく描きます。
function drawHoop(ctx, x, y, unit) {
  // リングの描画状態を保存します。
  ctx.save();
  // リングをオレンジ色にします。
  ctx.strokeStyle = "#ea580c";
  // リング線を少し太くします。
  ctx.lineWidth = 5;
  // リング円を開始します。
  ctx.beginPath();
  // 実寸に近い直径0.45mの円を描きます。
  ctx.arc(x, y, 0.225 * unit, 0, Math.PI * 2);
  // リングを描画します。
  ctx.stroke();
  // 描画状態を戻します。
  ctx.restore();
}

// 練習用コーンを描きます。
function drawCone(ctx, cone) {
  // 描画状態を保存します。
  ctx.save();
  // コーン色を赤または青から選びます。
  const fillColor = cone.color === "blue" ? "#2563eb" : "#dc2626";
  // コーン枠色を濃く設定します。
  const strokeColor = cone.color === "blue" ? "#1e3a8a" : "#7f1d1d";
  // コーン本体の三角形を開始します。
  ctx.beginPath();
  // 上端へ移動します。
  ctx.moveTo(cone.x, cone.y - CONE_HEIGHT / 2);
  // 右下へ線を引きます。
  ctx.lineTo(cone.x + CONE_WIDTH / 2, cone.y + CONE_HEIGHT / 2 - 7);
  // 左下へ線を引きます。
  ctx.lineTo(cone.x - CONE_WIDTH / 2, cone.y + CONE_HEIGHT / 2 - 7);
  // 三角形を閉じます。
  ctx.closePath();
  // 本体色を設定します。
  ctx.fillStyle = fillColor;
  // 本体を塗ります。
  ctx.fill();
  // 枠色を設定します。
  ctx.strokeStyle = strokeColor;
  // 枠線の太さを設定します。
  ctx.lineWidth = 3;
  // 枠を描きます。
  ctx.stroke();
  // コーン中央の白帯を描きます。
  ctx.beginPath();
  // 白帯の左上へ移動します。
  ctx.moveTo(cone.x - CONE_WIDTH * 0.22, cone.y + 2);
  // 白帯の右上へ進みます。
  ctx.lineTo(cone.x + CONE_WIDTH * 0.22, cone.y + 2);
  // 白帯の右下へ進みます。
  ctx.lineTo(cone.x + CONE_WIDTH * 0.31, cone.y + 9);
  // 白帯の左下へ進みます。
  ctx.lineTo(cone.x - CONE_WIDTH * 0.31, cone.y + 9);
  // 白帯を閉じます。
  ctx.closePath();
  // 白帯を半透明の白にします。
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  // 白帯を塗ります。
  ctx.fill();
  // コーン台座を描きます。
  ctx.fillStyle = fillColor;
  // 台座の角丸長方形を描きます。
  ctx.fillRect(cone.x - CONE_WIDTH * 0.65, cone.y + CONE_HEIGHT / 2 - 8, CONE_WIDTH * 1.3, 9);
  // 台座枠を描きます。
  ctx.strokeRect(cone.x - CONE_WIDTH * 0.65, cone.y + CONE_HEIGHT / 2 - 8, CONE_WIDTH * 1.3, 9);
  // 描画状態を戻します。
  ctx.restore();
}

// ドラッグ中または移動線を描いている選手IDを返します。
function getActiveInteractionPlayerId() {
  // 選択ツールで選手をドラッグしている場合は対象選手IDを返します。
  if (dragSession?.target?.type === "player") {
    // ドラッグ対象の選手IDを返します。
    return dragSession.target.id;
  }
  // 移動・ドリブル・スクリーン線を選手から描いている場合は対象選手IDを返します。
  if (drawSession?.playerId && isMovementLineType(drawSession.type)) {
    // 描画開始選手のIDを返します。
    return drawSession.playerId;
  }
  // 選手が選択されていない場合はnullを返します。
  return null;
}

// 選手マーカーを描きます。
function drawPlayer(ctx, player, isActive = false) {
  // 攻撃側かどうかを判定します。
  const isOffense = player.side === "offense";
  // 現在選択中の選手表示設定を取得します。
  const playerStyle = getPlayerStyle();
  // 選択中は攻撃側を少し明るい青、守備側を薄い赤へ変更します。
  ctx.fillStyle = isActive ? (isOffense ? "#60a5fa" : "#fee2e2") : (isOffense ? "#1d4ed8" : "#ffffff");
  // 選択中は枠色も少し明るくして対象を見分けやすくします。
  ctx.strokeStyle = isActive ? (isOffense ? "#1e40af" : "#ef4444") : (isOffense ? "#172554" : "#b91c1c");
  // 選手サイズに対応するマーカー枠の太さを設定します。
  ctx.lineWidth = playerStyle.lineWidth;
  // マーカー円を開始します。
  ctx.beginPath();
  // 選手位置に選択中サイズの円を描きます。
  ctx.arc(player.x, player.y, playerStyle.radius, 0, Math.PI * 2);
  // 円を塗ります。
  ctx.fill();
  // 円の枠を描きます。
  ctx.stroke();
  // 文字色を設定します。
  ctx.fillStyle = isOffense ? "#ffffff" : "#b91c1c";
  // 文字配置を中央にします。
  ctx.textAlign = "center";
  // 文字の縦位置を中央にします。
  ctx.textBaseline = "middle";
  // 選手サイズに対応する文字サイズを設定します。
  ctx.font = `800 ${playerStyle.fontSize}px sans-serif`;
  // 守備側にはXを付けて表示します。
  const markerText = isOffense ? player.label : `×${player.label}`;
  // 選手番号を描きます。
  ctx.fillText(markerText, player.x, player.y + 1);
}

// ボールを描きます。
function drawBall(ctx, ball) {
  // ボール以外の描画設定へ影響しないように現在状態を保存します。
  ctx.save();
  // 左上に明るさを置いたグラデーションでボールの丸みを表現します。
  const ballFill = ctx.createRadialGradient(
    ball.x - BALL_RADIUS * 0.36,
    ball.y - BALL_RADIUS * 0.42,
    BALL_RADIUS * 0.08,
    ball.x,
    ball.y,
    BALL_RADIUS * 1.08
  );
  ballFill.addColorStop(0, "#fdba74");
  ballFill.addColorStop(0.48, "#f97316");
  ballFill.addColorStop(1, "#c2410c");
  // ボールの塗り色を設定します。
  ctx.fillStyle = ballFill;
  // ボールの枠色を設定します。
  ctx.strokeStyle = "#431407";
  // ボールの枠を設定します。
  ctx.lineWidth = 2.6;
  // ボール円を開始します。
  ctx.beginPath();
  // ボール位置に円を描きます。
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  // ボールを塗ります。
  ctx.fill();
  // ボール枠を描きます。
  ctx.stroke();
  // 縫い目をボールの内側だけへ収めます。
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS - 1.2, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "#57210f";
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  // 中央の縦の縫い目を描きます。
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
  ctx.lineTo(ball.x, ball.y + BALL_RADIUS);
  ctx.stroke();
  // 中央の横の縫い目を描きます。
  ctx.beginPath();
  ctx.moveTo(ball.x - BALL_RADIUS, ball.y);
  ctx.lineTo(ball.x + BALL_RADIUS, ball.y);
  ctx.stroke();
  // 左右の曲線でバスケットボール特有のパネル形状を描きます。
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
  ctx.bezierCurveTo(
    ball.x - BALL_RADIUS * 0.78,
    ball.y - BALL_RADIUS * 0.62,
    ball.x - BALL_RADIUS * 0.78,
    ball.y + BALL_RADIUS * 0.62,
    ball.x,
    ball.y + BALL_RADIUS
  );
  ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
  ctx.bezierCurveTo(
    ball.x + BALL_RADIUS * 0.78,
    ball.y - BALL_RADIUS * 0.62,
    ball.x + BALL_RADIUS * 0.78,
    ball.y + BALL_RADIUS * 0.62,
    ball.x,
    ball.y + BALL_RADIUS
  );
  ctx.stroke();
  ctx.restore();
  // 描画前の設定へ戻します。
  ctx.restore();
}

// テキストの概算幅をコート座標で計算します。
function estimateTextWidth(value, fontSize) {
  // 文字列をUnicode文字単位の配列へ変換します。
  const characters = Array.from(String(value ?? ""));
  // 半角文字と全角文字の幅を分けて合計します。
  return characters.reduce((total, character) => total + (/^[\x00-\xff]$/.test(character) ? fontSize * 0.62 : fontSize), 0);
}

// 配置テキストの当たり判定領域を返します。
function getTextBounds(textItem) {
  // テキストの文字サイズを取得します。
  const fontSize = Number(textItem.fontSize ?? TEXT_FONT_SIZE);
  // 左右の余白を含む幅を計算します。
  const width = Math.max(fontSize, estimateTextWidth(textItem.text, fontSize)) + 18;
  // 上下の余白を含む高さを計算します。
  const height = fontSize * 1.35;
  // 中央座標から矩形範囲を返します。
  return { left: textItem.x - width / 2, right: textItem.x + width / 2, top: textItem.y - height / 2, bottom: textItem.y + height / 2, width, height };
}

// テキスト位置をコート内へ収めます。
function clampTextPosition(textItem, point) {
  // 現在のコートサイズを取得します。
  const size = getCourtSize();
  // テキストの大きさを取得します。
  const bounds = getTextBounds({ ...textItem, x: 0, y: 0 });
  // テキスト全体がコート内へ収まる位置を返します。
  return { x: Math.max(bounds.width / 2, Math.min(size.width - bounds.width / 2, point.x)), y: Math.max(bounds.height / 2, Math.min(size.height - bounds.height / 2, point.y)) };
}

// コート上へ自由配置したテキストを描きます。
function drawCourtText(ctx, textItem) {
  // 描画状態を保存します。
  ctx.save();
  // 文字サイズを取得します。
  const fontSize = Number(textItem.fontSize ?? TEXT_FONT_SIZE);
  // 太字の日本語対応フォントを設定します。
  ctx.font = `800 ${fontSize}px "Noto Sans JP", "Yu Gothic", sans-serif`;
  // 文字を中央基準で配置します。
  ctx.textAlign = "center";
  // 文字を縦方向も中央基準で配置します。
  ctx.textBaseline = "middle";
  // 木目上でも読める白い縁取りを設定します。
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  // 縁取りを見やすい太さにします。
  ctx.lineWidth = Math.max(5, fontSize * 0.22);
  // 角を滑らかにつなぎます。
  ctx.lineJoin = "round";
  // テキストの白い縁取りを描きます。
  ctx.strokeText(String(textItem.text ?? ""), textItem.x, textItem.y);
  // 選択した線色と同じ文字色を設定します。
  ctx.fillStyle = LINE_COLORS[textItem.color] ?? LINE_COLORS.black;
  // テキスト本体を描きます。
  ctx.fillText(String(textItem.text ?? ""), textItem.x, textItem.y);
  // 描画状態を戻します。
  ctx.restore();
}

// 戦術線を種類別に描きます。
function drawTacticLine(ctx, line) {
  // 開始点と終了点がない場合は終了します。
  if (!line.start || !line.end) {
    return;
  }
  // 曲線点列があれば利用し、なければ開始点と終了点を利用します。
  const points = line.points?.length >= 2 ? line.points : [line.start, line.end];
  // 描画状態を保存します。
  ctx.save();
  // プレビュー中は薄くします。
  ctx.globalAlpha = line.preview ? 0.62 : 1;
  // 保存された色名から実際の色を取得します。
  const lineColor = LINE_COLORS[line.color] ?? LINE_COLORS.black;
  // 戦術線の色を設定します。
  ctx.strokeStyle = lineColor;
  // 戦術線の塗り色を設定します。
  ctx.fillStyle = lineColor;
  // 戦術線の太さを設定します。
  ctx.lineWidth = line.type === "free" ? 5 : 7;
  // 線端を丸くします。
  ctx.lineCap = "round";
  // 線のつなぎ目を丸くします。
  ctx.lineJoin = "round";
  // 自由線の場合は矢印なしの曲線を描きます。
  if (line.type === "free") {
    // フリーハンド線を描きます。
    drawSmoothPath(ctx, points);
    // 描画状態を復元します。
    ctx.restore();
    // 処理を終了します。
    return;
  }
  // パス線の場合は点線を設定します。
  if (line.type === "pass") {
    // 点線パターンを設定します。
    ctx.setLineDash([18, 14]);
  }
  // ドリブル線の場合は自由曲線または直線の点列に沿って波線を描きます。
  if (isDribbleLineType(line.type)) {
    // 波線矢印を描きます。
    drawWavyPathArrow(ctx, points);
    // 描画状態を復元します。
    ctx.restore();
    // 処理を終了します。
    return;
  }
  // スクリーン線の場合は移動軌道の終点にT字記号を描きます。
  if (isScreenLineType(line.type)) {
    // 曲線または直線のスクリーン移動を描きます。
    drawScreenPath(ctx, points);
    // 描画状態を復元します。
    ctx.restore();
    // 処理を終了します。
    return;
  }
  // 移動線の場合は指で描いた軌道に矢印を付けます。
  if (line.type === "move") {
    // 曲線矢印を描きます。
    drawPathArrow(ctx, points);
    // 描画状態を復元します。
    ctx.restore();
    // 処理を終了します。
    return;
  }
  // パス線は直線矢印として描きます。
  drawArrow(ctx, line.start, line.end);
  // 描画状態を復元します。
  ctx.restore();
}

// 点列をなめらかな線として描きます。
function drawSmoothPath(ctx, points) {
  // 点が2つ未満なら描画しません。
  if (!points || points.length < 2) {
    return;
  }
  // パスを開始します。
  ctx.beginPath();
  // 最初の点へ移動します。
  ctx.moveTo(points[0].x, points[0].y);
  // 2点だけの場合は直線を描きます。
  if (points.length === 2) {
    // 終点へ線を伸ばします。
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // 中間点を使って二次曲線を連続させます。
    for (let index = 1; index < points.length - 1; index += 1) {
      // 現在点を取得します。
      const current = points[index];
      // 次の点を取得します。
      const next = points[index + 1];
      // 2点の中間Xを計算します。
      const midX = (current.x + next.x) / 2;
      // 2点の中間Yを計算します。
      const midY = (current.y + next.y) / 2;
      // 現在点を制御点として中間点まで曲線を描きます。
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    // 最後の点へ曲線をつなぎます。
    const beforeLast = points[points.length - 2];
    // 最終点を取得します。
    const last = points[points.length - 1];
    // 最終点まで曲線を描きます。
    ctx.quadraticCurveTo(beforeLast.x, beforeLast.y, last.x, last.y);
  }
  // パスを描画します。
  ctx.stroke();
}

// 点列に沿った矢印を描きます。
function drawPathArrow(ctx, points) {
  // 曲線本体を描きます。
  drawSmoothPath(ctx, points);
  // 最後の点を取得します。
  const end = points[points.length - 1];
  // 最後から2番目の点を取得します。
  const previous = points[Math.max(0, points.length - 2)];
  // 終端方向を計算します。
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  // 矢印頭を描きます。
  drawArrowHead(ctx, end, angle);
}

// 点列に沿った波線矢印を描きます。
function drawWavyPathArrow(ctx, points) {
  // 点列を等間隔へ再サンプリングします。
  const samples = resamplePath(points, 7);
  // サンプルが少ない場合は通常矢印へ切り替えます。
  if (samples.length < 2) {
    drawPathArrow(ctx, points);
    return;
  }
  // 波線を開始します。
  ctx.beginPath();
  // 最初の点へ移動します。
  ctx.moveTo(samples[0].x, samples[0].y);
  // 各サンプル点へ波のずれを加えます。
  samples.forEach((sample, index) => {
    // 最初の点はすでに移動済みなので飛ばします。
    if (index === 0) {
      return;
    }
    // 前の点を取得します。
    const previous = samples[index - 1];
    // 次の点を取得します。
    const next = samples[Math.min(samples.length - 1, index + 1)];
    // 接線Xを計算します。
    const dx = next.x - previous.x;
    // 接線Yを計算します。
    const dy = next.y - previous.y;
    // 接線長を計算します。
    const length = Math.max(1, Math.hypot(dx, dy));
    // 法線Xを計算します。
    const normalX = -dy / length;
    // 法線Yを計算します。
    const normalY = dx / length;
    // 波のずれ量を計算します。
    const offset = Math.sin(index * 0.9) * 10;
    // 波を加えたX座標を計算します。
    const x = sample.x + normalX * offset;
    // 波を加えたY座標を計算します。
    const y = sample.y + normalY * offset;
    // 波線を次の点へ伸ばします。
    ctx.lineTo(x, y);
  });
  // 波線を描画します。
  ctx.stroke();
  // 最終点を取得します。
  const end = points[points.length - 1];
  // 最後から2番目の点を取得します。
  const previous = points[Math.max(0, points.length - 2)];
  // 終端角度を計算します。
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  // 矢印頭を描きます。
  drawArrowHead(ctx, end, angle);
}

// 点列を一定間隔へ再サンプリングします。
function resamplePath(points, spacing) {
  // 点列が不足している場合はそのまま返します。
  if (!points || points.length < 2) {
    return points ?? [];
  }
  // 結果配列を最初の点で開始します。
  const result = [{ ...points[0] }];
  // 前回追加した点を保持します。
  let previous = { ...points[0] };
  // 元の点列を順番に処理します。
  for (let index = 1; index < points.length; index += 1) {
    // 現在の目標点を取得します。
    const target = points[index];
    // 区間距離を計算します。
    let segmentLength = distance(previous, target);
    // 区間が間隔より長い間は補間点を追加します。
    while (segmentLength >= spacing) {
      // 間隔分の補間率を計算します。
      const ratio = spacing / segmentLength;
      // 次のX座標を計算します。
      const x = previous.x + (target.x - previous.x) * ratio;
      // 次のY座標を計算します。
      const y = previous.y + (target.y - previous.y) * ratio;
      // 補間点を作ります。
      previous = { x, y };
      // 補間点を結果へ追加します。
      result.push(previous);
      // 残り距離を再計算します。
      segmentLength = distance(previous, target);
    }
    // 区間終端を次の基準点にします。
    previous = { ...target };
  }
  // 最終点が未追加なら追加します。
  if (distance(result[result.length - 1], points[points.length - 1]) > 1) {
    result.push({ ...points[points.length - 1] });
  }
  // 再サンプリング結果を返します。
  return result;
}

// 矢印頭だけを描きます。
function drawArrowHead(ctx, end, angle) {
  // 点線設定を解除します。
  ctx.setLineDash([]);
  // 矢印頭の長さを定義します。
  const headLength = 24;
  // 矢印頭を開始します。
  ctx.beginPath();
  // 矢印先端へ移動します。
  ctx.moveTo(end.x, end.y);
  // 矢印頭の片側へ進みます。
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  // 矢印頭の反対側へ進みます。
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  // 図形を閉じます。
  ctx.closePath();
  // 矢印頭を塗ります。
  ctx.fill();
}

// 直線矢印を描きます。
function drawArrow(ctx, start, end) {
  // 線の方向Xを計算します。
  const dx = end.x - start.x;
  // 線の方向Yを計算します。
  const dy = end.y - start.y;
  // 線の角度を計算します。
  const angle = Math.atan2(dy, dx);
  // 線本体を開始します。
  ctx.beginPath();
  // 開始点へ移動します。
  ctx.moveTo(start.x, start.y);
  // 終了点へ進みます。
  ctx.lineTo(end.x, end.y);
  // 線を描画します。
  ctx.stroke();
  // 矢印頭を描きます。
  drawArrowHead(ctx, end, angle);
}

// 曲線または直線のスクリーン移動を描き、終点にスクリーン記号を付けます。
function drawScreenPath(ctx, points) {
  // 点列が不足している場合は描画しません。
  if (!points || points.length < 2) {
    return;
  }
  // 移動軌道本体を滑らかに描きます。
  drawSmoothPath(ctx, points);
  // 終点を取得します。
  const end = points[points.length - 1];
  // 終点直前の点を取得します。
  const previous = points[Math.max(0, points.length - 2)];
  // 終端方向を計算します。
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  // 終端の横棒半分の長さを定義します。
  const cap = 24;
  // 横棒を開始します。
  ctx.beginPath();
  // 横棒の片側へ移動します。
  ctx.moveTo(end.x + Math.cos(angle + Math.PI / 2) * cap, end.y + Math.sin(angle + Math.PI / 2) * cap);
  // 横棒の反対側へ進みます。
  ctx.lineTo(end.x + Math.cos(angle - Math.PI / 2) * cap, end.y + Math.sin(angle - Math.PI / 2) * cap);
  // 横棒を描画します。
  ctx.stroke();
}

// 点と点の距離を返します。
function distance(a, b) {
  // ユークリッド距離を計算して返します。
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 点と線分の最短距離を返します。
function pointToSegmentDistance(point, start, end) {
  // 線分X方向の差を計算します。
  const dx = end.x - start.x;
  // 線分Y方向の差を計算します。
  const dy = end.y - start.y;
  // 線分長さの二乗を計算します。
  const lengthSquared = dx * dx + dy * dy;
  // 線分が点の場合は開始点との距離を返します。
  if (lengthSquared === 0) {
    return distance(point, start);
  }
  // 点を線分へ射影した比率を計算します。
  const rawT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  // 射影比率を0から1へ収めます。
  const t = Math.max(0, Math.min(1, rawT));
  // 射影点を計算します。
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  // 射影点までの距離を返します。
  return distance(point, projection);
}

// 指定位置にあるコーンを探します。
function findConeAt(point) {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがない場合は対象なしで返します。
  if (!step) {
    // 対象なしを返します。
    return null;
  }
  // 最後に追加したコーンから逆順で確認します。
  return [...(step.cones ?? [])].reverse().find((cone) => Math.abs(point.x - cone.x) <= CONE_WIDTH * 0.75 && Math.abs(point.y - cone.y) <= CONE_HEIGHT * 0.65) ?? null;
}

// 指定位置のドラッグ対象を探します。
function findDraggableAt(point) {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがない場合は対象なしで返します。
  if (!step) {
    return null;
  }
  // テキスト上の場合はテキストを返します。
  const textItem = findTextAt(point);
  // テキストが見つかった場合はドラッグ対象として返します。
  if (textItem) {
    // テキスト対象情報を返します。
    return { type: "text", id: textItem.id };
  }
  // ボールに近い場合はボールを返します。
  if (distance(point, step.ball) <= BALL_RADIUS + 12) {
    return { type: "ball", id: step.ball.id };
  }
  // 後に描いた選手から逆順で探します。
  const player = [...step.players].reverse().find((item) => distance(point, item) <= getPlayerRadius() + 10);
  // 選手が見つかった場合は選手情報を返します。
  if (player) {
    return { type: "player", id: player.id };
  }
  // コーン上の場合はコーンを返します。
  const cone = findConeAt(point);
  // コーンが見つかった場合はコーン情報を返します。
  if (cone) {
    // コーン対象情報を返します。
    return { type: "cone", id: cone.id };
  }
  // 対象がなければnullを返します。
  return null;
}

// 指定位置にある配置テキストを探します。
function findTextAt(point) {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがない場合は対象なしで返します。
  if (!step) {
    // 対象なしを返します。
    return null;
  }
  // 最後に追加したテキストから逆順で確認します。
  return [...(step.texts ?? [])].reverse().find((textItem) => {
    // テキストの当たり判定範囲を取得します。
    const bounds = getTextBounds(textItem);
    // 指定点が範囲内かを返します。
    return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
  }) ?? null;
}

// 指定位置に近い戦術線を探します。
function findLineAt(point) {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがない場合は対象なしで返します。
  if (!step) {
    return null;
  }
  // 後に描いた線から逆順で探します。
  return [...step.lines].reverse().find((line) => pointToPathDistance(point, line.points?.length >= 2 ? line.points : [line.start, line.end]) <= 22) ?? null;
}

// 点と折れ線の最短距離を返します。
function pointToPathDistance(point, points) {
  // 点列が不足している場合は無限大を返します。
  if (!points || points.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  // 最短距離を無限大で初期化します。
  let minimum = Number.POSITIVE_INFINITY;
  // 各線分との距離を確認します。
  for (let index = 1; index < points.length; index += 1) {
    // 現在の線分との距離を計算します。
    const current = pointToSegmentDistance(point, points[index - 1], points[index]);
    // 最短距離を更新します。
    minimum = Math.min(minimum, current);
  }
  // 求めた最短距離を返します。
  return minimum;
}

// 指定位置にいる選手を探します。
function findPlayerAt(point) {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがない場合は対象なしで返します。
  if (!step) {
    return null;
  }
  // 描画順の後ろから選手を探します。
  return [...step.players].reverse().find((player) => distance(point, player) <= getPlayerRadius() + 16) ?? null;
}

// 描画点列へ必要な間隔で点を追加します。
function appendDrawPoint(session, point) {
  // 点列がない場合は初期化します。
  session.points = session.points ?? [{ ...session.start }];
  // 最後に保存した点を取得します。
  const last = session.points[session.points.length - 1];
  // 一定距離以上動いた場合だけ点を追加します。
  if (distance(last, point) >= 7) {
    // 新しい点を追加します。
    session.points.push({ ...point });
  }
  // 現在点を更新します。
  session.current = point;
}

// 戦術線の点列を安全に取得します。
function getLinePoints(line) {
  // 曲線点列が2点以上ある場合は複製して返します。
  if (line.points?.length >= 2) {
    // 元データを変更しないように各点を複製します。
    return line.points.map((point) => ({ ...point }));
  }
  // 点列がない場合は開始点と終了点を返します。
  return [{ ...line.start }, { ...line.end }];
}

// 選手位置からドリブル中のボール表示位置を作ります。
function getBallPositionBesidePlayer(point) {
  // 選手の右上へ少しずらした位置を返します。
  return { x: point.x + BALL_RADIUS + 8, y: point.y - BALL_RADIUS - 4 };
}

// 2点を指定割合で補間します。
function interpolatePoint(start, end, progress) {
  // 0から1へ制限した割合を作ります。
  const ratio = Math.max(0, Math.min(1, progress));
  // XとYを線形補間して返します。
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

// 指定した動作グループ数まで適用したSTEP内の配置を計算します。
function calculateStepStateAfterGroups(step, completedGroupCount) {
  // 選手ごとの現在位置を保持します。
  const players = {};
  // STEP開始時の全選手位置を複製します。
  step.players.forEach((player) => {
    // 選手IDをキーにして位置を保存します。
    players[player.id] = { x: player.x, y: player.y };
  });
  // STEP開始時のボール位置を複製します。
  let ball = { ...step.ball };
  // 再生順ごとの動作グループを取得します。
  const groups = getOrderedActionGroups(step);
  // 適用するグループ数を有効範囲へ収めます。
  const safeCount = Math.max(0, Math.min(groups.length, Number(completedGroupCount) || 0));
  // 指定数までの動作グループを順番に適用します。
  groups.slice(0, safeCount).forEach((group) => {
    // 同じ順番内は描画順に最終位置を確定します。
    group.items.forEach(({ line }) => {
      // パスの場合はボールをパス終点へ移します。
      if (line.type === "pass") {
        // ボール位置をパス終点へ更新します。
        ball = { ...line.end };
        // 次の線へ進みます。
        return;
      }
      // 選手に紐付かない移動線は配置計算から除外します。
      if (!line.playerId || !isMovementLineType(line.type)) {
        // 次の線へ進みます。
        return;
      }
      // 線の点列を取得します。
      const points = getLinePoints(line);
      // 線の終点を取得します。
      const end = points[points.length - 1];
      // 対象選手の最終位置を更新します。
      players[line.playerId] = { ...end };
      // ドリブルの場合はボールも選手終点へ追従させます。
      if (isDribbleLineType(line.type)) {
        // ボール位置を選手の右上へ更新します。
        ball = getBallPositionBesidePlayer(end);
      }
    });
  });
  // 選手位置、ボール位置、動作グループを返します。
  return { players, ball, groups };
}

// STEP内の再生順を適用した最終配置を計算します。
function calculateStepEndState(step) {
  // 再生順ごとの全動作グループを取得します。
  const groups = getOrderedActionGroups(step);
  // 全グループ適用後の配置を計算します。
  const finalState = calculateStepStateAfterGroups(step, groups.length);
  // 選手、ボール、再生対象有無を返します。
  return { players: finalState.players, ball: finalState.ball, hasAnimation: groups.length > 0 };
}

// 現在位置から戦術線へ自然につながる再生軌道を作ります。
function buildActionPath(currentPoint, line) {
  // 戦術線の点列を取得します。
  const linePoints = getLinePoints(line);
  // パスは現在のボール位置から線の終点まで直線移動させます。
  if (line.type === "pass") {
    // パス用の2点軌道を返します。
    return [{ ...currentPoint }, { ...line.end }];
  }
  // 現在位置を軌道の先頭へ追加します。
  const points = [{ ...currentPoint }];
  // 描画開始点が現在位置に近い場合は重複点を除いて追加します。
  if (distance(currentPoint, linePoints[0]) < 10) {
    // 先頭以外の点を追加します。
    points.push(...linePoints.slice(1));
  } else {
    // 離れている場合は描画開始点までの動きも含めます。
    points.push(...linePoints);
  }
  // 軌道点列を返します。
  return points;
}

// 再生表示用の選手位置Mapを複製します。
function clonePlayerPositionMap(players) {
  // 複製結果を初期化します。
  const copied = {};
  // 全選手位置を複製します。
  Object.entries(players).forEach(([playerId, point]) => {
    // 選手IDごとに位置を保存します。
    copied[playerId] = { ...point };
  });
  // 複製したMapを返します。
  return copied;
}

// Pointer押下を処理します。
function handlePointerDown(event) {
  // 再生中は編集を止めます。
  if (playbackTimer) {
    return;
  }
  // 前回再生の終点表示を解除します。
  clearPlaybackPreview();
  // 既定のタッチ操作を止めます。
  event.preventDefault();
  // CanvasへPointerキャプチャを設定します。
  canvas.setPointerCapture(event.pointerId);
  // 操作ヒントを隠します。
  canvasHint.classList.add("hidden");
  // コート座標を取得します。
  const rawPoint = clampPoint(pointerToCourt(event));
  // 選択ツールの場合を処理します。
  if (state.activeTool === "select") {
    // 位置にある対象を探します。
    const target = findDraggableAt(rawPoint);
    // 対象がある場合だけドラッグを開始します。
    if (target) {
      // ドラッグ前の状態を保存します。
      dragSession = {
        // 操作中Pointer IDを保存します。
        pointerId: event.pointerId,
        // ドラッグ対象を保存します。
        target,
        // 変更前スナップショットを保存します。
        before: createSnapshot(),
        // 移動有無を初期化します。
        moved: false
      };
      // 選手を押した直後から選択色が見えるよう再描画します。
      render();
    }
    // 選択ツール処理を終了します。
    return;
  }
  // 消去ツールの場合を処理します。
  if (state.activeTool === "erase") {
    // 位置にあるテキストを探します。
    const textItem = findTextAt(rawPoint);
    // テキストがある場合は優先して削除します。
    if (textItem) {
      // 履歴付きでテキストを削除します。
      commitMutation(() => {
        // 現在のSTEPを取得します。
        const step = getActiveStep();
        // 対象以外のテキストを残します。
        step.texts = step.texts.filter((item) => item.id !== textItem.id);
      });
      // 削除結果を通知します。
      showToast("テキストを削除しました");
      // 消去ツール処理を終了します。
      return;
    }
    // 位置にあるコーンを探します。
    const cone = findConeAt(rawPoint);
    // コーンがある場合は優先して削除します。
    if (cone) {
      // 履歴付きでコーンを削除します。
      commitMutation(() => {
        // 現在STEPを取得します。
        const step = getActiveStep();
        // 対象以外のコーンを残します。
        step.cones = step.cones.filter((item) => item.id !== cone.id);
      });
      // 削除結果を通知します。
      showToast("コーンを削除しました");
      // 消去ツール処理を終了します。
      return;
    }
    // 位置に近い線を探します。
    const line = findLineAt(rawPoint);
    // 線がある場合だけ削除します。
    if (line) {
      // 履歴付きで線を削除します。
      commitMutation(() => {
        // 現在のSTEPを取得します。
        const step = getActiveStep();
        // 対象線以外を残します。
        step.lines = step.lines.filter((item) => item.id !== line.id);
      });
      // 削除結果を通知します。
      showToast("線を削除しました");
    }
    // 消去ツール処理を終了します。
    return;
  }
  // テキストツールの場合は押した場所へ文字を追加します。
  if (state.activeTool === "text") {
    // 配置する文字を入力してもらいます。
    const enteredText = window.prompt("コートに置くテキストを入力してください。", "");
    // キャンセルまたは空文字の場合は追加しません。
    if (enteredText !== null && enteredText.trim()) {
      // 新しいテキストデータを仮作成します。
      const textItem = { id: makeId("text"), text: enteredText.trim(), x: rawPoint.x, y: rawPoint.y, color: state.activeLineColor, fontSize: TEXT_FONT_SIZE };
      // テキスト全体がコート内へ収まる位置を計算します。
      const position = clampTextPosition(textItem, rawPoint);
      // 履歴付きでテキストを追加します。
      commitMutation(() => {
        // 配置位置Xを設定します。
        textItem.x = position.x;
        // 配置位置Yを設定します。
        textItem.y = position.y;
        // 現在STEPへ追加します。
        getActiveStep().texts.push(textItem);
      });
      // 追加結果を通知します。
      showToast("テキストを追加しました");
    }
    // Pointerキャプチャを安全に解除します。
    if (canvas.hasPointerCapture(event.pointerId)) {
      // Pointerキャプチャを解除します。
      canvas.releasePointerCapture(event.pointerId);
    }
    // テキストツール処理を終了します。
    return;
  }
  // 移動線、ドリブル線、スクリーン線では開始位置の選手を探します。
  const player = isMovementLineType(state.activeTool) ? findPlayerAt(rawPoint) : null;
  // 現在STEPを取得します。
  const drawingStep = getActiveStep();
  // 既存の描画順を反映したボール予定位置を取得します。
  const plannedBall = state.activeTool === "pass" ? calculateStepEndState(drawingStep).ball : null;
  // STEP内にドリブルまたはパスが既にあるか確認します。
  const hasPreviousBallAction = state.activeTool === "pass" && drawingStep.lines.some((line) => isBallSequenceLineType(line.type));
  // パスは必ず直前動作後のボール位置から開始し、それ以外は選手または押下位置を使います。
  const startPoint = player ? { x: player.x, y: player.y } : plannedBall ? { ...plannedBall } : rawPoint;
  // 描画ツールの場合は描画操作を開始します。
  drawSession = {
    // 操作中Pointer IDを保存します。
    pointerId: event.pointerId,
    // 線種を保存します。
    type: state.activeTool,
    // 開始点を保存します。
    start: startPoint,
    // 現在点を保存します。
    current: startPoint,
    // 曲線用の点列を初期化します。
    points: [{ ...startPoint }],
    // 開始位置にいる選手IDを保存します。
    playerId: player?.id ?? null
  };
  // 選手に結び付かない移動線の場合は操作方法を案内します。
  if (isMovementLineType(state.activeTool) && !player) {
    // 再生には選手から描き始める必要があることを通知します。
    showToast("再生させる線は選手マーカーから描き始めます");
  }
  // 直前にドリブルやパスがある場合は、パス始点を自動連結したことを案内します。
  if (hasPreviousBallAction) {
    // 利用者へ自動連結を通知します。
    showToast("パス始点を直前動作後のボール位置へ自動でつなぎました");
  }
  // プレビューを描画します。
  render();
}

// Canvasのダブルクリックで配置テキストを編集します。
function handleCanvasDoubleClick(event) {
  // 再生中は編集しません。
  if (playbackTimer) {
    // 処理を終了します。
    return;
  }
  // コート座標を取得します。
  const point = clampPoint(pointerToCourt(event));
  // 指定位置のテキストを探します。
  const textItem = findTextAt(point);
  // テキストがない場合は終了します。
  if (!textItem) {
    // 処理を終了します。
    return;
  }
  // 現在文字を初期値として編集内容を入力してもらいます。
  const editedText = window.prompt("テキストを編集してください。", textItem.text);
  // キャンセルまたは空文字の場合は変更しません。
  if (editedText === null || !editedText.trim()) {
    // 処理を終了します。
    return;
  }
  // 履歴付きでテキスト内容を更新します。
  commitMutation(() => {
    // 新しい文字列を保存します。
    textItem.text = editedText.trim();
    // 文字幅変更後もコート内へ収めます。
    const next = clampTextPosition(textItem, textItem);
    // X位置を補正します。
    textItem.x = next.x;
    // Y位置を補正します。
    textItem.y = next.y;
  });
  // 編集結果を通知します。
  showToast("テキストを変更しました");
}

// Pointer移動を処理します。
function handlePointerMove(event) {
  // ドラッグ中か描画中でなければ終了します。
  if (!dragSession && !drawSession) {
    return;
  }
  // 既定のタッチ操作を止めます。
  event.preventDefault();
  // 現在位置をコート座標で取得します。
  const point = pointerToCourt(event);
  // ドラッグ中の場合を処理します。
  if (dragSession && dragSession.pointerId === event.pointerId) {
    // 現在のSTEPを取得します。
    const step = getActiveStep();
    // 対象が選手の場合を処理します。
    if (dragSession.target.type === "player") {
      // 対象選手を探します。
      const player = step.players.find((item) => item.id === dragSession.target.id);
      // 選手が見つかった場合は位置を更新します。
      if (player) {
        // 選手をコート内へ収めます。
        const next = clampPoint(point, getPlayerRadius() + 4);
        // X位置を更新します。
        player.x = next.x;
        // Y位置を更新します。
        player.y = next.y;
      }
    }
    // 対象がテキストの場合を処理します。
    if (dragSession.target.type === "text") {
      // 対象テキストを探します。
      const textItem = step.texts.find((item) => item.id === dragSession.target.id);
      // テキストが見つかった場合は位置を更新します。
      if (textItem) {
        // テキスト全体をコート内へ収めます。
        const next = clampTextPosition(textItem, point);
        // X位置を更新します。
        textItem.x = next.x;
        // Y位置を更新します。
        textItem.y = next.y;
      }
    }
    // 対象がコーンの場合を処理します。
    if (dragSession.target.type === "cone") {
      // 対象コーンを探します。
      const cone = step.cones.find((item) => item.id === dragSession.target.id);
      // コーンが見つかった場合は位置を更新します。
      if (cone) {
        // コーンをコート内へ収めます。
        const next = clampPoint(point, Math.max(CONE_WIDTH, CONE_HEIGHT) / 2 + 4);
        // X位置を更新します。
        cone.x = next.x;
        // Y位置を更新します。
        cone.y = next.y;
      }
    }
    // 対象がボールの場合を処理します。
    if (dragSession.target.type === "ball") {
      // ボールをコート内へ収めます。
      const next = clampPoint(point, BALL_RADIUS + 4);
      // X位置を更新します。
      step.ball.x = next.x;
      // Y位置を更新します。
      step.ball.y = next.y;
    }
    // 移動済みとして記録します。
    dragSession.moved = true;
    // 再描画します。
    render();
  }
  // 描画中の場合を処理します。
  if (drawSession && drawSession.pointerId === event.pointerId) {
    // 終点をコート内へ収めます。
    const next = clampPoint(point);
    // 曲線対応ツールかどうかを判定します。
    const capturesPath = FREEHAND_LINE_TYPES.has(drawSession.type);
    // 曲線対応ツールでは軌跡点を追加します。
    if (capturesPath) {
      // 点列へ現在点を追加します。
      appendDrawPoint(drawSession, next);
    } else {
      // 直線ツールでは終点だけを更新します。
      drawSession.current = next;
      // 直線プレビュー用の点列を更新します。
      drawSession.points = [{ ...drawSession.start }, { ...next }];
    }
    // プレビューを再描画します。
    render();
  }
}

// Pointer終了を処理します。
function handlePointerUp(event) {
  // ドラッグ中の場合を処理します。
  if (dragSession && dragSession.pointerId === event.pointerId) {
    // 実際に移動した場合だけ履歴へ保存します。
    if (dragSession.moved) {
      // 変更前状態を履歴へ追加します。
      pushUndo(dragSession.before);
      // 画面と自動保存を同期します。
      syncInterface();
    }
    // ドラッグ状態を解除します。
    dragSession = null;
    // 選択色を通常色へ戻すため再描画します。
    render();
  }
  // 描画中の場合を処理します。
  if (drawSession && drawSession.pointerId === event.pointerId) {
    // Pointer終了位置をコート内へ収めます。
    const finalPoint = clampPoint(pointerToCourt(event));
    // フリーハンド系ツールの場合を処理します。
    if (FREEHAND_LINE_TYPES.has(drawSession.type)) {
      // 最後の現在点を軌跡点列へ補います。
      appendDrawPoint(drawSession, finalPoint);
    } else {
      // 直線系ツールでは開始点と終了点だけを保持します。
      drawSession.current = finalPoint;
      // 重複点を作らず直線用の2点へ固定します。
      drawSession.points = [{ ...drawSession.start }, { ...finalPoint }];
    }
    // 点列を軽量化します。
    const points = simplifyDrawPoints(drawSession.points);
    // 開始点と終了点の距離を計算します。
    const lineLength = pathLength(points);
    // 短すぎない場合だけ線を追加します。
    if (lineLength >= 18) {
      // 変更前状態を履歴へ保存します。
      pushUndo();
      // 現在のSTEPを取得します。
      const step = getActiveStep();
      // 新しい戦術線を追加します。
      step.lines.push({
        // 線IDを付けます。
        id: makeId("line"),
        // 線種を保存します。
        type: drawSession.type,
        // 開始点を保存します。
        start: { ...points[0] },
        // 終了点を保存します。
        end: { ...points[points.length - 1] },
        // 曲線点列を保存します。
        points,
        // 移動対象の選手IDを保存します。
        playerId: drawSession.playerId,
        // 描画時に選択していた色を保存します。
        color: state.activeLineColor,
        // 初期再生順は追加後に線種と対象選手から自動設定します。
        playOrder: null
      });
      // 新しく追加した線へ初期再生順を割り当てます。
      assignDefaultPlayOrders(step, true);
    }
    // 描画状態を解除します。
    drawSession = null;
    // 画面と自動保存を同期します。
    syncInterface();
  }
  // Pointerキャプチャを安全に解除します。
  if (canvas.hasPointerCapture(event.pointerId)) {
    // Pointerキャプチャを解除します。
    canvas.releasePointerCapture(event.pointerId);
  }
}

// 描画点列から近すぎる点を除いて軽量化します。
function simplifyDrawPoints(points) {
  // 点列が少ない場合は複製して返します。
  if (!points || points.length <= 2) {
    return (points ?? []).map((point) => ({ ...point }));
  }
  // 最初の点を結果へ追加します。
  const result = [{ ...points[0] }];
  // 中間点を確認します。
  for (let index = 1; index < points.length - 1; index += 1) {
    // 前回採用した点を取得します。
    const previous = result[result.length - 1];
    // 現在点を取得します。
    const current = points[index];
    // 十分離れている点だけ採用します。
    if (distance(previous, current) >= 9) {
      // 点を結果へ追加します。
      result.push({ ...current });
    }
  }
  // 最終点を必ず追加します。
  result.push({ ...points[points.length - 1] });
  // 軽量化した点列を返します。
  return result;
}

// 点列全体の長さを返します。
function pathLength(points) {
  // 合計距離を初期化します。
  let total = 0;
  // 各線分の距離を加算します。
  for (let index = 1; index < (points?.length ?? 0); index += 1) {
    // 前後点の距離を加算します。
    total += distance(points[index - 1], points[index]);
  }
  // 合計距離を返します。
  return total;
}

// 新しく描く線の色を切り替えます。
function setLineColor(colorName) {
  // 未対応の色は黒へ戻します。
  const safeColor = LINE_COLORS[colorName] ? colorName : "black";
  // 選択色を状態へ保存します。
  state.activeLineColor = safeColor;
  // 色ボタンの選択状態を更新します。
  document.querySelectorAll("[data-line-color]").forEach((button) => {
    // 選択中の色だけactiveにします。
    button.classList.toggle("active", button.dataset.lineColor === safeColor);
  });
  // 設定を自動保存します。
  autosave();
}

// 選手マーカーの表示サイズを切り替えます。
function setPlayerSize(sizeName) {
  // サイズ名を利用可能な値へ補正します。
  const safeSize = normalizePlayerSize(sizeName);
  // 選択サイズを状態へ保存します。
  state.playerSize = safeSize;
  // 全サイズボタンの選択状態を更新します。
  document.querySelectorAll("[data-player-size]").forEach((button) => {
    // 選択中のサイズだけactiveにします。
    button.classList.toggle("active", button.dataset.playerSize === safeSize);
  });
  // 選手サイズを即時反映するため再描画します。
  render();
  // 設定を自動保存します。
  autosave();
}

// 再生ボタンの表示文字を一括更新します。
function updatePlayButtonLabels(label) {
  // 通常表示の再生ボタンを更新します。
  document.getElementById("playStepsButton").textContent = label;
  // 最大表示では短い文言へ置き換えます。
  focusPlayButton.textContent = label.includes("停止") ? "■" : "▶";
  focusPlayButton.setAttribute("aria-label", label.includes("停止") ? "停止" : "再生");
  focusPlayButton.title = label.includes("停止") ? "停止" : "再生";
}

// 最大表示中の再生ボタンとSTEP一覧の表示状態を同期します。
function syncFocusVisibility() {
  focusPlayButton.classList.toggle("hidden", !state.focusShowPlayButton);
  focusStepList.classList.toggle("hidden", !state.focusShowSteps);
  focusPlayVisibilityButton.classList.toggle("active", state.focusShowPlayButton);
  focusPlayVisibilityButton.setAttribute("aria-pressed", String(state.focusShowPlayButton));
  focusPlayVisibilityButton.title = state.focusShowPlayButton ? "再生ボタンを隠す" : "再生ボタンを表示";
  focusStepsVisibilityButton.classList.toggle("active", state.focusShowSteps);
  focusStepsVisibilityButton.setAttribute("aria-pressed", String(state.focusShowSteps));
  focusStepsVisibilityButton.title = state.focusShowSteps ? "STEP一覧を隠す" : "STEP一覧を表示";
}

// 最大表示中のSTEP一覧を描画します。
function renderFocusStepList() {
  // 既存のボタンを消します。
  focusStepList.innerHTML = "";
  // 各STEPの簡易ボタンを作ります。
  state.steps.forEach((step, index) => {
    // STEPボタンを作ります。
    const button = document.createElement("button");
    // ボタン種別を設定します。
    button.type = "button";
    // 見た目のクラスを設定します。
    button.className = "focus-step-chip";
    // 選択中STEPを強調します。
    button.classList.toggle("active", step.id === state.activeStepId);
    // STEP番号を表示します。
    button.textContent = `${index + 1}`;
    // クリックでSTEPを切り替えます。
    button.addEventListener("click", () => selectStep(step.id));
    // 一覧へ追加します。
    focusStepList.appendChild(button);
  });
  // 現在の最大表示用表示状態を反映します。
  syncFocusVisibility();
}

// 最大表示中の編集ツールパネルを開閉します。
function setFocusEditorOpen(open) {
  // 開閉状態を保存します。
  isFocusEditorOpen = Boolean(open);
  // パネルの表示クラスを切り替えます。
  focusEditorPanel.classList.toggle("open", isFocusEditorOpen);
  // 開閉ボタンの見た目を切り替えます。
  focusEditorToggleButton.classList.toggle("open", isFocusEditorOpen);
  // 支援技術へ現在状態を伝えます。
  focusEditorToggleButton.setAttribute("aria-expanded", String(isFocusEditorOpen));
  // 開いている時は閉じる記号へ変更します。
  focusEditorToggleButton.textContent = isFocusEditorOpen ? "×" : "✎";
  // ボタンの説明を更新します。
  focusEditorToggleButton.title = isFocusEditorOpen ? "編集ツールを隠す" : "編集ツールを表示";
}

// コートだけの最大表示を切り替えます。
function setFocusMode(enabled) {
  // 最大表示状態を保存します。
  isFocusMode = Boolean(enabled);
  // 最大表示へ入る時も戻る時も編集パネルを一度閉じます。
  setFocusEditorOpen(false);
  // 画面全体へ最大表示クラスを切り替えます。
  document.body.classList.toggle("board-focus", isFocusMode);
  // 最大表示へ入る場合を処理します。
  if (isFocusMode) {
    // 最大表示へ入るたび、再生ボタンとSTEP一覧を標準の非表示へ戻します。
    state.focusShowPlayButton = false;
    state.focusShowSteps = false;
    // ブラウザーが対応していれば全画面表示も試します。
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  } else if (document.fullscreenElement) {
    // 全画面表示中なら解除します。
    document.exitFullscreen?.().catch(() => undefined);
  }
  // 薄いアイコンを含めて表示状態を同期します。
  syncFocusVisibility();
  // レイアウト反映後にCanvasサイズを再計算します。
  window.setTimeout(resizeCanvas, 40);
}

// ツールを切り替えます。
function setTool(tool) {
  // 前回再生の終点表示を解除します。
  clearPlaybackPreview();
  // 選択ツールを状態へ保存します。
  state.activeTool = tool;
  // 全ツールボタンを確認します。
  document.querySelectorAll("[data-tool]").forEach((button) => {
    // 選択ツールと一致するボタンだけactiveにします。
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  // 状態表示を更新します。
  toolStatus.textContent = TOOL_LABELS[tool] ?? "描画ツール";
  // Canvasのカーソルを切り替えます。
  canvas.style.cursor = tool === "select" ? "grab" : tool === "erase" ? "not-allowed" : "crosshair";
}

// コート表示を切り替えます。
function changeCourtMode(mode) {
  // 前回再生の終点表示を解除します。
  clearPlaybackPreview();
  // 同じモードの場合は何もしません。
  if (state.courtMode === mode) {
    return;
  }
  // 変更前サイズを取得します。
  const oldSize = getCourtSize();
  // 履歴付きで切り替えます。
  commitMutation(() => {
    // 新しいモードを設定します。
    state.courtMode = mode;
    // 変更後サイズを取得します。
    const newSize = getCourtSize();
    // X方向の倍率を計算します。
    const scaleX = newSize.width / oldSize.width;
    // Y方向の倍率を計算します。
    const scaleY = newSize.height / oldSize.height;
    // 全STEPの座標を新しいサイズへ合わせます。
    state.steps.forEach((step) => {
      // 全選手位置を拡大縮小します。
      step.players.forEach((player) => {
        // X位置を変換します。
        player.x *= scaleX;
        // Y位置を変換します。
        player.y *= scaleY;
      });
      // ボールX位置を変換します。
      step.ball.x *= scaleX;
      // ボールY位置を変換します。
      step.ball.y *= scaleY;
      // 全コーン位置を拡大縮小します。
      step.cones.forEach((cone) => {
        // コーンX位置を変換します。
        cone.x *= scaleX;
        // コーンY位置を変換します。
        cone.y *= scaleY;
      });
      // 全戦術線を変換します。
      step.lines.forEach((line) => {
        // 開始点Xを変換します。
        line.start.x *= scaleX;
        // 開始点Yを変換します。
        line.start.y *= scaleY;
        // 終了点Xを変換します。
        line.end.x *= scaleX;
        // 終了点Yを変換します。
        line.end.y *= scaleY;
        // 曲線点列がある場合は全点を変換します。
        (line.points ?? []).forEach((point) => {
          // 曲線点Xを変換します。
          point.x *= scaleX;
          // 曲線点Yを変換します。
          point.y *= scaleY;
        });
      });
      // 全テキスト位置を新しいサイズへ合わせます。
      step.texts.forEach((textItem) => {
        // テキストX位置を変換します。
        textItem.x *= scaleX;
        // テキストY位置を変換します。
        textItem.y *= scaleY;
        // 文字サイズを小さい倍率へ合わせます。
        textItem.fontSize *= Math.min(scaleX, scaleY);
      });
    });
  });
  // Canvasサイズを再計算します。
  resizeCanvas();
}

// 新しいコーンの初期位置を返します。
function getDefaultConePosition(color) {
  // 現在のコートサイズを取得します。
  const size = getCourtSize();
  // 同じ色の現在数を取得します。
  const count = getActiveStep().cones.filter((cone) => cone.color === color).length;
  // 5列に折り返す列番号を計算します。
  const column = count % 5;
  // 行番号を計算します。
  const row = Math.floor(count / 5);
  // 赤と青で初期配置する左右位置を分けます。
  const baseX = color === "blue" ? size.width * 0.68 : size.width * 0.18;
  // 重ならない初期位置を返します。
  return clampPoint({ x: baseX + column * 48, y: size.height * 0.82 - row * 52 }, Math.max(CONE_WIDTH, CONE_HEIGHT) / 2 + 4);
}

// 現在STEPへ赤または青のコーンを追加します。
function addCone(color) {
  // 前回再生の表示状態を解除します。
  clearPlaybackPreview();
  // 赤または青へ色を補正します。
  const safeColor = color === "blue" ? "blue" : "red";
  // 初期位置を取得します。
  const position = getDefaultConePosition(safeColor);
  // 履歴付きでコーンを追加します。
  commitMutation(() => {
    // 現在STEPへ新しいコーンを追加します。
    getActiveStep().cones.push({ id: makeId("cone"), color: safeColor, x: position.x, y: position.y });
  });
  // 追加結果を通知します。
  showToast(`${safeColor === "blue" ? "青" : "赤"}コーンを追加しました`);
}

// コーン数表示を現在STEPへ同期します。
function renderConeCounts() {
  // 現在STEPを取得します。
  const step = getActiveStep();
  // 赤コーン数を表示します。
  redConeCount.textContent = String(step?.cones?.filter((cone) => cone.color === "red").length ?? 0);
  // 青コーン数を表示します。
  blueConeCount.textContent = String(step?.cones?.filter((cone) => cone.color === "blue").length ?? 0);
}

// 選手番号に対応する安定したIDを作ります。
function getPlayerIdForNumber(side, number) {
  // オフェンスはo、ディフェンスはdを先頭へ付けます。
  return `${side === "offense" ? "o" : "d"}${number}`;
}

// 新しく追加する選手番号の初期位置を返します。
function getDefaultPlayerPosition(side, number) {
  // 現在のコートサイズを取得します。
  const size = getCourtSize();
  // 0番から18番を7列へ分けた列番号を計算します。
  const column = number % 7;
  // 0番から18番を7列へ分けた行番号を計算します。
  const row = Math.floor(number / 7);
  // 左右へ均等に配置するX比率を計算します。
  const xRatio = 0.08 + column * (0.84 / 6);
  // オフェンスとディフェンスで開始Y位置を分けます。
  const baseYRatio = side === "offense" ? 0.9 : 0.62;
  // 同じ側の番号を3段へ配置するY比率を計算します。
  const yRatio = baseYRatio - row * 0.08;
  // コート内へ収めた初期位置を返します。
  return clampPoint({ x: size.width * xRatio, y: size.height * yRatio }, getPlayerRadius() + 4);
}

// 現在STEPの選手番号を追加または削除します。
function togglePlayerNumber(side, number) {
  // 前回再生の終点表示を解除します。
  clearPlaybackPreview();
  // 現在STEPを取得します。
  const step = getActiveStep();
  // 対応する選手を探します。
  const existing = step.players.find((player) => player.side === side && String(player.label) === String(number));
  // 履歴付きで選手状態を変更します。
  commitMutation(() => {
    // 選手が存在する場合は削除します。
    if (existing) {
      // 対象選手以外を残します。
      step.players = step.players.filter((player) => player.id !== existing.id);
      // 削除した選手へ結び付く動作線も削除します。
      step.lines = step.lines.filter((line) => line.playerId !== existing.id);
      // 処理を終了します。
      return;
    }
    // 新しい選手の初期位置を計算します。
    const position = getDefaultPlayerPosition(side, number);
    // 現在STEPへ選手を追加します。
    step.players.push({ id: getPlayerIdForNumber(side, number), side, label: String(number), x: position.x, y: position.y });
  });
  // 変更内容を通知します。
  showToast(`${side === "offense" ? "オフェンス" : "ディフェンス"}${number}番を${existing ? "削除" : "追加"}しました`);
}

// 指定側の人数を1人ずつ簡単に増減します。
function adjustPlayerCount(side, change) {
  const players = getActiveStep().players.filter((player) => player.side === side);
  if (change > 0) {
    const usedNumbers = new Set(players.map((player) => String(player.label)));
    const preferredNumbers = [...Array.from({ length: 18 }, (_, index) => index + 1), 0];
    const nextNumber = preferredNumbers.find((number) => !usedNumbers.has(String(number)));
    if (nextNumber === undefined) {
      showToast("追加できる番号は0〜18です");
      return;
    }
    togglePlayerNumber(side, nextNumber);
    return;
  }
  if (players.length === 0) {
    showToast(`${side === "offense" ? "オフェンス" : "ディフェンス"}は0人です`);
    return;
  }
  const target = [...players].sort((a, b) => Number(b.label) - Number(a.label))[0];
  togglePlayerNumber(side, target.label);
}

// 全番号選択欄を必要な時だけ開閉します。
function setPlayerNumberDetailsVisible(visible) {
  playerNumberDetailsVisible = Boolean(visible);
  playerNumberDetails.classList.toggle("hidden", !playerNumberDetailsVisible);
  playerNumberDetailsToggle.classList.toggle("active", playerNumberDetailsVisible);
  playerNumberDetailsToggle.setAttribute("aria-expanded", String(playerNumberDetailsVisible));
  playerNumberDetailsToggle.textContent = playerNumberDetailsVisible ? "123 閉じる" : "123 全番号";
  playerNumberDetailsToggle.title = playerNumberDetailsVisible
    ? "全番号を閉じる"
    : "全番号を表示。番号を押すと現在STEPへ追加・削除できます";
}

// オフェンスとディフェンスの0番から18番ボタンを描画します。
function renderPlayerNumberGrids() {
  // 現在STEPを取得します。
  const step = getActiveStep();
  // 側ごとの番号グリッドを処理します。
  [["offense", offenseNumberGrid], ["defense", defenseNumberGrid]].forEach(([side, grid]) => {
    // 既存ボタンを消します。
    grid.innerHTML = "";
    // 0番から18番までボタンを作ります。
    for (let number = 0; number <= 18; number += 1) {
      // 番号ボタンを作ります。
      const button = document.createElement("button");
      // ボタン種類を設定します。
      button.type = "button";
      // 共通クラスを設定します。
      button.className = "player-number-button";
      // 現在STEPに配置済みか確認します。
      const active = step.players.some((player) => player.side === side && String(player.label) === String(number));
      // 配置済み番号を強調します。
      button.classList.toggle("active", active);
      // 番号を表示します。
      button.textContent = String(number);
      // 操作内容を説明します。
      button.title = `${side === "offense" ? "オフェンス" : "ディフェンス"}${number}番を${active ? "削除" : "追加"}`;
      // クリックで番号を切り替えます。
      button.addEventListener("click", () => togglePlayerNumber(side, number));
      // グリッドへ追加します。
      grid.appendChild(button);
    }
  });
  // 通常表示する簡易人数へ現在STEPの人数を反映します。
  offensePlayerCount.textContent = String(step.players.filter((player) => player.side === "offense").length);
  defensePlayerCount.textContent = String(step.players.filter((player) => player.side === "defense").length);
  // 全番号欄の開閉状態を維持します。
  setPlayerNumberDetailsVisible(playerNumberDetailsVisible);
}

// 動作線の種類を一覧表示用の短い名前へ変換します。
function getActionTypeLabel(type) {
  // 線種ごとの表示名を定義します。
  const labels = {
    // 選手移動の表示名です。
    move: "移動",
    // パスの表示名です。
    pass: "パス",
    // 曲線ドリブルの表示名です。
    dribbleFree: "ドリブル曲",
    // 直線ドリブルの表示名です。
    dribbleStraight: "ドリブル直",
    // 曲線スクリーンの表示名です。
    screenFree: "スクリーン曲",
    // 直線スクリーンの表示名です。
    screenStraight: "スクリーン直"
  };
  // 対応する表示名または線種名を返します。
  return labels[type] ?? type;
}

// 現在STEPの動作順設定一覧を描画します。
function renderActionOrderList() {
  // 一覧要素がない場合は処理しません。
  if (!actionOrderList) {
    // 処理を終了します。
    return;
  }
  // 現在STEPを取得します。
  const step = getActiveStep();
  // 既存の一覧を消します。
  actionOrderList.innerHTML = "";
  // 再生対象線を描画順付きで抽出します。
  const actions = (step?.lines ?? []).map((line, index) => ({ line, index })).filter(({ line }) => line.type === "pass" || (line.playerId && isMovementLineType(line.type)));
  // 初期化ボタンの有効状態を切り替えます。
  if (resetActionOrderButton) {
    // 再生対象がない場合は無効にします。
    resetActionOrderButton.disabled = actions.length === 0;
  }
  // 再生対象がない場合は案内を表示します。
  if (actions.length === 0) {
    // 空表示要素を作ります。
    const empty = document.createElement("p");
    // 見た目用クラスを設定します。
    empty.className = "action-order-empty";
    // 案内文を設定します。
    empty.textContent = "動作なし";
    // 一覧へ追加します。
    actionOrderList.appendChild(empty);
    // 処理を終了します。
    return;
  }
  // 選択肢の最大値を動作数に応じて決めます。
  const maximumOrder = Math.max(9, actions.length + 2);
  // 各動作の設定行を作ります。
  actions.forEach(({ line, index }, actionIndex) => {
    // 1行分の要素を作ります。
    const row = document.createElement("div");
    // 見た目用クラスを設定します。
    row.className = "action-order-row";
    // 動作情報領域を作ります。
    const info = document.createElement("div");
    // 見た目用クラスを設定します。
    info.className = "action-order-info";
    // 線色を示す丸を作ります。
    const swatch = document.createElement("span");
    // 見た目用クラスを設定します。
    swatch.className = "action-order-swatch";
    // 線色を背景へ反映します。
    swatch.style.background = LINE_COLORS[line.color] ?? LINE_COLORS.black;
    // 動作名を表示する要素を作ります。
    const label = document.createElement("span");
    // 対象選手を探します。
    const player = line.playerId ? step.players.find((item) => item.id === line.playerId) : null;
    // 攻守を短い文字へ変換します。
    const sideLabel = player ? (player.side === "offense" ? "O" : "D") : "";
    // 対象名を作ります。
    const targetLabel = line.type === "pass" ? "ボール" : player ? `${sideLabel}${player.label}` : "説明線";
    // 描画順、動作種別、対象を表示します。
    label.textContent = `${actionIndex + 1}. ${getActionTypeLabel(line.type)}・${targetLabel}`;
    // 情報領域へ色を追加します。
    info.appendChild(swatch);
    // 情報領域へ文字を追加します。
    info.appendChild(label);
    // 順番選択欄を作ります。
    const select = document.createElement("select");
    // 見た目用クラスを設定します。
    select.className = "action-order-select";
    // 読み上げ用の名前を設定します。
    select.setAttribute("aria-label", `${label.textContent}の再生順`);
    // 1から最大値まで選択肢を作ります。
    for (let order = 1; order <= maximumOrder; order += 1) {
      // 選択肢要素を作ります。
      const option = document.createElement("option");
      // 値を設定します。
      option.value = String(order);
      // 表示文字を設定します。
      option.textContent = String(order);
      // 選択欄へ追加します。
      select.appendChild(option);
    }
    // 現在の再生順を選択状態にします。
    select.value = String(normalizePlayOrder(line.playOrder, 1));
    // 変更時に線の再生順を更新します。
    select.addEventListener("change", () => {
      // 選択値を数値へ変換します。
      const nextOrder = normalizePlayOrder(select.value, 1);
      // 履歴付きで順番を更新します。
      commitMutation(() => {
        // 対象線を現在STEPから探します。
        const target = getActiveStep().lines.find((item) => item.id === line.id);
        // 対象がある場合だけ順番を更新します。
        if (target) {
          // 選択された順番を保存します。
          target.playOrder = nextOrder;
        }
      });
      // 同じ番号が同時再生になることを通知します。
      showToast(`再生順を${nextOrder}に変更しました。同じ番号の移動・スクリーンは同時に動きます`);
    });
    // 個別動作を削除するボタンを作ります。
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-order-delete";
    deleteButton.textContent = "×";
    deleteButton.title = `${label.textContent}を削除`;
    deleteButton.setAttribute("aria-label", `${label.textContent}を削除`);
    deleteButton.addEventListener("click", () => deleteActionLine(line.id));
    // 行へ情報領域を追加します。
    row.appendChild(info);
    // 行へ順番選択欄を追加します。
    row.appendChild(select);
    // 行へ個別削除ボタンを追加します。
    row.appendChild(deleteButton);
    // 一覧へ行を追加します。
    actionOrderList.appendChild(row);
  });
}

// 動作順欄から指定した動作線だけを削除します。
function deleteActionLine(lineId) {
  clearPlaybackPreview();
  commitMutation(() => {
    const step = getActiveStep();
    step.lines = step.lines.filter((line) => line.id !== lineId);
  });
  showToast("動作を削除しました");
}

// 現在STEPの動作順を初期設定へ戻します。
function resetActionOrders() {
  // 現在STEPに再生対象がない場合は処理しません。
  if (!getActiveStep()?.lines?.some((line) => isAnimatedLineType(line.type))) {
    // 処理を終了します。
    return;
  }
  // 履歴付きで初期順番を再計算します。
  commitMutation(() => {
    // 現在STEPの全動作順を初期値へ戻します。
    assignDefaultPlayOrders(getActiveStep(), false);
  });
  // 結果を通知します。
  showToast("動作順を初期設定へ戻しました");
}

// STEP一覧を描画します。
function renderStepList() {
  // 既存のSTEPボタンを消します。
  stepList.innerHTML = "";
  // 各STEPのボタンを作ります。
  state.steps.forEach((step, index) => {
    // ボタン要素を作ります。
    const button = document.createElement("button");
    // ボタンの種類を設定します。
    button.type = "button";
    // ボタンのクラスを設定します。
    button.className = "step-chip";
    // 選択中STEPにはactiveを付けます。
    button.classList.toggle("active", step.id === state.activeStepId);
    // STEP番号を表示します。
    button.textContent = `STEP ${index + 1}`;
    // STEP選択処理を登録します。
    button.addEventListener("click", () => selectStep(step.id));
    // 一覧へ追加します。
    stepList.appendChild(button);
  });
}

// 指定STEPを選択します。
function selectStep(stepId) {
  // 再生中の場合は停止します。
  if (playbackTimer) {
    // 通知なしで再生を停止します。
    stopPlayback(false);
  }
  // コマ送り状態と再生表示を解除します。
  framePlayback = null;
  // 再生用表示位置を消します。
  playbackVisual = null;
  // 選択中STEPを更新します。
  state.activeStepId = stepId;
  // 画面を同期します。
  syncInterface();
}

// 現在STEPの描画順再生後の配置を使って次STEPを追加します。
function addStep() {
  // 現在STEPを取得します。
  const currentStep = getActiveStep();
  // 描画順に全動作を適用した最終配置を計算します。
  const endState = calculateStepEndState(currentStep);
  // 前回再生の表示状態を解除します。
  playbackVisual = null;
  // コマ送り位置も解除します。
  framePlayback = null;
  // 履歴付きでSTEPを追加します。
  commitMutation(() => {
    // 現在のSTEPを深く複製します。
    const duplicated = JSON.parse(JSON.stringify(currentStep));
    // 新しいSTEP IDを付けます。
    duplicated.id = makeId("step");
    // ラベルを更新します。
    duplicated.label = `STEP ${state.steps.length + 1}`;
    // 全選手の再生後位置を次STEPへ反映します。
    duplicated.players.forEach((player) => {
      // 対応する最終位置を取得します。
      const end = endState.players[player.id];
      // 最終位置がある場合だけ更新します。
      if (end) {
        // 選手Xを更新します。
        player.x = end.x;
        // 選手Yを更新します。
        player.y = end.y;
      }
    });
    // パスとドリブルを描画順に適用したボール最終位置を反映します。
    duplicated.ball = { ...endState.ball };
    // 次の動作を描けるように前STEPの線は引き継ぎません。
    duplicated.lines = [];
    // 次STEPのコーチングポイントは空にします。
    duplicated.note = "";
    // 現在STEPの直後の位置を取得します。
    const activeIndex = state.steps.findIndex((step) => step.id === state.activeStepId);
    // 複製STEPを現在STEPの次へ挿入します。
    state.steps.splice(activeIndex + 1, 0, duplicated);
    // 新しいSTEPを選択します。
    state.activeStepId = duplicated.id;
  });
  // 結果を通知します。
  showToast(endState.hasAnimation ? "選手・ボールの動作後配置で次STEPを追加しました" : "現在の配置で次STEPを追加しました");
}

// 現在STEPを削除します。
function deleteStep() {
  // STEPが一つだけなら削除しません。
  if (state.steps.length <= 1) {
    showToast("STEPは最低1つ必要です");
    return;
  }
  // 履歴付きでSTEPを削除します。
  commitMutation(() => {
    // 削除対象の位置を取得します。
    const activeIndex = state.steps.findIndex((step) => step.id === state.activeStepId);
    // 対象STEPを削除します。
    state.steps.splice(activeIndex, 1);
    // 隣接するSTEPを選択します。
    state.activeStepId = state.steps[Math.max(0, activeIndex - 1)].id;
  });
  // 結果を通知します。
  showToast("STEPを削除しました");
}

// 一つの動作グループを再生します。
async function animateActionGroup(group, step, playerPositions, ballState, runId) {
  // 同じ番号で同時に動かす選手移動とスクリーンを抽出します。
  const parallelPlayerActions = group.items.map(({ line }) => line).filter((line) => isMovementLineType(line.type) && !isDribbleLineType(line.type));
  // ボールを扱うパスとドリブルを描画順で抽出します。
  const ballSequenceActions = group.items.map(({ line }) => line).filter((line) => isBallSequenceLineType(line.type));
  // 選手動作とボール動作列を同時に開始します。
  await Promise.all([
    // 移動とスクリーンを同時再生します。
    animateParallelPlayerActions(parallelPlayerActions, step, playerPositions, ballState, runId),
    // パスとドリブルは同じ番号内でも描画順を守ります。
    animateBallSequenceActions(ballSequenceActions, step, playerPositions, ballState, runId)
  ]);
}

// コマ送り状態を現在STEPの開始位置で初期化します。
function initializeFramePlayback() {
  // 現在STEPの配列位置を取得します。
  const stepIndex = Math.max(0, state.steps.findIndex((step) => step.id === state.activeStepId));
  // 現在STEPを取得します。
  const step = state.steps[stepIndex];
  // 開始配置を計算します。
  const startState = calculateStepStateAfterGroups(step, 0);
  // コマ送り位置を開始へ設定します。
  framePlayback = { stepIndex, completedGroups: 0 };
  // 開始配置を再生表示へ反映します。
  updatePlaybackVisual(step, startState.players, startState.ball);
  // 開始位置を描画します。
  render();
}

// 次の動作または次のSTEPへコマ送りします。
async function stepPlaybackForward() {
  // 再生中の場合は二重操作を防ぎます。
  if (playbackTimer) {
    // 処理を終了します。
    return;
  }
  // コマ送り状態がないかSTEPが異なる場合は開始位置へ初期化します。
  if (!framePlayback || state.steps[framePlayback.stepIndex]?.id !== state.activeStepId) {
    // 現在STEPの開始位置へ初期化します。
    initializeFramePlayback();
  }
  // 現在のSTEPを取得します。
  const step = state.steps[framePlayback.stepIndex];
  // 現在STEPの動作グループを取得します。
  const groups = getOrderedActionGroups(step);
  // 現在STEPの動作が完了している場合を処理します。
  if (framePlayback.completedGroups >= groups.length) {
    // 次のSTEPがない場合は案内します。
    if (framePlayback.stepIndex >= state.steps.length - 1) {
      // 最後まで到達したことを通知します。
      showToast("最後のSTEPまで進みました");
      // 処理を終了します。
      return;
    }
    // 次のSTEP番号へ進めます。
    framePlayback = { stepIndex: framePlayback.stepIndex + 1, completedGroups: 0 };
    // 次のSTEPを取得します。
    const nextStep = state.steps[framePlayback.stepIndex];
    // 次のSTEPを選択します。
    state.activeStepId = nextStep.id;
    // 次STEPの開始配置を計算します。
    const nextState = calculateStepStateAfterGroups(nextStep, 0);
    // 次STEPの開始配置を表示します。
    updatePlaybackVisual(nextStep, nextState.players, nextState.ball);
    // 画面を同期します。
    syncInterface(false);
    // STEP移動を通知します。
    showToast(`STEP ${framePlayback.stepIndex + 1}へ進みました`);
    // 処理を終了します。
    return;
  }
  // 現在まで完了した動作後の配置を計算します。
  const currentState = calculateStepStateAfterGroups(step, framePlayback.completedGroups);
  // 選手位置を複製します。
  const playerPositions = clonePlayerPositionMap(currentState.players);
  // ボール位置を保持します。
  const ballState = { position: { ...currentState.ball } };
  // 新しい再生番号を発行します。
  playbackRunId += 1;
  // 今回の再生番号を保持します。
  const runId = playbackRunId;
  // 再生中フラグを設定します。
  playbackTimer = runId;
  // 再生ボタン表示を停止へ変更します。
  updatePlayButtonLabels("■ 停止");
  // 現在配置を表示します。
  updatePlaybackVisual(step, playerPositions, ballState.position);
  // 次の一動作グループだけを再生します。
  await animateActionGroup(groups[framePlayback.completedGroups], step, playerPositions, ballState, runId);
  // 停止されず完了した場合を処理します。
  if (playbackTimer === runId) {
    // 完了動作数を一つ進めます。
    framePlayback.completedGroups += 1;
    // 最終位置を表示したまま停止します。
    finishPlaybackAtEnd();
  }
}

// 一つ前の動作または前のSTEPへ戻します。
function stepPlaybackBackward() {
  // 再生中の場合は二重操作を防ぎます。
  if (playbackTimer) {
    // 処理を終了します。
    return;
  }
  // コマ送り状態がないかSTEPが異なる場合は開始位置へ初期化します。
  if (!framePlayback || state.steps[framePlayback.stepIndex]?.id !== state.activeStepId) {
    // 現在STEPの開始位置へ初期化します。
    initializeFramePlayback();
  }
  // 現在STEP内で一つ以上進んでいる場合を処理します。
  if (framePlayback.completedGroups > 0) {
    // 完了動作数を一つ戻します。
    framePlayback.completedGroups -= 1;
  } else if (framePlayback.stepIndex > 0) {
    // 前のSTEPへ移動します。
    framePlayback.stepIndex -= 1;
    // 前のSTEPを取得します。
    const previousStep = state.steps[framePlayback.stepIndex];
    // 前のSTEPの全動作完了位置へ設定します。
    framePlayback.completedGroups = getOrderedActionGroups(previousStep).length;
    // 前のSTEPを選択します。
    state.activeStepId = previousStep.id;
  } else {
    // 最初の位置であることを通知します。
    showToast("最初のSTEPの開始位置です");
    // 処理を終了します。
    return;
  }
  // 移動後のSTEPを取得します。
  const step = state.steps[framePlayback.stepIndex];
  // 対応する配置を計算します。
  const frameState = calculateStepStateAfterGroups(step, framePlayback.completedGroups);
  // 一つ前の配置を表示します。
  updatePlaybackVisual(step, frameState.players, frameState.ball);
  // 画面を同期します。
  syncInterface(false);
}

// STEPを順番に再生します。
async function playSteps() {
  // 既に再生中なら停止します。
  if (playbackTimer) {
    // 再生を停止します。
    stopPlayback();
    // 処理を終了します。
    return;
  }
  // コマ送り位置を解除して最初から連続再生します。
  framePlayback = null;
  // 前回再生の終点表示が残っている場合は開始位置へ戻します。
  if (playbackVisual) {
    // 前回の再生用表示位置を消します。
    playbackVisual = null;
    // 開始位置で再描画します。
    render();
  }
  // 選手移動またはパスの再生対象があるか確認します。
  const hasAnimation = state.steps.some((step) => step.lines.some((line) => line.type === "pass" || (isMovementLineType(line.type) && line.playerId)));
  // STEPが一つで再生対象もない場合は案内します。
  if (state.steps.length <= 1 && !hasAnimation) {
    // 再生条件を通知します。
    showToast("選手から動作線を描くか、ボールからパス線を描いてください");
    // 処理を終了します。
    return;
  }
  // 新しい再生番号を発行します。
  playbackRunId += 1;
  // 今回の再生番号を保持します。
  const runId = playbackRunId;
  // 再生中フラグとして番号を保存します。
  playbackTimer = runId;
  // 再生ボタン表示を変更します。
  updatePlayButtonLabels("■ 停止");
  // 全STEPを順番に再生します。
  for (let index = 0; index < state.steps.length; index += 1) {
    // 停止された場合はループを終了します。
    if (playbackTimer !== runId) {
      break;
    }
    // 再生対象STEPを取得します。
    const step = state.steps[index];
    // 対象STEPを選択します。
    state.activeStepId = step.id;
    // 画面を更新します。
    syncInterface(false);
    // STEP内の移動線に沿って選手を動かします。
    await animateStepAlongLines(step, runId);
    // 停止された場合は終了します。
    if (playbackTimer !== runId) {
      break;
    }
    // STEP間に短い間を入れます。
    await waitForPlayback(320, runId);
  }
  // 今回の再生が継続中なら終点で停止します。
  if (playbackTimer === runId) {
    // 最終STEPを取得します。
    const finalStepIndex = state.steps.length - 1;
    // 最終STEPの全動作完了位置へコマ送り状態を合わせます。
    framePlayback = { stepIndex: finalStepIndex, completedGroups: getOrderedActionGroups(state.steps[finalStepIndex]).length };
    // 最終位置を表示したまま再生状態だけ解除します。
    finishPlaybackAtEnd();
  }
}

// STEP内の動作線を設定された順番で再生します。
async function animateStepAlongLines(step, runId) {
  // 再生順ごとの動作グループを取得します。
  const groups = getOrderedActionGroups(step);
  // 再生対象がない場合は短時間表示して終えます。
  if (groups.length === 0) {
    // 待機処理を返します。
    return waitForPlayback(720, runId);
  }
  // 選手ごとの現在位置を初期化します。
  const playerPositions = {};
  // STEP開始時の全選手位置を保存します。
  step.players.forEach((player) => {
    // 選手IDごとの位置を複製します。
    playerPositions[player.id] = { x: player.x, y: player.y };
  });
  // STEP開始時のボール位置を保持します。
  const ballState = { position: { ...step.ball } };
  // 開始位置を再生表示へ反映します。
  updatePlaybackVisual(step, playerPositions, ballState.position);
  // Canvasを再描画します。
  render();
  // 再生順の小さいグループから実行します。
  for (const group of groups) {
    // 停止された場合はループを終了します。
    if (playbackTimer !== runId) {
      // 再生処理を終了します。
      break;
    }
    // 現在の動作グループを再生します。
    await animateActionGroup(group, step, playerPositions, ballState, runId);
    // 各順番の区切りを分かりやすくする短い間を入れます。
    if (playbackTimer === runId) {
      // 次の順番まで少し待ちます。
      await waitForPlayback(120, runId);
    }
  }
  // 停止されていない場合は最終位置を表示へ確定します。
  if (playbackTimer === runId) {
    // 最終選手位置とボール位置を保持します。
    updatePlaybackVisual(step, playerPositions, ballState.position);
    // 最終状態を描画します。
    render();
  }
}

// 再生用の選手とボール位置を一括更新します。
function updatePlaybackVisual(step, playerPositions, ballPosition) {
  // 現在STEPの表示位置を深く複製して保存します。
  playbackVisual = { stepId: step.id, players: clonePlayerPositionMap(playerPositions), ball: { ...ballPosition } };
}

// 同じ再生順の移動とスクリーンを同時に再生します。
async function animateParallelPlayerActions(lines, step, playerPositions, ballState, runId) {
  // 対象線がない場合は即時完了します。
  if (lines.length === 0) {
    // 処理を終了します。
    return;
  }
  // 各線のアニメーションを同時に開始して完了を待ちます。
  await Promise.all(lines.map(async (line) => {
    // 対象選手の現在位置を取得します。
    const currentPlayer = playerPositions[line.playerId];
    // 選手が存在しない場合は処理しません。
    if (!currentPlayer) {
      // この線の処理を終了します。
      return;
    }
    // 現在選手位置から描画線へつながる軌道を作ります。
    const path = buildActionPath(currentPlayer, line);
    // 軌道長に応じた選手移動時間を計算します。
    const duration = calculateActionDuration(line, path);
    // 選手を軌道に沿って移動させます。
    await animateSingleAction(path, duration, runId, (point) => {
      // 対象選手の現在位置を更新します。
      playerPositions[line.playerId] = { ...point };
      // 全選手とボールの最新位置を表示へ反映します。
      updatePlaybackVisual(step, playerPositions, ballState.position);
    });
    // 停止されていない場合は終点を確定します。
    if (playbackTimer === runId) {
      // 軌道終点を取得します。
      const end = path[path.length - 1];
      // 選手最終位置を保存します。
      playerPositions[line.playerId] = { ...end };
      // 最新位置を表示へ反映します。
      updatePlaybackVisual(step, playerPositions, ballState.position);
    }
  }));
}

// 同じSTEPのパスとドリブルを描画順に再生します。
async function animateBallSequenceActions(lines, step, playerPositions, ballState, runId) {
  // 描画順にボール動作を一つずつ処理します。
  for (const line of lines) {
    // 停止された場合は処理を終了します。
    if (playbackTimer !== runId) {
      // ループを終了します。
      break;
    }
    // パス線の場合を処理します。
    if (line.type === "pass") {
      // 現在のボール位置からパス終点への直線軌道を作ります。
      const path = buildActionPath(ballState.position, line);
      // 軌道長に応じたパス時間を計算します。
      const duration = calculateActionDuration(line, path);
      // ボールを直線に沿って移動させます。
      await animateSingleAction(path, duration, runId, (point) => {
        // ボール位置を現在フレームへ更新します。
        ballState.position = { ...point };
        // 選手位置を保持したままボール表示を更新します。
        updatePlaybackVisual(step, playerPositions, ballState.position);
      });
      // 停止されていない場合はパス終点を確定します。
      if (playbackTimer === runId) {
        // ボール最終位置を線の終点へ固定します。
        ballState.position = { ...line.end };
      }
    } else {
      // ドリブル対象選手の現在位置を取得します。
      const currentPlayer = playerPositions[line.playerId];
      // 対象選手が存在しない場合は次へ進みます。
      if (!currentPlayer) {
        // 次のボール動作へ進みます。
        continue;
      }
      // 現在選手位置から描画線へつながる軌道を作ります。
      const path = buildActionPath(currentPlayer, line);
      // 軌道長に応じたドリブル時間を計算します。
      const duration = calculateActionDuration(line, path);
      // ドリブル開始時のボール位置を保持します。
      const actionBallStart = { ...ballState.position };
      // 選手とボールを軌道に沿って移動させます。
      await animateSingleAction(path, duration, runId, (point, progress) => {
        // 対象選手の現在位置を更新します。
        playerPositions[line.playerId] = { ...point };
        // 選手横の目標ボール位置を計算します。
        const targetBall = getBallPositionBesidePlayer(point);
        // 開始位置から滑らかにボールをつなぎます。
        ballState.position = interpolatePoint(actionBallStart, targetBall, progress);
        // 全選手とボールの最新位置を表示へ反映します。
        updatePlaybackVisual(step, playerPositions, ballState.position);
      });
      // 停止されていない場合は選手とボールの終点を確定します。
      if (playbackTimer === runId) {
        // 軌道終点を取得します。
        const end = path[path.length - 1];
        // 選手最終位置を保存します。
        playerPositions[line.playerId] = { ...end };
        // ボールを選手終点の右上へ配置します。
        ballState.position = getBallPositionBesidePlayer(end);
      }
    }
    // ボール動作の間に短い間を入れます。
    if (playbackTimer === runId) {
      // 次のボール動作まで少し待ちます。
      await waitForPlayback(100, runId);
    }
  }
}

// 1つの動作を指定軌道に沿ってアニメーションします。
function animateSingleAction(path, duration, runId, onFrame) {
  // アニメーション完了を待つPromiseを返します。
  return new Promise((resolve) => {
    // 開始時刻を未設定で保持します。
    let startedAt = null;
    // 1フレーム分の処理を定義します。
    const frame = (timestamp) => {
      // 再生が停止されていたら完了します。
      if (playbackTimer !== runId) {
        // 再生用表示を消します。
        playbackVisual = null;
        // Promiseを完了します。
        resolve();
        // フレーム処理を終了します。
        return;
      }
      // 初回時刻を開始時刻として保存します。
      startedAt ??= timestamp;
      // 0から1の進行度を計算します。
      const rawProgress = Math.min(1, (timestamp - startedAt) / duration);
      // 動きが自然になるように緩急を付けます。
      const progress = easeInOut(rawProgress);
      // 軌道上の現在位置を取得します。
      const point = pointAlongPath(path, progress);
      // 呼び出し元へ現在位置と進行度を渡します。
      onFrame(point, progress);
      // Canvasを再描画します。
      render();
      // 最後まで進んだ場合は完了します。
      if (rawProgress >= 1) {
        // フレームIDを空にします。
        playbackFrame = null;
        // Promiseを完了します。
        resolve();
        // 処理を終了します。
        return;
      }
      // 次のフレームを予約します。
      playbackFrame = window.requestAnimationFrame(frame);
    };
    // 最初のフレームを予約します。
    playbackFrame = window.requestAnimationFrame(frame);
  });
}

// 動作線の種類と距離から再生時間を計算します。
function calculateActionDuration(line, path) {
  // 軌道長を計算します。
  const length = pathLength(path);
  // 現在の移動速度を取得します。
  const speed = normalizeSpeed(state.movementSpeed);
  // パスは選手移動より速く再生します。
  if (line.type === "pass") {
    // パス時間を速度設定で調整して返します。
    return Math.max(220, Math.min(2600, Math.max(450, Math.min(1300, length * 1.7)) / speed));
  }
  // 選手移動時間を速度設定で調整して返します。
  return Math.max(350, Math.min(4800, Math.max(700, Math.min(2400, length * 3.2)) / speed));
}

// 点列上の指定進行度の座標を返します。
function pointAlongPath(points, progress) {
  // 点列が不足している場合は先頭点を返します。
  if (!points || points.length < 2) {
    return points?.[0] ?? { x: 0, y: 0 };
  }
  // 全体長を計算します。
  const total = pathLength(points);
  // 全体長がない場合は終点を返します。
  if (total <= 0) {
    return { ...points[points.length - 1] };
  }
  // 目標距離を計算します。
  const target = total * Math.max(0, Math.min(1, progress));
  // 累積距離を初期化します。
  let accumulated = 0;
  // 各線分を順番に確認します。
  for (let index = 1; index < points.length; index += 1) {
    // 線分開始点を取得します。
    const start = points[index - 1];
    // 線分終了点を取得します。
    const end = points[index];
    // 線分長を計算します。
    const segment = distance(start, end);
    // 目標距離がこの線分内なら補間します。
    if (accumulated + segment >= target) {
      // 線分内の進行率を計算します。
      const ratio = segment <= 0 ? 0 : (target - accumulated) / segment;
      // 補間した座標を返します。
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    // 累積距離を更新します。
    accumulated += segment;
  }
  // 誤差対策として最終点を返します。
  return { ...points[points.length - 1] };
}

// 再生の加減速カーブを返します。
function easeInOut(value) {
  // 前半は加速、後半は減速する三次曲線を返します。
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

// 再生状態を確認しながら指定時間待ちます。
function waitForPlayback(milliseconds, runId) {
  // 連続再生速度に応じた実待機時間を計算します。
  const adjustedMilliseconds = milliseconds / normalizeSpeed(state.playbackSpeed);
  // 待機完了を返すPromiseを作ります。
  return new Promise((resolve) => {
    // 一定間隔で再生状態を確認します。
    const startedAt = performance.now();
    // 確認処理を定義します。
    const check = () => {
      // 再生が停止されたら即座に完了します。
      if (playbackTimer !== runId) {
        resolve();
        return;
      }
      // 指定時間を超えたら完了します。
      if (performance.now() - startedAt >= adjustedMilliseconds) {
        resolve();
        return;
      }
      // 次のフレームで再確認します。
      window.requestAnimationFrame(check);
    };
    // 待機確認を開始します。
    window.requestAnimationFrame(check);
  });
}

// 再生終了時に最終位置を表示したまま停止します。
function finishPlaybackAtEnd() {
  // 再生番号を更新して今回の処理を終了扱いにします。
  playbackRunId += 1;
  // 再生中フラグを空にします。
  playbackTimer = null;
  // アニメーションフレームが残っている場合は解除します。
  if (playbackFrame) {
    // 予約フレームを解除します。
    window.cancelAnimationFrame(playbackFrame);
  }
  // フレームIDを空にします。
  playbackFrame = null;
  // 再生ボタン表示を戻します。
  updatePlayButtonLabels("▶ 再生");
  // 最終位置を保持した状態で再描画します。
  render();
}

// 再生終了後の表示位置を解除します。
function clearPlaybackPreview() {
  // 再生中の場合は表示を変更しません。
  if (playbackTimer) {
    // 処理を終了します。
    return;
  }
  // コマ送り位置を解除します。
  framePlayback = null;
  // 終点表示がない場合はここで終了します。
  if (!playbackVisual) {
    // 処理を終了します。
    return;
  }
  // 再生用表示位置を消します。
  playbackVisual = null;
  // 保存されている開始位置で再描画します。
  render();
}

// STEP再生を停止します。
function stopPlayback(showMessage = true) {
  // 再生番号を更新して進行中処理を無効化します。
  playbackRunId += 1;
  // 再生中フラグを空にします。
  playbackTimer = null;
  // アニメーションフレームがある場合は解除します。
  if (playbackFrame) {
    // 予約フレームを解除します。
    window.cancelAnimationFrame(playbackFrame);
  }
  // フレームIDを空にします。
  playbackFrame = null;
  // 再生用表示位置を消します。
  playbackVisual = null;
  // コマ送り位置を解除します。
  framePlayback = null;
  // 再生ボタン表示を戻します。
  updatePlayButtonLabels("▶ 再生");
  // 通常の保存位置で再描画します。
  render();
  // 手動停止時だけ通知します。
  if (showMessage) {
    // 停止結果を通知します。
    showToast("再生を停止しました");
  }
}

// 現在STEPの線をすべて消します。
function clearLines() {
  // 線がない場合は終了します。
  if (getActiveStep().lines.length === 0) {
    return;
  }
  // 履歴付きですべての線を消します。
  commitMutation(() => {
    // 線配列を空にします。
    getActiveStep().lines = [];
  });
  // 結果を通知します。
  showToast("現在STEPの線を消しました");
}

// 作戦全体を初期状態へ戻します。
function resetBoard() {
  // 確認ダイアログでキャンセルされた場合は終了します。
  if (!window.confirm("現在の作戦を初期化します。よろしいですか？")) {
    return;
  }
  // 変更前状態を履歴へ保存します。
  pushUndo();
  // 初期状態を作ります。
  const fresh = createInitialState();
  // 選択中ツールは維持します。
  fresh.activeTool = state.activeTool;
  // 状態を置き換えます。
  state = fresh;
  // 作戦名入力欄を同期します。
  playNameInput.value = state.playName;
  // 画面を同期します。
  syncInterface();
  // 全面から半面へ戻った場合もCanvasの比率と変換情報を即時再計算します。
  resizeCanvas();
  // 結果を通知します。
  showToast("初期状態へ戻しました");
}

// 現在作戦をPNGへ出力します。
function exportPng() {
  // CanvasをPNGデータへ変換します。
  const dataUrl = canvas.toDataURL("image/png");
  // ダウンロード用リンクを作ります。
  const link = document.createElement("a");
  // ファイル名に使えない文字を置換します。
  const safeName = (state.playName || "basketball-play").replace(/[\\/:*?"<>|]/g, "_");
  // ファイル名を設定します。
  link.download = `${safeName}.png`;
  // PNGデータをリンクへ設定します。
  link.href = dataUrl;
  // ダウンロードを開始します。
  link.click();
  // 結果を通知します。
  showToast("PNGを書き出しました");
}

// 現在作戦をJSONファイルへ書き出します。
function exportJson() {
  // 作戦名を最新入力値へ同期します。
  state.playName = playNameInput.value.trim() || "名称未設定の作戦";
  // 他ブラウザーで読み込めるデータ形式を作ります。
  const payload = {
    // ファイル形式を識別する名前です。
    format: "basketball-tactics-board",
    // 書出し形式のバージョンです。
    exportVersion: 1,
    // 書出し日時を記録します。
    exportedAt: new Date().toISOString(),
    // 作戦本体を保存します。
    snapshot: createSnapshot()
  };
  // JSON文字列を読みやすく整形します。
  const text = JSON.stringify(payload, null, 2);
  // JSONファイル用のBlobを作ります。
  const blob = new Blob([text], { type: "application/json" });
  // 一時URLを作ります。
  const url = URL.createObjectURL(blob);
  // ダウンロード用リンクを作ります。
  const link = document.createElement("a");
  // ファイル名に使えない文字を置換します。
  const safeName = state.playName.replace(/[\/:*?"<>|]/g, "_");
  // JSONファイル名を設定します。
  link.download = `${safeName}.json`;
  // 一時URLをリンクへ設定します。
  link.href = url;
  // ダウンロードを開始します。
  link.click();
  // 使用済み一時URLを解放します。
  URL.revokeObjectURL(url);
  // 結果を通知します。
  showToast("JSONを書き出しました");
}

// 選択されたJSONファイルを読み込みます。
async function importJson(event) {
  // 選択されたファイルを取得します。
  const file = event.target.files?.[0];
  // ファイルがない場合は終了します。
  if (!file) {
    return;
  }
  try {
    // ファイル内容を文字列で読み込みます。
    const text = await file.text();
    // JSONへ変換します。
    const parsed = JSON.parse(text);
    // 書出し形式と直接スナップショット形式の両方に対応します。
    const snapshot = parsed?.snapshot ?? parsed;
    // STEP配列がないデータは不正として扱います。
    if (!Array.isArray(snapshot?.steps) || snapshot.steps.length === 0) {
      throw new Error("STEPデータがありません");
    }
    // 読込前の状態を元に戻せるよう保存します。
    pushUndo();
    // 読み込んだ作戦を状態へ適用します。
    applySnapshot(snapshot);
    // 以前の再生表示を解除します。
    playbackVisual = null;
    // Canvasサイズを再計算します。
    resizeCanvas();
    // 結果を通知します。
    showToast(`「${state.playName}」をJSONから読み込みました`);
  } catch (error) {
    // 読込失敗をコンソールへ記録します。
    console.error("JSON読込に失敗しました。", error);
    // 利用者へエラーを通知します。
    window.alert("JSONを読み込めませんでした。作戦ボードから書き出したJSONか確認してください。");
  } finally {
    // 同じファイルを再選択できるよう入力値を消します。
    importJsonInput.value = "";
  }
}

// フォルダ保存用APIの基準パスを定義します。
const DATA_FOLDER_API = "/api/tactics";

// START_APP.bat経由のフォルダ連携モードか判定します。
function isDataFolderMode() {
  // START_APP.batが起動するローカルホストだけをフォルダAPIとして扱います。
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

// GitHub Pagesなど、ローカルサーバーではない公開Webページか判定します。
function isHostedWebApp() {
  return /^https?:$/.test(window.location.protocol) && !isDataFolderMode();
}

// OneDrive設定ダイアログを表示します。
function openOneDriveSettings() {
  updateOneDriveInterface();
  if (!oneDriveDialog.open) oneDriveDialog.showModal();
}

// OneDriveの接続状態を画面へ反映します。
function updateOneDriveInterface(nextStatus = window.OneDriveStorage?.status?.() || {}) {
  const configured = Boolean(nextStatus.configured);
  const connected = Boolean(nextStatus.connected);
  const errorMessage = String(nextStatus.error || "");
  const accountLabel = nextStatus.name || nextStatus.username || "Microsoftアカウント";

  if (oneDriveClientIdInput && document.activeElement !== oneDriveClientIdInput) {
    oneDriveClientIdInput.value = nextStatus.clientId || "";
  }
  if (oneDriveRedirectUriInput) {
    oneDriveRedirectUriInput.value = nextStatus.redirectUri || window.OneDriveStorage?.redirectUri?.() || "";
  }

  oneDriveConnectionCard?.classList.toggle("connected", connected);
  oneDriveConnectionCard?.classList.toggle("error", Boolean(errorMessage));
  if (connected) {
    oneDriveConnectionTitle.textContent = "OneDriveへ接続済み";
    oneDriveConnectionDetail.textContent = `${accountLabel} の専用アプリフォルダへ保存します。`;
  } else if (errorMessage) {
    oneDriveConnectionTitle.textContent = "接続を確認してください";
    oneDriveConnectionDetail.textContent = errorMessage;
  } else if (configured) {
    oneDriveConnectionTitle.textContent = "Microsoftアカウントへ接続してください";
    oneDriveConnectionDetail.textContent = "接続後、PCとiPadで同じ作戦ライブラリを利用できます。";
  } else {
    oneDriveConnectionTitle.textContent = "初期設定が必要です";
    oneDriveConnectionDetail.textContent = "Microsoft EntraのクライアントIDを設定してください。";
  }

  if (oneDriveButton) {
    oneDriveButton.textContent = connected ? "☁ OneDrive接続中" : configured ? "OneDrive接続" : "OneDrive設定";
    oneDriveButton.classList.toggle("connected", connected);
  }
  if (connectOneDriveButton) {
    connectOneDriveButton.disabled = connected || !configured;
    connectOneDriveButton.textContent = connected ? "接続済み" : "Microsoftアカウントで接続";
  }
  if (disconnectOneDriveButton) disconnectOneDriveButton.hidden = !connected;
  if (folderModeMessage) {
    folderModeMessage.textContent = connected
      ? `個人用OneDriveへ接続中：${accountLabel}`
      : configured
        ? "OneDriveへ接続すると、すべての端末で同じ作戦を開けます。"
        : "OneDrive保存を使うには初回設定を完了してください。";
  }
}

// JSON書出しとフォルダ保存で共通利用するデータを作ります。
function createExportPayload() {
  // 作戦名を最新入力値へ同期します。
  state.playName = playNameInput.value.trim() || "名称未設定の作戦";
  // 他PCでも読み込める形式を返します。
  return {
    // ファイル形式を識別する名前です。
    format: "basketball-tactics-board",
    // 書出し形式のバージョンです。
    exportVersion: 1,
    // 保存日時を記録します。
    exportedAt: new Date().toISOString(),
    // 作戦本体を保存します。
    snapshot: createSnapshot()
  };
}

// フォルダAPIへ通信し、JSON応答を取得します。
async function requestFolderApi(path, options = {}) {
  // APIへ通信します。
  const response = await fetch(`${DATA_FOLDER_API}${path}`, options);
  // 応答本文をJSONとして読み込みます。
  const result = await response.json().catch(() => ({}));
  // HTTPエラーまたはAPIエラーの場合は例外にします。
  if (!response.ok || result.success === false) {
    // サーバー側メッセージがあれば利用します。
    throw new Error(result.message || `フォルダAPIエラー: ${response.status}`);
  }
  // 正常な応答を返します。
  return result;
}

// 現在作戦を2_Play_Dataへ保存します。
async function savePlayToLibrary() {
  // 入力欄から作戦名を取得します。
  const name = playNameInput.value.trim() || "名称未設定の作戦";
  // 状態へ作戦名を反映します。
  state.playName = name;
  // ライブラリ管理情報を入力欄から反映します。
  state.libraryMeta = {
    folder: playFolderInput?.value || "Shared",
    tags: String(playTagsInput?.value || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    favorite: Boolean(playFavoriteInput?.checked)
  };
  // OneDriveが設定済みの場合は、端末共通の専用フォルダへ保存します。
  if (window.OneDriveStorage?.isConfigured()) {
    if (!window.OneDriveStorage.isConnected()) {
      autosave();
      openOneDriveSettings();
      showToast("OneDriveへ接続してから、もう一度保存してください");
      return;
    }
    try {
      const payload = createExportPayload();
      const result = await window.OneDriveStorage.save(state.libraryMeta.folder, name, payload);
      autosave();
      showToast(`OneDriveへ保存しました：${result.relativePath}`);
      return;
    } catch (error) {
      console.error("OneDriveへの保存に失敗しました。", error);
      window.alert("OneDriveへ保存できませんでした。\n\n" + error.message);
      return;
    }
  }
  // 公開Web版では、未設定のまま端末内保存へ切り替えず設定画面を案内します。
  if (isHostedWebApp()) {
    autosave();
    openOneDriveSettings();
    showToast("OneDriveの初期設定を完了してください");
    return;
  }
  // ブラウザーで選択したフォルダへ直接保存します。
  if (!isDataFolderMode() && window.PlayFolderAccess?.hasHandle()) {
    try {
      const payload = createExportPayload();
      const relativePath = await window.PlayFolderAccess.save(state.libraryMeta.folder, name, payload);
      autosave();
      showToast(`選択フォルダへ保存しました：${relativePath}`);
      return;
    } catch (error) {
      console.error("選択フォルダへの保存に失敗しました。", error);
      window.alert("選択フォルダへ保存できませんでした。\n\n" + error.message);
      return;
    }
  }
  // START_APP.bat経由でない場合は従来のブラウザー保存を使います。
  if (!isDataFolderMode()) {
    // 従来のローカル保存を実行します。
    savePlayToLocalLibrary();
    // 処理を終了します。
    return;
  }
  try {
    // 保存用データを作ります。
    const payload = createExportPayload();
    // フォルダ保存APIへ作戦を送ります。
    const result = await requestFolderApi("/save", {
      // 保存処理なのでPOSTを使います。
      method: "POST",
      // JSON本文であることを指定します。
      headers: { "Content-Type": "application/json" },
      // 作戦名と保存データを送ります。
      body: JSON.stringify({ name, folder: state.libraryMeta.folder, data: payload })
    });
    // 自動保存も更新します。
    autosave();
    // 保存先を通知します。
    showToast(`2_Play_Dataへ保存しました：${result.relativePath || `${name}.json`}`);
  } catch (error) {
    // エラー内容を記録します。
    console.error("2_Play_Dataへの保存に失敗しました。", error);
    // 起動方法を含めて利用者へ案内します。
    window.alert("2_Play_Dataへ保存できませんでした。START_APP.batから起動しているか確認してください。\n\n" + error.message);
  }
}

// HTMLを直接開いた場合に従来のブラウザー保存を実行します。
function savePlayToLocalLibrary() {
  // 入力欄から作戦名を取得します。
  const name = playNameInput.value.trim() || "名称未設定の作戦";
  // 状態へ作戦名を反映します。
  state.playName = name;
  // 既存ライブラリを取得します。
  const library = readLocalLibrary();
  // 同名作戦の位置を探します。
  const existingIndex = library.findIndex((item) => item.name === name);
  // 保存データを作ります。
  const item = {
    // 既存IDまたは新規IDを設定します。
    id: existingIndex >= 0 ? library[existingIndex].id : makeId("play"),
    // 作戦名を設定します。
    name,
    // 更新日時を設定します。
    updatedAt: new Date().toISOString(),
    // 作戦本体を設定します。
    snapshot: createSnapshot(),
    // 保存元を識別します。
    source: "local"
  };
  // 同名作戦がある場合は上書きします。
  if (existingIndex >= 0) {
    // 対象位置を新しいデータへ差し替えます。
    library.splice(existingIndex, 1, item);
  } else {
    // 新規作戦の場合は先頭へ追加します。
    library.unshift(item);
  }
  // ライブラリをブラウザーへ保存します。
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  // 自動保存も更新します。
  autosave();
  // 結果を通知します。
  showToast(existingIndex >= 0 ? "ブラウザー内の同名作戦を上書きしました" : "ブラウザー内へ保存しました");
}

// ブラウザー内の保存済み作戦を読み込みます。
function readLocalLibrary() {
  // 保存文字列を取得します。
  const raw = localStorage.getItem(LIBRARY_KEY);
  // 保存がない場合は空配列を返します。
  if (!raw) {
    // 空配列を返します。
    return [];
  }
  try {
    // JSONへ変換し、保存元情報を補って返します。
    return JSON.parse(raw).map((item) => ({ ...item, source: "local" }));
  } catch (error) {
    // 変換失敗を記録します。
    console.error("ブラウザー保存の読込に失敗しました。", error);
    // 安全のため空配列を返します。
    return [];
  }
}

// 保存済み作戦一覧を表示します。
async function openLibrary() {
  // 公開版でOneDrive未接続の場合は、先に接続設定を案内します。
  if ((isHostedWebApp() || window.OneDriveStorage?.isConfigured()) && !window.OneDriveStorage?.isConnected()) {
    openOneDriveSettings();
    return;
  }
  // 先にダイアログを開きます。
  libraryDialog.showModal();
  // 最新のフォルダ内容を読み込みます。
  await renderLibrary();
}

// 保存済み作戦一覧を取得します。
async function readLibrary() {
  // OneDrive設定済みの場合は、どの端末でも共通のライブラリを取得します。
  if (window.OneDriveStorage?.isConfigured()) {
    if (!window.OneDriveStorage.isConnected()) {
      throw new Error("OneDriveへ接続してください。");
    }
    return await window.OneDriveStorage.list();
  }
  // 公開Web版はOneDrive設定が完了するまでライブラリを表示しません。
  if (isHostedWebApp()) {
    throw new Error("OneDriveの初期設定を完了してください。");
  }
  // フォルダ連携モードの場合は2_Play_Dataを読み込みます。
  if (isDataFolderMode()) {
    // サーバーから一覧を取得します。
    const result = await requestFolderApi("/list");
    // フォルダ保存元を付けて返します。
    return (result.items || []).map((item) => ({ ...item, source: "folder" }));
  }
  // 選択済みブラウザーフォルダがある場合はそこを読み込みます。
  if (window.PlayFolderAccess?.hasHandle()) {
    return await window.PlayFolderAccess.list();
  }
  // 直接起動時はブラウザー保存を返します。
  return readLocalLibrary();
}

// 保存済み作戦一覧を描画します。
async function renderLibrary() {
  // 既存表示を消します。
  libraryList.innerHTML = "";
  // 読込中表示を作ります。
  const loading = document.createElement("div");
  // 読込中表示のクラスを設定します。
  loading.className = "empty-state";
  // 読込中の案内文を設定します。
  loading.textContent = window.OneDriveStorage?.isConnected()
    ? "OneDriveの作戦を確認しています…"
    : isDataFolderMode()
      ? "2_Play_Dataを確認しています…"
      : "保存済み作戦を確認しています…";
  // 一覧へ追加します。
  libraryList.appendChild(loading);
  try {
    // 保存済み作戦を取得します。
    const library = await readLibrary();
    // 読込中表示を消します。
    libraryList.innerHTML = "";
    // 最新一覧を保持します。
    lastLibraryItems = library;
    // 検索条件を適用します。
    const query = String(librarySearchInput?.value || "").trim().toLowerCase();
    const folderFilter = String(libraryFolderFilter?.value || "");
    const favoriteOnly = Boolean(libraryFavoriteOnly?.checked);
    const filteredLibrary = library.filter((item) => {
      const haystack = `${item.name || ""} ${item.relativePath || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!folderFilter || String(item.relativePath || "").startsWith(folderFilter)) && (!favoriteOnly || item.favorite === true);
    });
    // 保存作戦がない場合を処理します。
    if (filteredLibrary.length === 0) {
      // 空表示要素を作ります。
      const empty = document.createElement("div");
      // クラスを設定します。
      empty.className = "empty-state";
      // 案内文を設定します。
      empty.textContent = window.OneDriveStorage?.isConnected()
        ? "OneDriveに保存済み作戦はありません。"
        : isDataFolderMode()
          ? "2_Play_DataにJSONファイルがありません。"
          : "ブラウザー内に保存済み作戦はありません。";
      // 一覧へ追加します。
      libraryList.appendChild(empty);
      // 処理を終了します。
      return;
    }
    // 各保存作戦を表示します。
    filteredLibrary.forEach((item) => {
      // 1件分のカードを作ります。
      const row = document.createElement("div");
      // カードのクラスを設定します。
      row.className = "library-item";
      // 作戦情報領域を作ります。
      const info = document.createElement("div");
      // 作戦名要素を作ります。
      const title = document.createElement("h3");
      // 作戦名を設定します。
      title.textContent = item.name || "名称未設定の作戦";
      // お気に入り表示を作戦名へ加えます。
      if (item.favorite) title.textContent = `★ ${title.textContent}`;
      // タグ表示を作ります。
      const tags = document.createElement("p");
      tags.className = "library-tags";
      tags.textContent = (item.tags || []).map((tag) => `#${tag}`).join(" ");
      // 保存場所要素を作ります。
      const path = document.createElement("p");
      // 保存元に応じた場所を表示します。
      path.textContent = item.source === "onedrive"
        ? `OneDrive / ${item.relativePath}`
        : item.source === "folder"
          ? `2_Play_Data\\${item.relativePath}`
          : item.source === "browser-folder"
            ? item.relativePath
            : "ブラウザー内保存";
      // 更新日時要素を作ります。
      const date = document.createElement("p");
      // 有効な更新日時を表示します。
      date.textContent = item.updatedAt ? new Date(item.updatedAt).toLocaleString("ja-JP") : "更新日時不明";
      // 情報領域へ作戦名を追加します。
      info.appendChild(title);
      // 情報領域へタグを追加します。
      if (tags.textContent) info.appendChild(tags);
      // 情報領域へ保存場所を追加します。
      info.appendChild(path);
      // 情報領域へ日時を追加します。
      info.appendChild(date);
      // 操作領域を作ります。
      const actions = document.createElement("div");
      // 操作領域のクラスを設定します。
      actions.className = "library-item-actions";
      // 読込ボタンを作ります。
      const loadButton = document.createElement("button");
      // ボタン種別を設定します。
      loadButton.type = "button";
      // ボタンのクラスを設定します。
      loadButton.className = "button primary compact";
      // ボタン文字を設定します。
      loadButton.textContent = "開く";
      // 読込処理を登録します。
      loadButton.addEventListener("click", () => loadLibraryItem(item));
      // 削除ボタンを作ります。
      const deleteButton = document.createElement("button");
      // ボタン種別を設定します。
      deleteButton.type = "button";
      // ボタンのクラスを設定します。
      deleteButton.className = "button danger compact";
      // ボタン文字を設定します。
      deleteButton.textContent = "削除";
      // 削除処理を登録します。
      deleteButton.addEventListener("click", () => deleteLibraryItem(item));
      // 操作領域へ読込ボタンを追加します。
      actions.appendChild(loadButton);
      // 操作領域へ削除ボタンを追加します。
      actions.appendChild(deleteButton);
      // カードへ情報領域を追加します。
      row.appendChild(info);
      // カードへ操作領域を追加します。
      row.appendChild(actions);
      // 一覧へカードを追加します。
      libraryList.appendChild(row);
    });
  } catch (error) {
    // エラー内容を記録します。
    console.error("保存済み作戦一覧の読込に失敗しました。", error);
    // 一覧を消します。
    libraryList.innerHTML = "";
    // エラー表示要素を作ります。
    const errorPanel = document.createElement("div");
    // クラスを設定します。
    errorPanel.className = "empty-state";
    // 現在の保存方式に合った案内を表示します。
    errorPanel.textContent = error.message || "保存済み作戦を読み込めませんでした。";
    // 一覧へ追加します。
    libraryList.appendChild(errorPanel);
  }
}

// 保存済み作戦を開きます。
async function loadLibraryItem(item) {
  try {
    // 読込対象のスナップショットを保持します。
    let snapshot = item.snapshot;
    // フォルダ保存データの場合はAPIからJSON本体を取得します。
    if (item.source === "onedrive") {
      const result = await window.OneDriveStorage.load(item);
      snapshot = result?.snapshot ?? result;
    } else if (item.source === "folder") {
      const result = await requestFolderApi(`/load?file=${encodeURIComponent(item.relativePath)}`);
      snapshot = result.data?.snapshot ?? result.data;
    } else if (item.source === "browser-folder") {
      const result = await window.PlayFolderAccess.load(item);
      snapshot = result?.snapshot ?? result;
    }
    // STEP配列がないデータは不正として扱います。
    if (!Array.isArray(snapshot?.steps) || snapshot.steps.length === 0) {
      // 不正データとして例外にします。
      throw new Error("STEPデータがありません");
    }
    // 現在状態を履歴へ保存します。
    pushUndo();
    // 保存スナップショットを適用します。
    applySnapshot(snapshot);
    // ダイアログを閉じます。
    libraryDialog.close();
    // Canvasサイズを再計算します。
    resizeCanvas();
    // 結果を通知します。
    showToast(`「${item.name}」を開きました`);
  } catch (error) {
    // エラー内容を記録します。
    console.error("保存済み作戦を開けませんでした。", error);
    // 利用者へ通知します。
    window.alert("作戦データを開けませんでした。JSONファイルの内容を確認してください。\n\n" + error.message);
  }
}

// 保存済み作戦を削除します。
async function deleteLibraryItem(item) {
  // 削除確認でキャンセルされた場合は終了します。
  if (!window.confirm(`「${item.name}」を削除しますか？`)) {
    // 処理を終了します。
    return;
  }
  try {
    // フォルダ保存データの場合はAPIから削除します。
    if (item.source === "onedrive") {
      await window.OneDriveStorage.remove(item);
    } else if (item.source === "browser-folder") {
      await window.PlayFolderAccess.remove(item);
    } else if (item.source === "folder") {
      // 相対パスを指定して削除します。
      await requestFolderApi("/delete", {
        // 削除操作をPOSTで送ります。
        method: "POST",
        // JSON本文であることを指定します。
        headers: { "Content-Type": "application/json" },
        // 対象ファイルを送ります。
        body: JSON.stringify({ file: item.relativePath })
      });
    } else {
      // 対象以外を残します。
      const nextLibrary = readLocalLibrary().filter((savedItem) => savedItem.id !== item.id);
      // 更新した一覧をブラウザーへ保存します。
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(nextLibrary));
    }
    // 一覧を再描画します。
    await renderLibrary();
    // 結果を通知します。
    showToast("保存済み作戦を削除しました");
  } catch (error) {
    // エラー内容を記録します。
    console.error("保存済み作戦を削除できませんでした。", error);
    // 利用者へ通知します。
    window.alert("作戦データを削除できませんでした。\n\n" + error.message);
  }
}

// 作業中状態を自動保存します。
function autosave() {
  // 現在スナップショットを保存します。
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(createSnapshot()));
}

// 旧版の未編集初期配置が自動保存されているか確認します。
function isLegacyDefaultAutosave(snapshot) {
  // v23以前の半面・1STEP・新規作戦だけを移行対象にします。
  if (Number(snapshot?.schemaVersion ?? 1) > 11 || snapshot?.playName !== "新しい作戦" || snapshot?.courtMode !== "half" || snapshot?.steps?.length !== 1) {
    return false;
  }
  // 初期STEP以外の編集内容がある場合は利用者の作戦として維持します。
  const step = snapshot.steps[0];
  if (String(step?.note ?? "").trim() || (step?.lines?.length ?? 0) > 0 || (step?.cones?.length ?? 0) > 0 || (step?.texts?.length ?? 0) > 0) {
    return false;
  }
  // v22までの初期選手配置を定義します。
  const expectedPlayers = [
    ["o1", "offense", 0.5, 0.78],
    ["o2", "offense", 0.24, 0.65],
    ["o3", "offense", 0.76, 0.65],
    ["o4", "offense", 0.35, 0.36],
    ["o5", "offense", 0.65, 0.36],
    ["d1", "defense", 0.5, 0.66],
    ["d2", "defense", 0.27, 0.54],
    ["d3", "defense", 0.73, 0.54],
    ["d4", "defense", 0.39, 0.27],
    ["d5", "defense", 0.61, 0.27]
  ];
  // 選手数と各選手のID・陣営・初期座標がすべて一致する場合だけ初期配置と判定します。
  const players = Array.isArray(step.players) ? step.players : [];
  return players.length === expectedPlayers.length && expectedPlayers.every(([id, side, xRatio, yRatio]) => players.some((player) => (
    player.id === id
    && player.side === side
    && Math.abs(Number(player.x) - HALF_COURT.width * xRatio) < 1
    && Math.abs(Number(player.y) - HALF_COURT.height * yRatio) < 1
  )));
}

// 自動保存状態を復元します。
function restoreAutosave() {
  // 自動保存文字列を取得します。
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  // 自動保存がない場合は終了します。
  if (!raw) {
    return;
  }
  // JSON変換を試します。
  try {
    // スナップショットを取得します。
    const snapshot = JSON.parse(raw);
    // v22までの未編集初期配置なら、新しい初期仕様に合わせてディフェンスだけを外します。
    if (isLegacyDefaultAutosave(snapshot)) {
      snapshot.steps[0].players = snapshot.steps[0].players.filter((player) => player.side !== "defense");
    }
    // STEPデータがある場合だけ適用します。
    if (Array.isArray(snapshot.steps) && snapshot.steps.length > 0) {
      // 状態へ適用します。
      applySnapshot(snapshot);
    }
  } catch (error) {
    // 復元失敗をコンソールへ記録します。
    console.error("自動保存の復元に失敗しました。", error);
  }
}

// 画面要素を状態へ同期します。
function syncInterface(save = true) {
  // 作戦名入力欄を同期します。
  if (playNameInput.value !== state.playName && document.activeElement !== playNameInput) {
    playNameInput.value = state.playName;
  }
  // 半面ボタン状態を同期します。
  document.getElementById("halfCourtButton").classList.toggle("active", state.courtMode === "half");
  // 全面ボタン状態を同期します。
  document.getElementById("fullCourtButton").classList.toggle("active", state.courtMode === "full");
  // STEP一覧を更新します。
  renderStepList();
  // 最大表示用STEP一覧を更新します。
  renderFocusStepList();
  // 現在STEPの選手番号ボタンを更新します。
  renderPlayerNumberGrids();
  // 現在STEPのコーン数を更新します。
  renderConeCounts();
  // 現在STEPの動作順一覧を更新します。
  renderActionOrderList();
  // 移動線表示スイッチを同期します。
  showMovementLinesToggle.checked = state.showMovementLines;
  // 最大表示中の表示切替を薄いアイコンを含めて同期します。
  syncFocusVisibility();
  // 色ボタンを選択状態へ同期します。
  setLineColor(state.activeLineColor);
  // 移動速度設定を同期します。
  movementSpeedRange.value = String(normalizeSpeed(state.movementSpeed));
  // 移動速度の数値を同期します。
  movementSpeedValue.textContent = `${normalizeSpeed(state.movementSpeed).toFixed(2)}×`;
  // 連続再生速度設定を同期します。
  playbackSpeedRange.value = String(normalizeSpeed(state.playbackSpeed));
  // 連続再生速度の数値を同期します。
  playbackSpeedValue.textContent = `${normalizeSpeed(state.playbackSpeed).toFixed(2)}×`;
  // 選手サイズボタンを選択状態へ同期します。
  document.querySelectorAll("[data-player-size]").forEach((button) => {
    // 現在サイズと一致するボタンだけactiveにします。
    button.classList.toggle("active", button.dataset.playerSize === normalizePlayerSize(state.playerSize));
  });
  // 現在STEPを取得します。
  const step = getActiveStep();
  // メモ入力欄を同期します。
  stepNoteInput.value = step?.note ?? "";
  // STEP削除ボタンを制御します。
  document.getElementById("deleteStepButton").disabled = state.steps.length <= 1;
  // 履歴ボタンを更新します。
  updateHistoryButtons();
  // Canvasを再描画します。
  render();
  // 指定されている場合は自動保存します。
  if (save) {
    autosave();
  }
}

// 履歴ボタンの有効状態を更新します。
function updateHistoryButtons() {
  // 元に戻す操作が無効か判定します。
  const undoDisabled = undoStack.length === 0;
  // やり直し操作が無効か判定します。
  const redoDisabled = redoStack.length === 0;
  // 通常表示の元に戻すボタンを切り替えます。
  document.getElementById("undoButton").disabled = undoDisabled;
  // 通常表示のやり直しボタンを切り替えます。
  document.getElementById("redoButton").disabled = redoDisabled;
  // 最大表示の元に戻すボタンを切り替えます。
  focusUndoButton.disabled = undoDisabled;
  // 最大表示のやり直しボタンを切り替えます。
  focusRedoButton.disabled = redoDisabled;
}

// 一時メッセージを表示します。
function showToast(message) {
  // 既存タイマーを解除します。
  window.clearTimeout(toastTimer);
  // メッセージを設定します。
  toast.textContent = message;
  // 表示クラスを付けます。
  toast.classList.add("show");
  // 一定時間後に非表示にします。
  toastTimer = window.setTimeout(() => {
    // 表示クラスを外します。
    toast.classList.remove("show");
  }, 1900);
}

// キーボード操作を処理します。
function handleKeyDown(event) {
  // 入力欄操作中かどうかを判定します。
  const isTyping = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
  // 入力中は数字キーによるツール切替を行いません。
  if (!isTyping) {
    // 数字キーとツールの対応を定義します。
    const keyMap = { "1": "select", "2": "move", "3": "pass", "4": "dribbleFree", "5": "dribbleStraight", "6": "screenFree", "7": "screenStraight", "8": "free", "9": "erase", "0": "text" };
    // 対応ツールがある場合は切り替えます。
    if (keyMap[event.key]) {
      // ツールを切り替えます。
      setTool(keyMap[event.key]);
    }
  }
  // CtrlまたはCommandとZで元に戻します。
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
    // ブラウザー標準動作を止めます。
    event.preventDefault();
    // 元に戻します。
    undo();
  }
  // CtrlまたはCommandとYでやり直します。
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    // ブラウザー標準動作を止めます。
    event.preventDefault();
    // やり直します。
    redo();
  }
}

// ツールボタンへイベントを登録します。
document.querySelectorAll("[data-tool]").forEach((button) => {
  // クリック時に対応ツールへ切り替えます。
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

// 線色ボタンへイベントを登録します。
document.querySelectorAll("[data-line-color]").forEach((button) => {
  // クリック時に対応色へ切り替えます。
  button.addEventListener("click", () => setLineColor(button.dataset.lineColor));
});

// 選手サイズボタンへイベントを登録します。
document.querySelectorAll("[data-player-size]").forEach((button) => {
  // クリック時に対応する選手サイズへ切り替えます。
  button.addEventListener("click", () => setPlayerSize(button.dataset.playerSize));
});

// 簡易人数の増減ボタンへイベントを登録します。
document.querySelectorAll("[data-player-count-change]").forEach((button) => {
  button.addEventListener("click", () => {
    adjustPlayerCount(button.dataset.playerCountSide, Number(button.dataset.playerCountChange));
  });
});

// 全番号選択欄の開閉ボタンを登録します。
playerNumberDetailsToggle.addEventListener("click", () => {
  setPlayerNumberDetailsVisible(!playerNumberDetailsVisible);
});

// コーン追加ボタンへイベントを登録します。
document.querySelectorAll("[data-add-cone]").forEach((button) => {
  // クリック時に指定色のコーンを追加します。
  button.addEventListener("click", () => addCone(button.dataset.addCone));
});

// 移動速度変更を状態へ反映します。
movementSpeedRange.addEventListener("input", () => {
  // スライダー値を補正して保存します。
  state.movementSpeed = normalizeSpeed(movementSpeedRange.value);
  // 現在値を表示します。
  movementSpeedValue.textContent = `${state.movementSpeed.toFixed(2)}×`;
  // 設定を自動保存します。
  autosave();
});

// 連続再生速度変更を状態へ反映します。
playbackSpeedRange.addEventListener("input", () => {
  // スライダー値を補正して保存します。
  state.playbackSpeed = normalizeSpeed(playbackSpeedRange.value);
  // 現在値を表示します。
  playbackSpeedValue.textContent = `${state.playbackSpeed.toFixed(2)}×`;
  // 設定を自動保存します。
  autosave();
});

// CanvasのPointer押下イベントを登録します。
canvas.addEventListener("pointerdown", handlePointerDown);
// CanvasのPointer移動イベントを登録します。
canvas.addEventListener("pointermove", handlePointerMove);
// CanvasのPointer終了イベントを登録します。
canvas.addEventListener("pointerup", handlePointerUp);
// CanvasのPointer取消イベントを登録します。
canvas.addEventListener("pointercancel", handlePointerUp);
// Canvasのダブルクリックでテキスト編集を登録します。
canvas.addEventListener("dblclick", handleCanvasDoubleClick);
// ウィンドウサイズ変更時にCanvasを再調整します。
window.addEventListener("resize", resizeCanvas);
// キーボード操作を登録します。
window.addEventListener("keydown", handleKeyDown);

// 半面切替ボタンを登録します。
document.getElementById("halfCourtButton").addEventListener("click", () => changeCourtMode("half"));
// 全面切替ボタンを登録します。
document.getElementById("fullCourtButton").addEventListener("click", () => changeCourtMode("full"));
// 元に戻すボタンを登録します。
document.getElementById("undoButton").addEventListener("click", undo);
// やり直しボタンを登録します。
document.getElementById("redoButton").addEventListener("click", redo);
// 線消去ボタンを登録します。
document.getElementById("clearLinesButton").addEventListener("click", clearLines);
// コート最大化ボタンを登録します。
document.getElementById("maximizeCourtButton").addEventListener("click", () => setFocusMode(true));
// 最大表示終了ボタンを登録します。
document.getElementById("exitFocusButton").addEventListener("click", () => setFocusMode(false));
// 最大表示用の再生ボタンを登録します。
focusPlayButton.addEventListener("click", playSteps);
// 最大表示用の一つ前ボタンを登録します。
focusPreviousFrameButton.addEventListener("click", stepPlaybackBackward);
// 最大表示用の次へボタンを登録します。
focusNextFrameButton.addEventListener("click", stepPlaybackForward);
// 最大表示中の再生ボタン表示切替を登録します。
focusPlayVisibilityButton.addEventListener("click", () => {
  state.focusShowPlayButton = !state.focusShowPlayButton;
  syncFocusVisibility();
});
// 最大表示中のSTEP一覧表示切替を登録します。
focusStepsVisibilityButton.addEventListener("click", () => {
  state.focusShowSteps = !state.focusShowSteps;
  syncFocusVisibility();
});
// 最大表示中の編集ツール開閉ボタンを登録します。
focusEditorToggleButton.addEventListener("click", () => setFocusEditorOpen(!isFocusEditorOpen));
// 最大表示中の元に戻すボタンを登録します。
focusUndoButton.addEventListener("click", undo);
// 最大表示中のやり直しボタンを登録します。
focusRedoButton.addEventListener("click", redo);
// 初期化ボタンを登録します。
document.getElementById("resetButton").addEventListener("click", resetBoard);
// STEP追加ボタンを登録します。
document.getElementById("addStepButton").addEventListener("click", addStep);
// STEP削除ボタンを登録します。
document.getElementById("deleteStepButton").addEventListener("click", deleteStep);
// 一つ前の動作ボタンを登録します。
previousFrameButton.addEventListener("click", stepPlaybackBackward);
// 次の動作ボタンを登録します。
nextFrameButton.addEventListener("click", stepPlaybackForward);
// STEP連続再生ボタンを登録します。
document.getElementById("playStepsButton").addEventListener("click", playSteps);
// 動作順初期化ボタンを登録します。
resetActionOrderButton.addEventListener("click", resetActionOrders);
// JSON書出しボタンを登録します。
document.getElementById("exportJsonButton").addEventListener("click", exportJson);
// JSON読込ボタンを登録します。
document.getElementById("importJsonButton").addEventListener("click", () => importJsonInput.click());
// JSONファイル選択時の読込処理を登録します。
importJsonInput.addEventListener("change", importJson);
// PNG出力ボタンを登録します。
document.getElementById("exportButton").addEventListener("click", exportPng);
// OneDrive設定を開くボタンを登録します。
if (connectFolderButton) connectFolderButton.addEventListener("click", openOneDriveSettings);
if (oneDriveButton) oneDriveButton.addEventListener("click", openOneDriveSettings);
document.getElementById("closeOneDriveButton")?.addEventListener("click", () => oneDriveDialog.close());

// Microsoft EntraのクライアントIDをこの端末へ保存します。
document.getElementById("saveOneDriveClientIdButton")?.addEventListener("click", () => {
  try {
    window.OneDriveStorage.setClientId(oneDriveClientIdInput.value);
    showToast("クライアントIDを保存しました");
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    window.alert(error.message);
  }
});

// リダイレクトURIをクリップボードへコピーします。
document.getElementById("copyOneDriveRedirectButton")?.addEventListener("click", async () => {
  const value = oneDriveRedirectUriInput.value;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    oneDriveRedirectUriInput.select();
    document.execCommand("copy");
  }
  showToast("リダイレクトURIをコピーしました");
});

// 個人用Microsoftアカウントへ接続します。
connectOneDriveButton?.addEventListener("click", async () => {
  try {
    if (!window.OneDriveStorage.isConfigured()) {
      oneDriveClientIdInput.focus();
      window.alert("先にMicrosoft EntraのクライアントIDを入力して保存してください。");
      return;
    }
    await window.OneDriveStorage.signIn();
  } catch (error) {
    console.error("OneDriveへ接続できませんでした。", error);
    window.alert("OneDriveへ接続できませんでした。\n\n" + error.message);
  }
});

// 現在のMicrosoftアカウント接続を解除します。
disconnectOneDriveButton?.addEventListener("click", async () => {
  if (!window.confirm("この端末のOneDrive接続を解除しますか？\nOneDrive上の作戦データは削除されません。")) return;
  try {
    await window.OneDriveStorage.signOut();
  } catch (error) {
    window.alert("OneDrive接続を解除できませんでした。\n\n" + error.message);
  }
});

if (refreshLibraryButton) refreshLibraryButton.addEventListener("click", renderLibrary);
if (librarySearchInput) librarySearchInput.addEventListener("input", renderLibrary);
if (libraryFolderFilter) libraryFolderFilter.addEventListener("change", renderLibrary);
if (libraryFavoriteOnly) libraryFavoriteOnly.addEventListener("change", renderLibrary);
if (playFolderInput) playFolderInput.addEventListener("change", () => { state.libraryMeta = {...(state.libraryMeta||{}), folder: playFolderInput.value}; autosave(); });
if (playTagsInput) playTagsInput.addEventListener("change", () => { state.libraryMeta = {...(state.libraryMeta||{}), tags: playTagsInput.value.split(",").map((tag)=>tag.trim()).filter(Boolean)}; autosave(); });
if (playFavoriteInput) playFavoriteInput.addEventListener("change", () => { state.libraryMeta = {...(state.libraryMeta||{}), favorite: playFavoriteInput.checked}; autosave(); });
window.addEventListener("load", async () => {
  await window.PlayFolderAccess?.restore();
  window.OneDriveStorage?.onStatusChange(updateOneDriveInterface);
  try {
    await window.OneDriveStorage?.init();
  } catch (error) {
    console.error("OneDriveの初期化に失敗しました。", error);
  }
  updateOneDriveInterface();
});
document.getElementById("savePlayButton").addEventListener("click", savePlayToLibrary);
// 作戦読込ボタンを登録します。
document.getElementById("openLibraryButton").addEventListener("click", openLibrary);
// ライブラリを閉じるボタンを登録します。
document.getElementById("closeLibraryButton").addEventListener("click", () => libraryDialog.close());

// 移動線表示の変更を状態へ反映します。
showMovementLinesToggle.addEventListener("change", () => {
  // 設定値を状態へ保存します。
  state.showMovementLines = showMovementLinesToggle.checked;
  // 画面を再描画します。
  render();
  // 設定を自動保存します。
  autosave();
});

// Escなどでブラウザー全画面が解除された場合を同期します。
document.addEventListener("fullscreenchange", () => {
  // 全画面要素がなくなり最大表示中なら通常表示へ戻します。
  if (!document.fullscreenElement && isFocusMode) {
    // 状態だけを通常表示へ戻します。
    isFocusMode = false;
    // 最大表示クラスを外します。
    document.body.classList.remove("board-focus");
    // 最大表示用の編集パネルも閉じます。
    setFocusEditorOpen(false);
    // レイアウト反映後にCanvasを再計算します。
    window.setTimeout(resizeCanvas, 40);
  }
});

// 作戦名変更を状態へ反映します。
playNameInput.addEventListener("input", () => {
  // 入力値を状態へ保存します。
  state.playName = playNameInput.value;
  // 自動保存します。
  autosave();
});

// STEPメモ変更を状態へ反映します。
stepNoteInput.addEventListener("input", () => {
  // 現在のSTEPを取得します。
  const step = getActiveStep();
  // STEPがある場合はメモを保存します。
  if (step) {
    // 入力値をSTEPへ反映します。
    step.note = stepNoteInput.value;
    // 自動保存します。
    autosave();
  }
});

// ダイアログ外側クリックで閉じます。
libraryDialog.addEventListener("click", (event) => {
  // ダイアログ自身がクリックされた場合だけ閉じます。
  if (event.target === libraryDialog) {
    // ダイアログを閉じます。
    libraryDialog.close();
  }
});

// OneDrive設定ダイアログの外側クリックで閉じます。
oneDriveDialog?.addEventListener("click", (event) => {
  if (event.target === oneDriveDialog) {
    oneDriveDialog.close();
  }
});

// ローカルフォルダ連携では古いキャッシュを避けるためService Workerを使用しません。

// 自動保存状態を復元します。
restoreAutosave();
// 初期ツールを設定します。
setTool(state.activeTool);
// 画面を同期します。
syncInterface(false);
// 初回Canvasサイズを設定します。
requestAnimationFrame(resizeCanvas);
// アプリの初期化が完了したことをHTML側へ通知します。
document.documentElement.dataset.appReady = "true";
