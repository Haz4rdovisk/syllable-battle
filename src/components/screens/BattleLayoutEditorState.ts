import {
  BattleEditableElementKey,
  BattleLayoutOverrides,
  pruneBattleLayoutOverrides,
} from "./BattleLayoutConfig";
import { BattleSceneFixtureKey } from "./BattleSceneFixtures";
import { BattleScenePreviewFocusArea } from "./BattleSceneFixtureView";
import { BATTLE_STAGE_HEIGHT, BATTLE_STAGE_WIDTH } from "./BattleSceneSpace";

export type BattleLayoutPreviewDevice = "desktop" | "tablet" | "mobile";
export type BattleActionVisualState =
  | "normal"
  | "hover"
  | "pressed"
  | "disabled"
  | "selected";
export type BattleStatusVisualState = "normal" | "urgent" | "selected";
export type BattleChroniclesVisualState = "normal" | "highlighted" | "selected";
export type BattleLayoutPreviewAnimationMode =
  | "idle"
  | "opening-target-entry-play-once"
  | "opening-target-entry-loop"
  | "pill-damage-play-once"
  | "pill-damage-loop"
  | "pill-turn-play-once"
  | "pill-turn-loop"
  | "board-message-play-once"
  | "board-message-loop"
  | "replacement-target-entry-play-once"
  | "replacement-target-entry-loop"
  | "post-play-hand-draw-play-once"
  | "post-play-hand-draw-loop"
  | "hand-play-target-play-once"
  | "hand-play-target-loop"
  | "mulligan-hand-return-play-once"
  | "mulligan-hand-return-loop"
  | "mulligan-hand-draw-play-once"
  | "mulligan-hand-draw-loop"
  | "target-attack-play-once"
  | "target-attack-loop"
  | "hand-play-draw-combo-play-once"
  | "hand-play-draw-combo-loop"
  | "target-attack-replacement-combo-play-once"
  | "target-attack-replacement-combo-loop"
  | "mulligan-complete-combo-play-once"
  | "mulligan-complete-combo-loop";
export type BattleLayoutPreviewAnimationSet =
  | "opening-target-entry-first-round"
  | "pill-damage"
  | "pill-turn"
  | "board-message"
  | "replacement-target-entry"
  | "post-play-hand-draw"
  | "hand-play-target"
  | "mulligan-hand-return"
  | "mulligan-hand-draw"
  | "target-attack"
  | "hand-play-draw-combo"
  | "target-attack-replacement-combo"
  | "mulligan-complete-combo";
export type BattleLayoutPreviewAnimationPreset =
  | "none"
  | "opening-target-entry-0"
  | "opening-target-entry-1"
  | "opening-target-entry-2"
  | "opening-target-entry-3"
  | "opening-target-entry-simultaneous"
  | "pill-damage-player"
  | "pill-damage-enemy"
  | "pill-turn-player"
  | "pill-turn-enemy"
  | "board-message-turn-player"
  | "board-message-turn-enemy"
  | "board-message-round-info"
  | "replacement-target-entry-0"
  | "replacement-target-entry-1"
  | "replacement-target-entry-2"
  | "replacement-target-entry-3"
  | "post-play-hand-draw"
  | "hand-play-target-0"
  | "hand-play-target-1"
  | "mulligan-hand-return-1"
  | "mulligan-hand-return-2"
  | "mulligan-hand-return-3"
  | "mulligan-hand-draw-1"
  | "mulligan-hand-draw-2"
  | "mulligan-hand-draw-3"
  | "target-attack-0"
  | "target-attack-1"
  | "target-attack-2"
  | "target-attack-3"
  | "hand-play-draw-combo-0"
  | "hand-play-draw-combo-1"
  | "target-attack-replacement-combo-0"
  | "target-attack-replacement-combo-1"
  | "target-attack-replacement-combo-2"
  | "target-attack-replacement-combo-3"
  | "mulligan-complete-combo-1"
  | "mulligan-complete-combo-2"
  | "mulligan-complete-combo-3";
export type BattleLayoutPreviewAnimationAnchorKey =
  | "opening-target-entry-0-origin"
  | "opening-target-entry-1-origin"
  | "opening-target-entry-2-origin"
  | "opening-target-entry-3-origin"
  | "replacement-target-entry-0-origin"
  | "replacement-target-entry-1-origin"
  | "replacement-target-entry-2-origin"
  | "replacement-target-entry-3-origin"
  | "post-play-hand-draw-origin"
  | "hand-play-target-0-destination"
  | "hand-play-target-1-destination"
  | "mulligan-hand-return-1-destination"
  | "mulligan-hand-return-2-destination"
  | "mulligan-hand-return-3-destination"
  | "mulligan-hand-draw-1-origin"
  | "mulligan-hand-draw-2-origin"
  | "mulligan-hand-draw-3-origin"
  | "target-attack-0-impact"
  | "target-attack-1-impact"
  | "target-attack-2-impact"
  | "target-attack-3-impact"
  | "target-attack-0-destination"
  | "target-attack-1-destination"
  | "target-attack-2-destination"
  | "target-attack-3-destination";
