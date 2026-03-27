import React, { useEffect, useMemo, useState } from "react";
import {
  BattleLayoutEditorPreviewState,
  battleLayoutPreviewDevices,
  BATTLE_LAYOUT_EDITOR_STATE_KEY,
  BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE,
  normalizeBattleLayoutEditorPreviewState,
} from "./BattleLayoutEditorState";
import {
  createBattleLayoutConfig,
  pruneBattleLayoutOverrides,
} from "./BattleLayoutConfig";
import { battleSceneFixtures } from "./BattleSceneFixtures";
import { BattleSceneFixtureView } from "./BattleSceneFixtureView";

const defaultPreviewState: BattleLayoutEditorPreviewState = {
  fixtureKey: "calm",
  focusArea: "overview",
  selectedElements: [],
  layoutOverrides: {},
  showGrid: true,
  gridSize: 8,
  snapThreshold: 12,
  previewDevice: "desktop",
  viewportWidth: battleLayoutPreviewDevices.desktop.width,
  viewportHeight: battleLayoutPreviewDevices.desktop.height,
  actionVisualState: "normal",
  statusVisualState: "normal",
  chroniclesVisualState: "normal",
  animationSet: "opening-target-entry-first-round",
  animationMode: "idle",
  animationPreset: "none",
  animationRunId: 0,
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
};

function readPreviewState(): BattleLayoutEditorPreviewState {
  if (typeof window === "undefined") return defaultPreviewState;

  try {
    const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_STATE_KEY);
    if (!raw) return defaultPreviewState;
    const parsed = JSON.parse(raw) as BattleLayoutEditorPreviewState;
    return {
      ...defaultPreviewState,
      fixtureKey: parsed.fixtureKey ?? defaultPreviewState.fixtureKey,
      focusArea: parsed.focusArea ?? defaultPreviewState.focusArea,
      selectedElements:
        parsed.selectedElements ??
        ((parsed.focusArea ?? defaultPreviewState.focusArea) === "overview"
          ? []
          : [parsed.focusArea ?? defaultPreviewState.focusArea]),
      layoutOverrides: pruneBattleLayoutOverrides(parsed.layoutOverrides ?? {}),
      showGrid: parsed.showGrid ?? defaultPreviewState.showGrid,
      gridSize: parsed.gridSize ?? defaultPreviewState.gridSize,
      snapThreshold: parsed.snapThreshold ?? defaultPreviewState.snapThreshold,
      previewDevice: parsed.previewDevice ?? defaultPreviewState.previewDevice,
      viewportWidth:
        parsed.viewportWidth ?? battleLayoutPreviewDevices[parsed.previewDevice ?? defaultPreviewState.previewDevice].width,
      viewportHeight:
        parsed.viewportHeight ?? battleLayoutPreviewDevices[parsed.previewDevice ?? defaultPreviewState.previewDevice].height,
      actionVisualState: parsed.actionVisualState ?? defaultPreviewState.actionVisualState,
      statusVisualState: parsed.statusVisualState ?? defaultPreviewState.statusVisualState,
      chroniclesVisualState: parsed.chroniclesVisualState ?? defaultPreviewState.chroniclesVisualState,
      animationSet: parsed.animationSet ?? defaultPreviewState.animationSet,
      animationMode: parsed.animationMode ?? defaultPreviewState.animationMode,
      animationPreset: parsed.animationPreset ?? defaultPreviewState.animationPreset,
      animationRunId: parsed.animationRunId ?? defaultPreviewState.animationRunId,
      animationAnchorTool:
        parsed.animationAnchorTool ?? defaultPreviewState.animationAnchorTool,
      animationDebugEnabled:
        parsed.animationDebugEnabled ?? defaultPreviewState.animationDebugEnabled,
      animationAnchors: {
        openingTargetEntry0Origin:
          parsed.animationAnchors?.openingTargetEntry0Origin ??
          defaultPreviewState.animationAnchors.openingTargetEntry0Origin,
        openingTargetEntry1Origin:
          parsed.animationAnchors?.openingTargetEntry1Origin ??
          defaultPreviewState.animationAnchors.openingTargetEntry1Origin,
        openingTargetEntry2Origin:
          parsed.animationAnchors?.openingTargetEntry2Origin ??
          defaultPreviewState.animationAnchors.openingTargetEntry2Origin,
        openingTargetEntry3Origin:
          parsed.animationAnchors?.openingTargetEntry3Origin ??
          defaultPreviewState.animationAnchors.openingTargetEntry3Origin,
        replacementTargetEntry0Origin:
          parsed.animationAnchors?.replacementTargetEntry0Origin ??
          defaultPreviewState.animationAnchors.replacementTargetEntry0Origin,
        replacementTargetEntry1Origin:
          parsed.animationAnchors?.replacementTargetEntry1Origin ??
          defaultPreviewState.animationAnchors.replacementTargetEntry1Origin,
        replacementTargetEntry2Origin:
          parsed.animationAnchors?.replacementTargetEntry2Origin ??
          defaultPreviewState.animationAnchors.replacementTargetEntry2Origin,
        replacementTargetEntry3Origin:
          parsed.animationAnchors?.replacementTargetEntry3Origin ??
          defaultPreviewState.animationAnchors.replacementTargetEntry3Origin,
        postPlayHandDrawOrigin:
          parsed.animationAnchors?.postPlayHandDrawOrigin ??
          defaultPreviewState.animationAnchors.postPlayHandDrawOrigin,
        handPlayTarget0Destination:
          parsed.animationAnchors?.handPlayTarget0Destination ??
          defaultPreviewState.animationAnchors.handPlayTarget0Destination,
        handPlayTarget1Destination:
          parsed.animationAnchors?.handPlayTarget1Destination ??
          defaultPreviewState.animationAnchors.handPlayTarget1Destination,
        mulliganReturn1Destination:
          parsed.animationAnchors?.mulliganReturn1Destination ??
          defaultPreviewState.animationAnchors.mulliganReturn1Destination,
        mulliganReturn2Destination:
          parsed.animationAnchors?.mulliganReturn2Destination ??
          defaultPreviewState.animationAnchors.mulliganReturn2Destination,
        mulliganReturn3Destination:
          parsed.animationAnchors?.mulliganReturn3Destination ??
          defaultPreviewState.animationAnchors.mulliganReturn3Destination,
        mulliganDraw1Origin:
          parsed.animationAnchors?.mulliganDraw1Origin ??
          defaultPreviewState.animationAnchors.mulliganDraw1Origin,
        mulliganDraw2Origin:
          parsed.animationAnchors?.mulliganDraw2Origin ??
          defaultPreviewState.animationAnchors.mulliganDraw2Origin,
        mulliganDraw3Origin:
          parsed.animationAnchors?.mulliganDraw3Origin ??
          defaultPreviewState.animationAnchors.mulliganDraw3Origin,
        targetAttack0Impact:
          parsed.animationAnchors?.targetAttack0Impact ??
          defaultPreviewState.animationAnchors.targetAttack0Impact,
        targetAttack1Impact:
          parsed.animationAnchors?.targetAttack1Impact ??
          defaultPreviewState.animationAnchors.targetAttack1Impact,
        targetAttack2Impact:
          parsed.animationAnchors?.targetAttack2Impact ??
          defaultPreviewState.animationAnchors.targetAttack2Impact,
        targetAttack3Impact:
          parsed.animationAnchors?.targetAttack3Impact ??
          defaultPreviewState.animationAnchors.targetAttack3Impact,
        targetAttack0Destination:
          parsed.animationAnchors?.targetAttack0Destination ??
          defaultPreviewState.animationAnchors.targetAttack0Destination,
        targetAttack1Destination:
          parsed.animationAnchors?.targetAttack1Destination ??
          defaultPreviewState.animationAnchors.targetAttack1Destination,
        targetAttack2Destination:
          parsed.animationAnchors?.targetAttack2Destination ??
          defaultPreviewState.animationAnchors.targetAttack2Destination,
        targetAttack3Destination:
          parsed.animationAnchors?.targetAttack3Destination ??
          defaultPreviewState.animationAnchors.targetAttack3Destination,
      },
    };
  } catch {
    return defaultPreviewState;
  }
}

