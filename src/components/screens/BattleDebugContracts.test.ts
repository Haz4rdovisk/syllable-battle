import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBattleDebugPointSnapshot,
  buildBattleProbeRow,
  formatBattleDebugDelta,
  formatBattleDebugFallbackLine,
  formatBattleDebugPoint,
  formatBattleDebugSnapshot,
  formatBattleProbeLine,
  getBattleDebugZoneSnapshotCenter,
  getLiveAnimationAnchorReferenceTarget,
  getPreviewAnimationAnchorReferenceTarget,
  toBattleDebugScenePoint,
  toBattleDebugScreenPoint,
} from "./BattleDebugGeometry";
import {
  normalizeBattleLayoutEditorPreviewState,
  type BattleLayoutEditorPreviewState,
} from "./BattleLayoutEditorState";
import {
  createBattleLayoutConfig,
  createBattleLayoutPresetSource,
} from "./BattleLayoutConfig";

const createPreviewState = (): BattleLayoutEditorPreviewState => ({
  fixtureKey: "calm",
  focusArea: "overview",
  selectedElements: [],
  layoutOverrides: {},
  showGrid: true,
  gridSize: 8,
  snapThreshold: 12,
  previewDevice: "desktop",
  viewportWidth: 1600,
  viewportHeight: 900,
  actionVisualState: "normal",
  statusVisualState: "normal",
  chroniclesVisualState: "normal",
  animationSet: "opening-target-entry-first-round",
  animationMode: "idle",
  animationPreset: "none",
  animationRunId: 0,
  localMotionPreviewElement: null,
  localMotionPreviewRunId: 0,
  trajectoryLoopEnabled: false,
  localMotionLoopEnabled: false,
  combinedLoopEnabled: false,
  animationAnchorTool: null,
  animationDebugEnabled: false,
  animationAnchors: {
    openingTargetEntry0Origin: null,
    openingTargetEntry1Origin: null,
    openingTargetEntry2Origin: null,
    openingTargetEntry3Origin: null,
    replacementTargetEntry0Origin: null,
    replacementTargetEntry1Origin: null,
    replacementTargetEntry2Origin: null,
    replacementTargetEntry3Origin: null,
    postPlayHandDrawOrigin: null,
    handPlayTarget0Destination: null,
    handPlayTarget1Destination: null,
    mulliganReturn1Destination: null,
    mulliganReturn2Destination: null,
    mulliganReturn3Destination: null,
    mulliganDraw1Origin: null,
    mulliganDraw2Origin: null,
    mulliganDraw3Origin: null,
    targetAttack0Impact: null,
    targetAttack1Impact: null,
    targetAttack2Impact: null,
    targetAttack3Impact: null,
    targetAttack0Destination: null,
    targetAttack1Destination: null,
    targetAttack2Destination: null,
    targetAttack3Destination: null,
  },
});

test("normalizeBattleLayoutEditorPreviewState normaliza legado, clamps e defaults relevantes", () => {
  const normalized = normalizeBattleLayoutEditorPreviewState({
    ...createPreviewState(),
    focusArea: "enemyDecks" as never,
    selectedElements: ["playerDecks"] as never,
    layoutOverrides: {
      text: {
        actionTitle: "Atacar",
      },
      shell: {},
    },
    showGrid: undefined as never,
    gridSize: 99,
    snapThreshold: 2,
    viewportWidth: 200,
    viewportHeight: 120,
    animationSet: "hand-play-target",
    animationPreset: "hand-play-target-2" as never,
    animationRunId: -3,
    animationAnchorTool: undefined as never,
    animationDebugEnabled: undefined as never,
    animationAnchors: {
      ...createPreviewState().animationAnchors,
      openingTargetEntry0Origin: { x: -5.6, y: 901.2 },
      postPlayHandDrawOrigin: { x: 300.4, y: 444.6 },
      targetAttack0Impact: { x: Number.POSITIVE_INFINITY, y: 10 },
    },
  });

  assert.equal(normalized.focusArea, "enemyDeck");
  assert.deepEqual(normalized.selectedElements, ["playerDeck"]);
  assert.deepEqual(normalized.layoutOverrides, {
    text: {
      actionTitle: "Atacar",
    },
  });
  assert.equal(normalized.showGrid, true);
  assert.equal(normalized.gridSize, 64);
  assert.equal(normalized.snapThreshold, 4);
  assert.equal(normalized.viewportWidth, 320);
  assert.equal(normalized.viewportHeight, 240);
  assert.equal(normalized.animationPreset, "none");
  assert.equal(normalized.animationRunId, 0);
  assert.equal(normalized.animationAnchorTool, null);
  assert.equal(normalized.animationDebugEnabled, false);
  assert.deepEqual(normalized.animationAnchors.openingTargetEntry0Origin, {
    x: 0,
    y: 900,
  });
  assert.deepEqual(normalized.animationAnchors.postPlayHandDrawOrigin, {
    x: 300,
    y: 445,
  });
  assert.equal(normalized.animationAnchors.targetAttack0Impact, null);
});