export interface BattleLayoutPreviewAnimationAnchorPoint {
  x: number;
  y: number;
}
export interface BattleLayoutPreviewAnimationAnchors {
  openingTargetEntry0Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry1Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry2Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry3Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  replacementTargetEntry0Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  replacementTargetEntry1Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  replacementTargetEntry2Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  replacementTargetEntry3Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  postPlayHandDrawOrigin: BattleLayoutPreviewAnimationAnchorPoint | null;
  handPlayTarget0Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  handPlayTarget1Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganReturn1Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganReturn2Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganReturn3Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganDraw1Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganDraw2Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  mulliganDraw3Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack0Impact: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack1Impact: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack2Impact: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack3Impact: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack0Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack1Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack2Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
  targetAttack3Destination: BattleLayoutPreviewAnimationAnchorPoint | null;
}
export type BattleLayoutPreviewResolutionOption = {
  label: string;
  width: number;
  height: number;
};

export interface BattleLayoutEditorPreviewState {
  fixtureKey: BattleSceneFixtureKey;
  focusArea: BattleScenePreviewFocusArea;
  selectedElements: BattleScenePreviewFocusArea[];
  layoutOverrides: BattleLayoutOverrides;
  showGrid: boolean;
  gridSize: number;
  snapThreshold: number;
  previewDevice: BattleLayoutPreviewDevice;
  viewportWidth: number;
  viewportHeight: number;
  actionVisualState: BattleActionVisualState;
  statusVisualState: BattleStatusVisualState;
  chroniclesVisualState: BattleChroniclesVisualState;
  animationSet: BattleLayoutPreviewAnimationSet;
  animationMode: BattleLayoutPreviewAnimationMode;
  animationPreset: BattleLayoutPreviewAnimationPreset;
  animationRunId: number;
  localMotionPreviewElement: BattleEditableElementKey | null;
  localMotionPreviewRunId: number;
  trajectoryLoopEnabled: boolean;
  localMotionLoopEnabled: boolean;
  combinedLoopEnabled: boolean;
  animationAnchorTool: BattleLayoutPreviewAnimationAnchorKey | null;
  animationAnchors: BattleLayoutPreviewAnimationAnchors;
  animationDebugEnabled: boolean;
}

export interface BattleEditorGroup {
  id: string;
  name: string;
  elements: BattleEditableElementKey[];
}

export const BATTLE_LAYOUT_EDITOR_STATE_KEY =
  "syllable-battle:battle-layout-editor-state";
export const BATTLE_LAYOUT_MODEL_VERSION_KEY =
  "syllable-battle:battle-layout-model-version";
export const BATTLE_LAYOUT_MODEL_VERSION = 8;
export const BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY =
  "syllable-battle:battle-layout-active-overrides";
export const BATTLE_LAYOUT_EDITOR_ELEMENT_CLIPBOARD_KEY =
  "syllable-battle:battle-layout-editor-element-clipboard";
export const BATTLE_LAYOUT_EDITOR_GROUP_CLIPBOARD_KEY =
  "syllable-battle:battle-layout-editor-group-clipboard";
export const BATTLE_LAYOUT_EDITOR_ANCHOR_CLIPBOARD_KEY =
  "syllable-battle:battle-layout-editor-anchor-clipboard";
export const BATTLE_LAYOUT_EDITOR_PRESETS_KEY =
  "syllable-battle:battle-layout-editor-presets";
export const BATTLE_LAYOUT_EDITOR_GROUPS_KEY =
  "syllable-battle:battle-layout-editor-groups";
export const BATTLE_LAYOUT_EDITOR_BASELINE_KEY =
  "syllable-battle:battle-layout-editor-baseline";
export const BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE =
  "syllable-battle:battle-layout-editor-message";
export const BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE =
  "syllable-battle:battle-layout-preview-state";

const normalizeLegacyFocusArea = (
  focusArea: string | undefined,
): BattleScenePreviewFocusArea => {
  if (focusArea === "enemyDecks") return "enemyDeck";
  if (focusArea === "playerDecks") return "playerDeck";
  return (focusArea as BattleScenePreviewFocusArea | undefined) ?? "overview";
};

