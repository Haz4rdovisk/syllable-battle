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
    />
  );
};
