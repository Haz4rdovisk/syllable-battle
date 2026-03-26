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
  | "opening-target-entry-loop";
export type BattleLayoutPreviewAnimationPreset =
  | "none"
  | "opening-target-entry-0"
  | "opening-target-entry-1"
  | "opening-target-entry-2"
  | "opening-target-entry-3"
  | "opening-target-entry-simultaneous";
export type BattleLayoutPreviewAnimationAnchorKey =
  | "opening-target-entry-0-origin"
  | "opening-target-entry-1-origin"
  | "opening-target-entry-2-origin"
  | "opening-target-entry-3-origin";
export interface BattleLayoutPreviewAnimationAnchorPoint {
  x: number;
  y: number;
}
export interface BattleLayoutPreviewAnimationAnchors {
  openingTargetEntry0Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry1Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry2Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
  openingTargetEntry3Origin: BattleLayoutPreviewAnimationAnchorPoint | null;
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
  animationMode: BattleLayoutPreviewAnimationMode;
  animationPreset: BattleLayoutPreviewAnimationPreset;
  animationRunId: number;
  animationAnchorTool: BattleLayoutPreviewAnimationAnchorKey | null;
  animationAnchors: BattleLayoutPreviewAnimationAnchors;
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
export const BATTLE_LAYOUT_MODEL_VERSION = 3;
export const BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY =
  "syllable-battle:battle-layout-active-overrides";
export const BATTLE_LAYOUT_EDITOR_ELEMENT_CLIPBOARD_KEY =
  "syllable-battle:battle-layout-editor-element-clipboard";
export const BATTLE_LAYOUT_EDITOR_GROUP_CLIPBOARD_KEY =
  "syllable-battle:battle-layout-editor-group-clipboard";
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
    animationMode: state.animationMode ?? "idle",
    animationPreset: state.animationPreset ?? "none",
    animationRunId: Number.isFinite(state.animationRunId)
      ? Math.max(0, Math.round(state.animationRunId))
      : 0,
    animationAnchorTool: state.animationAnchorTool ?? null,
    animationAnchors: {
      openingTargetEntry0Origin:
        state.animationAnchors?.openingTargetEntry0Origin &&
        Number.isFinite(state.animationAnchors.openingTargetEntry0Origin.x) &&
        Number.isFinite(state.animationAnchors.openingTargetEntry0Origin.y)
          ? {
              x: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_WIDTH,
                  Math.round(state.animationAnchors.openingTargetEntry0Origin.x),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_HEIGHT,
                  Math.round(state.animationAnchors.openingTargetEntry0Origin.y),
                ),
              ),
            }
          : null,
      openingTargetEntry1Origin:
        state.animationAnchors?.openingTargetEntry1Origin &&
        Number.isFinite(state.animationAnchors.openingTargetEntry1Origin.x) &&
        Number.isFinite(state.animationAnchors.openingTargetEntry1Origin.y)
          ? {
              x: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_WIDTH,
                  Math.round(state.animationAnchors.openingTargetEntry1Origin.x),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_HEIGHT,
                  Math.round(state.animationAnchors.openingTargetEntry1Origin.y),
                ),
              ),
            }
          : null,
      openingTargetEntry2Origin:
        state.animationAnchors?.openingTargetEntry2Origin &&
        Number.isFinite(state.animationAnchors.openingTargetEntry2Origin.x) &&
        Number.isFinite(state.animationAnchors.openingTargetEntry2Origin.y)
          ? {
              x: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_WIDTH,
                  Math.round(state.animationAnchors.openingTargetEntry2Origin.x),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_HEIGHT,
                  Math.round(state.animationAnchors.openingTargetEntry2Origin.y),
                ),
              ),
            }
          : null,
      openingTargetEntry3Origin:
        state.animationAnchors?.openingTargetEntry3Origin &&
        Number.isFinite(state.animationAnchors.openingTargetEntry3Origin.x) &&
        Number.isFinite(state.animationAnchors.openingTargetEntry3Origin.y)
          ? {
              x: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_WIDTH,
                  Math.round(state.animationAnchors.openingTargetEntry3Origin.x),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  BATTLE_STAGE_HEIGHT,
                  Math.round(state.animationAnchors.openingTargetEntry3Origin.y),
                ),
              ),
            }
          : null,
    },
  };
}