const normalizeLegacySelection = (
  selectedElements: string[] | undefined,
): BattleScenePreviewFocusArea[] | undefined =>
  selectedElements?.map((element) => normalizeLegacyFocusArea(element));

export const battleLayoutPreviewDevices: Record<
  BattleLayoutPreviewDevice,
  { label: string; width: number; height: number }
> = {
  desktop: { label: "PC", width: BATTLE_STAGE_WIDTH, height: BATTLE_STAGE_HEIGHT },
  tablet: { label: "Tablet", width: 1024, height: 768 },
  mobile: { label: "Mobile", width: 844, height: 390 },
};

export const battleLayoutPreviewResolutions: Record<
  BattleLayoutPreviewDevice,
  BattleLayoutPreviewResolutionOption[]
> = {
  desktop: [
    { label: "1280x720", width: 1280, height: 720 },
    { label: "1366x768", width: 1366, height: 768 },
    { label: "1440x900", width: 1440, height: 900 },
    { label: "1536x864", width: 1536, height: 864 },
    { label: "1600x900", width: 1600, height: 900 },
    { label: "1920x1080", width: 1920, height: 1080 },
    { label: "2560x1440", width: 2560, height: 1440 },
    { label: "3840x2160", width: 3840, height: 2160 },
  ],
  tablet: [
    { label: "1024x768", width: 1024, height: 768 },
    { label: "1280x800", width: 1280, height: 800 },
    { label: "1080x810", width: 1080, height: 810 },
    { label: "1180x820", width: 1180, height: 820 },
    { label: "1112x834", width: 1112, height: 834 },
    { label: "1194x834", width: 1194, height: 834 },
    { label: "1366x1024", width: 1366, height: 1024 },
  ],
  mobile: [
    { label: "568x320", width: 568, height: 320 },
    { label: "640x360", width: 640, height: 360 },
    { label: "720x360", width: 720, height: 360 },
    { label: "800x360", width: 800, height: 360 },
    { label: "667x375", width: 667, height: 375 },
    { label: "812x375", width: 812, height: 375 },
    { label: "844x390", width: 844, height: 390 },
    { label: "852x393", width: 852, height: 393 },
    { label: "732x412", width: 732, height: 412 },
    { label: "915x412", width: 915, height: 412 },
    { label: "926x428", width: 926, height: 428 },
  ],
};