test("normalizeBattleLayoutEditorPreviewState usa fallback de resolucao e selecao implicita", () => {
  const normalized = normalizeBattleLayoutEditorPreviewState({
    ...createPreviewState(),
    previewDevice: "mobile",
    focusArea: "playerDecks" as never,
    selectedElements: undefined as never,
    gridSize: Number.NaN,
    snapThreshold: Number.NaN,
    viewportWidth: Number.NaN,
    viewportHeight: Number.NaN,
    actionVisualState: undefined as never,
    statusVisualState: undefined as never,
    chroniclesVisualState: undefined as never,
    animationSet: undefined as never,
    animationMode: undefined as never,
    animationPreset: undefined as never,
  });

  assert.equal(normalized.focusArea, "playerDeck");
  assert.deepEqual(normalized.selectedElements, ["playerDeck"]);
  assert.equal(normalized.gridSize, 8);
  assert.equal(normalized.snapThreshold, 12);
  assert.equal(normalized.viewportWidth, 844);
  assert.equal(normalized.viewportHeight, 390);
  assert.equal(normalized.actionVisualState, "normal");
  assert.equal(normalized.statusVisualState, "normal");
  assert.equal(normalized.chroniclesVisualState, "normal");
  assert.equal(normalized.animationSet, "opening-target-entry-first-round");
  assert.equal(normalized.animationMode, "idle");
  assert.equal(normalized.animationPreset, "none");
});