export const BattleLayoutPreview: React.FC = () => {
  const [previewState, setPreviewState] =
    useState<BattleLayoutEditorPreviewState>(readPreviewState);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | {
            type?: string;
            payload?: BattleLayoutEditorPreviewState;
          }
        | undefined;
      if (!data || data.type !== BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE) return;
      if (!data.payload) return;
      setPreviewState(normalizeBattleLayoutEditorPreviewState(data.payload));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== BATTLE_LAYOUT_EDITOR_STATE_KEY) return;
      setPreviewState(readPreviewState());
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    const interval = window.setInterval(() => {
      setPreviewState((current) => {
        const next = readPreviewState();
        const serializedCurrent = JSON.stringify(current);
        const serializedNext = JSON.stringify(next);
        return serializedCurrent === serializedNext ? current : next;
      });
    }, 250);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(interval);
    };
  }, []);

  const layout = useMemo(
    () => createBattleLayoutConfig(previewState.layoutOverrides),
    [previewState.layoutOverrides],
  );
  const fixture =
    battleSceneFixtures[previewState.fixtureKey] ?? battleSceneFixtures.calm;

  return (
    <BattleSceneFixtureView
      fixture={fixture}
      layout={layout}
      focusArea={previewState.focusArea}
      selectedElements={previewState.selectedElements}
      viewportWidth={previewState.viewportWidth}
      viewportHeight={previewState.viewportHeight}
      editorMode
      showGrid={previewState.showGrid}
      gridSize={previewState.gridSize}
      snapThreshold={previewState.snapThreshold}
      actionVisualState={previewState.actionVisualState}
      statusVisualState={previewState.statusVisualState}
      chroniclesVisualState={previewState.chroniclesVisualState}
      animationSet={previewState.animationSet}
      animationMode={previewState.animationMode}
      animationPreset={previewState.animationPreset}
      animationRunId={previewState.animationRunId}
      animationAnchorTool={previewState.animationAnchorTool}
      animationAnchors={previewState.animationAnchors}
      animationDebugEnabled={previewState.animationDebugEnabled}
    />
  );
};