export function normalizeBattleLayoutEditorPreviewState(
  state: BattleLayoutEditorPreviewState,
): BattleLayoutEditorPreviewState {
  const preset = battleLayoutPreviewDevices[state.previewDevice];
  const normalizedFocusArea = normalizeLegacyFocusArea(state.focusArea);
  const normalizedSelection = normalizeLegacySelection(
    state.selectedElements as string[] | undefined,
  );
  const normalizedAnimationSet =
    state.animationSet ?? "opening-target-entry-first-round";
  const rawAnimationPreset = state.animationPreset as string | undefined;
  const normalizedAnimationPreset =
    normalizedAnimationSet === "hand-play-target" &&
    (rawAnimationPreset === "hand-play-target-2" ||
      rawAnimationPreset === "hand-play-target-3")
      ? "none"
      : state.animationPreset ?? "none";

  const clampAnimationPoint = (
    point: BattleLayoutPreviewAnimationAnchorPoint | null | undefined,
  ): BattleLayoutPreviewAnimationAnchorPoint | null =>
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
      ? {
          x: Math.max(0, Math.min(BATTLE_STAGE_WIDTH, Math.round(point.x))),
          y: Math.max(0, Math.min(BATTLE_STAGE_HEIGHT, Math.round(point.y))),
        }
      : null;

  return {
    ...state,
    focusArea: normalizedFocusArea,
    layoutOverrides: pruneBattleLayoutOverrides(state.layoutOverrides),
    showGrid: state.showGrid ?? true,
    gridSize: Number.isFinite(state.gridSize)
      ? Math.min(64, Math.max(4, Math.round(state.gridSize)))
      : 8,
    snapThreshold: Number.isFinite(state.snapThreshold)
      ? Math.min(32, Math.max(4, Math.round(state.snapThreshold)))
      : 12,
    selectedElements:
      normalizedSelection ?? (normalizedFocusArea === "overview" ? [] : [normalizedFocusArea]),
    viewportWidth: Number.isFinite(state.viewportWidth)
      ? Math.max(320, Math.round(state.viewportWidth))
      : preset.width,
    viewportHeight: Number.isFinite(state.viewportHeight)
      ? Math.max(240, Math.round(state.viewportHeight))
      : preset.height,
    actionVisualState: state.actionVisualState ?? "normal",
    statusVisualState: state.statusVisualState ?? "normal",
    chroniclesVisualState: state.chroniclesVisualState ?? "normal",
    animationSet: normalizedAnimationSet,
    animationMode: state.animationMode ?? "idle",
    animationPreset: normalizedAnimationPreset,
    animationRunId: Number.isFinite(state.animationRunId)
      ? Math.max(0, Math.round(state.animationRunId))
      : 0,
    localMotionPreviewElement:
      (state.localMotionPreviewElement as BattleEditableElementKey | null | undefined) ??
      null,
    localMotionPreviewRunId: Number.isFinite(state.localMotionPreviewRunId)
      ? Math.max(0, Math.round(state.localMotionPreviewRunId))
      : 0,
    trajectoryLoopEnabled: state.trajectoryLoopEnabled ?? false,
    localMotionLoopEnabled: state.localMotionLoopEnabled ?? false,
    combinedLoopEnabled: state.combinedLoopEnabled ?? false,
    animationAnchorTool: state.animationAnchorTool ?? null,
    animationDebugEnabled: state.animationDebugEnabled ?? false,
    animationAnchors: {
      openingTargetEntry0Origin: clampAnimationPoint(
        state.animationAnchors?.openingTargetEntry0Origin,
      ),
      openingTargetEntry1Origin: clampAnimationPoint(
        state.animationAnchors?.openingTargetEntry1Origin,
      ),
      openingTargetEntry2Origin: clampAnimationPoint(
        state.animationAnchors?.openingTargetEntry2Origin,
      ),
      openingTargetEntry3Origin: clampAnimationPoint(
        state.animationAnchors?.openingTargetEntry3Origin,
      ),
      replacementTargetEntry0Origin: clampAnimationPoint(
        state.animationAnchors?.replacementTargetEntry0Origin,
      ),
      replacementTargetEntry1Origin: clampAnimationPoint(
        state.animationAnchors?.replacementTargetEntry1Origin,
      ),
      replacementTargetEntry2Origin: clampAnimationPoint(
        state.animationAnchors?.replacementTargetEntry2Origin,
      ),
      replacementTargetEntry3Origin: clampAnimationPoint(
        state.animationAnchors?.replacementTargetEntry3Origin,
      ),
      postPlayHandDrawOrigin: clampAnimationPoint(
        state.animationAnchors?.postPlayHandDrawOrigin,
      ),
      handPlayTarget0Destination: clampAnimationPoint(
        state.animationAnchors?.handPlayTarget0Destination,
      ),
      handPlayTarget1Destination: clampAnimationPoint(
        state.animationAnchors?.handPlayTarget1Destination,
      ),
      mulliganReturn1Destination: clampAnimationPoint(
        state.animationAnchors?.mulliganReturn1Destination,
      ),
      mulliganReturn2Destination: clampAnimationPoint(
        state.animationAnchors?.mulliganReturn2Destination,
      ),
      mulliganReturn3Destination: clampAnimationPoint(
        state.animationAnchors?.mulliganReturn3Destination,
      ),
      mulliganDraw1Origin: clampAnimationPoint(
        state.animationAnchors?.mulliganDraw1Origin,
      ),
      mulliganDraw2Origin: clampAnimationPoint(
        state.animationAnchors?.mulliganDraw2Origin,
      ),
      mulliganDraw3Origin: clampAnimationPoint(
        state.animationAnchors?.mulliganDraw3Origin,
      ),
      targetAttack0Impact: clampAnimationPoint(
        state.animationAnchors?.targetAttack0Impact,
      ),
      targetAttack1Impact: clampAnimationPoint(
        state.animationAnchors?.targetAttack1Impact,
      ),
      targetAttack2Impact: clampAnimationPoint(
        state.animationAnchors?.targetAttack2Impact,
      ),
      targetAttack3Impact: clampAnimationPoint(
        state.animationAnchors?.targetAttack3Impact,
      ),
      targetAttack0Destination: clampAnimationPoint(
        state.animationAnchors?.targetAttack0Destination,
      ),
      targetAttack1Destination: clampAnimationPoint(
        state.animationAnchors?.targetAttack1Destination,
      ),
      targetAttack2Destination: clampAnimationPoint(
        state.animationAnchors?.targetAttack2Destination,
      ),
      targetAttack3Destination: clampAnimationPoint(
        state.animationAnchors?.targetAttack3Destination,
      ),
    },
  };
}