test("getLiveAnimationAnchorReferenceTarget resolve destinos por tipo de ancora", () => {
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("openingTargetEntry0Origin", 2),
    { kind: "zone", zoneId: "playerTargetDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("openingTargetEntry3Origin", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("handPlayTarget1Destination", 2),
    { kind: "slot", zoneId: "playerField", slot: "slot-1" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("mulliganDraw2Origin", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("targetAttack3Impact", 2),
    { kind: "slot", zoneId: "enemyField", slot: "slot-1" },
  );
  assert.deepEqual(
    getLiveAnimationAnchorReferenceTarget("targetAttack2Destination", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
});

test("buildBattleProbeRow calcula deltas e preserva failureReason", () => {
  const row = buildBattleProbeRow({
    anchor: "anchor-under-test",
    point: { x: 15, y: 20 },
    screen: { x: 120, y: 210 },
    reference: { x: 8, y: 32 },
    referenceScreen: { x: 100, y: 190 },
    failureReason: "stage-missing",
  });

  assert.deepEqual(row, {
    anchor: "anchor-under-test",
    point: { x: 15, y: 20 },
    screen: { x: 120, y: 210 },
    reference: { x: 8, y: 32 },
    referenceScreen: { x: 100, y: 190 },
    failureReason: "stage-missing",
    deltaScene: { x: 7, y: -12 },
    deltaScreen: { x: 20, y: 20 },
  });
});

test("buildBattleProbeRow mantem deltas nulos quando faltam referencias", () => {
  const row = buildBattleProbeRow({
    anchor: "anchor-under-test",
    point: { x: 1, y: 2 },
    screen: null,
    reference: null,
    referenceScreen: null,
  });

  assert.equal(row.deltaScene, null);
  assert.equal(row.deltaScreen, null);
});

test("formatBattleProbeLine preserva o output atual de runtime e preview", () => {
  const row = buildBattleProbeRow({
    anchor: "post-play-hand-draw-origin",
    point: { x: 320, y: 460 },
    screen: { x: 640, y: 820 },
    reference: { x: 300, y: 440 },
    referenceScreen: { x: 600, y: 780 },
  });

  assert.equal(
    formatBattleProbeLine(row),
    "probe:post-play-hand-draw-origin scene:320,460 screen:640,820 ref:300,440 refScreen:600,780 dScene:+20,+20 dScreen:+40,+40",
  );
  assert.equal(
    formatBattleProbeLine(row, "visual"),
    "probe:visual:post-play-hand-draw-origin scene:320,460 screen:640,820 ref:300,440 refScreen:600,780 dScene:+20,+20 dScreen:+40,+40",
  );
});

test("helpers de conversao de stage preservam ida e volta scene-screen", () => {
  const metrics = {
    rect: { left: 100, top: 40 },
    scaleX: 0.5,
    scaleY: 0.75,
  };

  const screenPoint = toBattleDebugScreenPoint({ x: 320, y: 160 }, metrics);
  assert.deepEqual(screenPoint, { x: 260, y: 160 });
  assert.deepEqual(toBattleDebugScenePoint(screenPoint, metrics), {
    x: 320,
    y: 160,
  });
  assert.deepEqual(buildBattleDebugPointSnapshot({ x: 320, y: 160 }, metrics), {
    left: 260,
    top: 160,
    width: 0,
    height: 0,
  });
  assert.equal(toBattleDebugScreenPoint(null, metrics), null);
  assert.equal(toBattleDebugScenePoint(null, metrics), null);
});

test("getPreviewAnimationAnchorReferenceTarget resolve casos puros do preview", () => {
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("replacement-target-entry-3-origin", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("post-play-hand-draw-origin", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("hand-play-target-1-destination", 2),
    { kind: "slot", zoneId: "playerField", slot: "slot-1" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("mulligan-hand-return-2-destination", 2),
    { kind: "zone", zoneId: "playerDeck" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("target-attack-3-impact", 2),
    { kind: "slot", zoneId: "enemyField", slot: "slot-1" },
  );
  assert.deepEqual(
    getPreviewAnimationAnchorReferenceTarget("target-attack-2-destination", 2),
    { kind: "zone", zoneId: "enemyTargetDeck" },
  );
  assert.equal(
    getPreviewAnimationAnchorReferenceTarget("opening-target-entry-1-origin", 2),
    null,
  );
});

test("helpers de formatacao/debug retornam saidas uteis sem depender de DOM", () => {
  assert.deepEqual(
    getBattleDebugZoneSnapshotCenter({
      left: 10.4,
      top: 20.4,
      width: 9.2,
      height: 5.2,
    }),
    { x: 15, y: 23 },
  );
  assert.equal(formatBattleDebugPoint({ x: 12, y: 34 }), "12,34");
  assert.equal(formatBattleDebugPoint(null), "-");
  assert.equal(formatBattleDebugDelta({ x: 5, y: -3 }), "+5,-3");
  assert.equal(formatBattleDebugDelta(null), "-");
  assert.equal(
    formatBattleDebugSnapshot({
      left: 10.2,
      top: 20.7,
      width: 30.4,
      height: 40.5,
    }),
    "10,21 30x41",
  );
  assert.equal(formatBattleDebugSnapshot(null), "-");

  const fallbackLine = formatBattleDebugFallbackLine({
    createdAt: 0,
    label: "post-play-hand-draw",
    reason: "anchor-missing",
    fallback: "deck",
  });
  assert.match(
    fallbackLine,
    /^fallback:\d{2}:\d{2}:\d{2} post-play-hand-draw reason:anchor-missing -> deck$/,
  );
});

test("layout visual minimo preserva preset fechado e serializa a secao no preset", () => {
  const layout = createBattleLayoutConfig({
    visuals: {
      cardStackPresetId: "jade",
    },
  });

  assert.equal(layout.visuals.cardStackPresetId, "jade");

  const presetSource = createBattleLayoutPresetSource({
    text: {
      actionTitle: "Trocar",
    },
  });

  assert.match(
    presetSource,
    /"visuals": \{\s+"cardStackPresetId": "arcane"\s+\}/,
  );
});
