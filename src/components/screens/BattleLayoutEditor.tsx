import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BattleScenePreviewFocusArea,
} from "./BattleSceneFixtureView";
import {
  battleSceneFixtureMeta,
  battleSceneFixtures,
  BattleSceneFixtureKey,
} from "./BattleSceneFixtures";
import {
  BattleAnimationAnchorPoint,
  BattleEditableElementKey,
  BattleElementAnchor,
  BattleElementPropertyConfig,
  BattleLayoutConfig,
  BattleLayoutOverrides,
  createBattleLayoutConfig,
  createBattleLayoutPresetSource,
  pruneBattleLayoutOverrides,
} from "./BattleLayoutConfig";
import {
  battleActiveLayoutOverrides,
} from "./BattleLayoutPreset";
import { readActiveBattleLayoutOverrides } from "./BattleActiveLayout";
import {
  BattleActionVisualState,
  BattleLayoutPreviewAnimationAnchors,
  BattleLayoutPreviewAnimationAnchorKey,
  BattleLayoutPreviewAnimationSet,
  BattleLayoutPreviewAnimationMode,
  BattleLayoutPreviewAnimationPreset,
  BattleEditorGroup,
  BattleChroniclesVisualState,
  BattleLayoutPreviewDevice,
  battleLayoutPreviewDevices,
  battleLayoutPreviewResolutions,
  BattleStatusVisualState,
  BATTLE_LAYOUT_EDITOR_STATE_KEY,
  BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY,
  BATTLE_LAYOUT_EDITOR_ELEMENT_CLIPBOARD_KEY,
  BATTLE_LAYOUT_EDITOR_BASELINE_KEY,
  BATTLE_LAYOUT_EDITOR_GROUP_CLIPBOARD_KEY,
  BATTLE_LAYOUT_EDITOR_GROUPS_KEY,
  BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE,
  BATTLE_LAYOUT_MODEL_VERSION,
  BATTLE_LAYOUT_MODEL_VERSION_KEY,
  BATTLE_LAYOUT_EDITOR_PRESETS_KEY,
  BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE,
  normalizeBattleLayoutEditorPreviewState,
} from "./BattleLayoutEditorState";
import { getBattleElementSceneRect } from "./BattleSceneSpace";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

type LayoutNumberControl = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ui?: "slider" | "stepper";
  axis?: "x" | "y";
};

type LayoutSection = {
  key: string;
  title: string;
  description: string;
  focusArea: BattleScenePreviewFocusArea;
  controls: LayoutNumberControl[];
  elementKey?: BattleEditableElementKey;
  typeLabel: string;
  tags: string[];
};

const fixtureOptions: BattleSceneFixtureKey[] = [
  "calm",
  "mid",
  "urgent",
  "enemy",
  "damage",
];

const anchorOptions: Array<{ value: BattleElementAnchor; label: string }> = [
  { value: "center", label: "Centro" },
  { value: "top-left", label: "Topo esquerda" },
  { value: "top", label: "Topo" },
  { value: "top-right", label: "Topo direita" },
  { value: "left", label: "Esquerda" },
  { value: "right", label: "Direita" },
  { value: "bottom-left", label: "Base esquerda" },
  { value: "bottom", label: "Base" },
  { value: "bottom-right", label: "Base direita" },
];

const actionVisualStateOptions: Array<{
  value: BattleActionVisualState;
  label: string;
}> = [
  { value: "normal", label: "Normal" },
  { value: "hover", label: "Hover" },
  { value: "pressed", label: "Pressed" },
  { value: "disabled", label: "Disabled" },
  { value: "selected", label: "Selected" },
];

const statusVisualStateOptions: Array<{
  value: BattleStatusVisualState;
  label: string;
}> = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgente" },
  { value: "selected", label: "Selected" },
];

const chroniclesVisualStateOptions: Array<{
  value: BattleChroniclesVisualState;
  label: string;
}> = [
  { value: "normal", label: "Normal" },
  { value: "highlighted", label: "Destacado" },
  { value: "selected", label: "Selected" },
];

const sceneTreeGroups: Array<{
  title: string;
  elements: BattleEditableElementKey[];
}> = [
  { title: "Cena", elements: ["shell"] },
  {
    title: "Centro",
    elements: [
      "board",
      "enemyField",
      "playerField",
      "boardMessage",
      "enemyPill",
      "playerPill",
      "topHand",
      "bottomHand",
    ],
  },
  {
    title: "Laterais",
    elements: [
      "chronicles",
      "enemyTargetDeck",
      "enemyDeck",
      "playerTargetDeck",
      "playerDeck",
      "status",
      "action",
    ],
  },
];

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseInputValue = (
  rawValue: string,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return clampNumber(parsed, min, max);
};

const parseViewportValue = (rawValue: string, fallback: number) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
};

const OPENING_TARGET_ENTRY_STAGGER_MS = 220;
const OPENING_TARGET_ENTRY_DURATION_MS = 780;
const OPENING_TARGET_ENTRY_SETTLE_MS = 560;
const POST_PLAY_HAND_DRAW_DURATION_MS = 940;
const POST_PLAY_HAND_DRAW_SETTLE_MS = 220;
const MULLIGAN_RETURN_DURATION_MS = 760;
const MULLIGAN_RETURN_STAGGER_MS = 110;
const MULLIGAN_DRAW_START_DELAY_MS = 220;
const MULLIGAN_DRAW_DURATION_MS = POST_PLAY_HAND_DRAW_DURATION_MS;
const MULLIGAN_DRAW_SETTLE_MS = POST_PLAY_HAND_DRAW_SETTLE_MS;
const MULLIGAN_SETTLE_MS = 260;
const TARGET_ATTACK_WINDUP_MS = 310;
const TARGET_ATTACK_TRAVEL_MS = 1140;
const TARGET_ATTACK_PAUSE_MS = 260;
const TARGET_ATTACK_EXIT_MS = 960;
const PLAYER = 0;
const ENEMY = 1;
const openingTargetEntryAnchorToolByPreset: Partial<
  Record<BattleLayoutPreviewAnimationPreset, BattleLayoutPreviewAnimationAnchorKey>
> = {
  "opening-target-entry-0": "opening-target-entry-0-origin",
  "opening-target-entry-1": "opening-target-entry-1-origin",
  "opening-target-entry-2": "opening-target-entry-2-origin",
  "opening-target-entry-3": "opening-target-entry-3-origin",
};
const defaultAnimationAnchors: BattleLayoutPreviewAnimationAnchors = {
  openingTargetEntry0Origin: null,
  openingTargetEntry1Origin: null,
  openingTargetEntry2Origin: null,
  openingTargetEntry3Origin: null,
  postPlayHandDrawOrigin: null,
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
};
const animationSetOptions: Array<{
  value: BattleLayoutPreviewAnimationSet;
  label: string;
}> = [
  {
    value: "opening-target-entry-first-round",
    label: "Entrada de alvos - Primeiro Round",
  },
  {
    value: "post-play-hand-draw",
    label: "Compra para mao - Pos jogada",
  },
  {
    value: "mulligan-hand-return",
    label: "Mulligan - Saida",
  },
  {
    value: "mulligan-hand-draw",
    label: "Mulligan - Compra",
  },
  {
    value: "target-attack",
    label: "Ataque de alvos",
  },
];
const animationPresetOptionsBySet: Record<
  BattleLayoutPreviewAnimationSet,
  Array<{ value: BattleLayoutPreviewAnimationPreset; label: string }>
> = {
  "opening-target-entry-first-round": [
    { value: "none", label: "None" },
    { value: "opening-target-entry-0", label: "Entrada 0" },
    { value: "opening-target-entry-1", label: "Entrada 1" },
    { value: "opening-target-entry-2", label: "Entrada 2" },
    { value: "opening-target-entry-3", label: "Entrada 3" },
    { value: "opening-target-entry-simultaneous", label: "Simultanea" },
  ],
  "post-play-hand-draw": [
    { value: "none", label: "None" },
    { value: "post-play-hand-draw", label: "Compra" },
  ],
  "mulligan-hand-return": [
    { value: "none", label: "None" },
    { value: "mulligan-hand-return-1", label: "Saida 1" },
    { value: "mulligan-hand-return-2", label: "Saida 2" },
    { value: "mulligan-hand-return-3", label: "Saida 3" },
  ],
  "mulligan-hand-draw": [
    { value: "none", label: "None" },
    { value: "mulligan-hand-draw-1", label: "Compra 1" },
    { value: "mulligan-hand-draw-2", label: "Compra 2" },
    { value: "mulligan-hand-draw-3", label: "Compra 3" },
  ],
  "target-attack": [
    { value: "none", label: "None" },
    { value: "target-attack-0", label: "Ataque 0" },
    { value: "target-attack-1", label: "Ataque 1" },
    { value: "target-attack-2", label: "Ataque 2" },
    { value: "target-attack-3", label: "Ataque 3" },
  ],
};

const getMulliganCountFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 1 | 2 | 3 | null => {
  if (
    preset === "mulligan-hand-return-1" ||
    preset === "mulligan-hand-draw-1"
  ) {
    return 1;
  }
  if (
    preset === "mulligan-hand-return-2" ||
    preset === "mulligan-hand-draw-2"
  ) {
    return 2;
  }
  if (
    preset === "mulligan-hand-return-3" ||
    preset === "mulligan-hand-draw-3"
  ) {
    return 3;
  }
  return null;
};

const mulliganDrawOriginAnchorToolByPreset = {
  "mulligan-hand-draw-1": "mulligan-hand-draw-1-origin",
  "mulligan-hand-draw-2": "mulligan-hand-draw-2-origin",
  "mulligan-hand-draw-3": "mulligan-hand-draw-3-origin",
} as const;

const mulliganReturnDestinationAnchorToolByPreset = {
  "mulligan-hand-return-1": "mulligan-hand-return-1-destination",
  "mulligan-hand-return-2": "mulligan-hand-return-2-destination",
  "mulligan-hand-return-3": "mulligan-hand-return-3-destination",
} as const;

const getOpeningTargetAnimationPreviewDurationMs = (
  preset: BattleLayoutPreviewAnimationPreset,
) => {
  if (preset === "none") return 0;
  const targetCount =
    preset === "opening-target-entry-simultaneous" ? 4 : 1;
  return (
    Math.max(0, (targetCount - 1) * OPENING_TARGET_ENTRY_STAGGER_MS) +
    OPENING_TARGET_ENTRY_DURATION_MS +
    OPENING_TARGET_ENTRY_SETTLE_MS
  );
};

const getAnimationModeForAction = (
  animationSet: BattleLayoutPreviewAnimationSet,
  kind: "play" | "loop",
): BattleLayoutPreviewAnimationMode => {
  if (animationSet === "post-play-hand-draw") {
    return kind === "loop"
      ? "post-play-hand-draw-loop"
      : "post-play-hand-draw-play-once";
  }
  if (animationSet === "mulligan-hand-return") {
    return kind === "loop"
      ? "mulligan-hand-return-loop"
      : "mulligan-hand-return-play-once";
  }
  if (animationSet === "mulligan-hand-draw") {
    return kind === "loop"
      ? "mulligan-hand-draw-loop"
      : "mulligan-hand-draw-play-once";
  }
  if (animationSet === "target-attack") {
    return kind === "loop" ? "target-attack-loop" : "target-attack-play-once";
  }
  return kind === "loop"
    ? "opening-target-entry-loop"
    : "opening-target-entry-play-once";
};

const getAnimationPreviewDurationMs = (
  animationSet: BattleLayoutPreviewAnimationSet,
  preset: BattleLayoutPreviewAnimationPreset,
) => {
  if (preset === "none") return 0;
  if (animationSet === "post-play-hand-draw") {
    return POST_PLAY_HAND_DRAW_DURATION_MS + POST_PLAY_HAND_DRAW_SETTLE_MS;
  }
  if (animationSet === "mulligan-hand-return") {
    const count = getMulliganCountFromPreset(preset) ?? 0;
    return (
      Math.max(0, (count - 1) * MULLIGAN_RETURN_STAGGER_MS) +
      MULLIGAN_RETURN_DURATION_MS +
      MULLIGAN_SETTLE_MS
    );
  }
  if (animationSet === "mulligan-hand-draw") {
    const count = getMulliganCountFromPreset(preset) ?? 0;
    const startDelayMs =
      MULLIGAN_RETURN_DURATION_MS +
      Math.max(0, count - 1) * MULLIGAN_RETURN_STAGGER_MS +
      MULLIGAN_DRAW_START_DELAY_MS;
    const staggerMs = MULLIGAN_DRAW_DURATION_MS + MULLIGAN_DRAW_SETTLE_MS;
    return (
      startDelayMs +
      Math.max(0, (count - 1) * staggerMs) +
      MULLIGAN_DRAW_DURATION_MS +
      MULLIGAN_SETTLE_MS
    );
  }
  if (animationSet === "target-attack") {
    return (
      TARGET_ATTACK_WINDUP_MS +
      TARGET_ATTACK_TRAVEL_MS +
      TARGET_ATTACK_PAUSE_MS +
      TARGET_ATTACK_EXIT_MS
    );
  }
  return getOpeningTargetAnimationPreviewDurationMs(preset);
};

const getAnimationAnchorStateKey = (
  anchor: BattleLayoutPreviewAnimationAnchorKey,
):
  | keyof BattleLayoutPreviewAnimationAnchors
  | null => {
  switch (anchor) {
    case "opening-target-entry-0-origin":
      return "openingTargetEntry0Origin";
    case "opening-target-entry-1-origin":
      return "openingTargetEntry1Origin";
    case "opening-target-entry-2-origin":
      return "openingTargetEntry2Origin";
    case "opening-target-entry-3-origin":
      return "openingTargetEntry3Origin";
    case "post-play-hand-draw-origin":
      return "postPlayHandDrawOrigin";
    case "mulligan-hand-return-1-destination":
      return "mulliganReturn1Destination";
    case "mulligan-hand-return-2-destination":
      return "mulliganReturn2Destination";
    case "mulligan-hand-return-3-destination":
      return "mulliganReturn3Destination";
    case "mulligan-hand-draw-1-origin":
      return "mulliganDraw1Origin";
    case "mulligan-hand-draw-2-origin":
      return "mulliganDraw2Origin";
    case "mulligan-hand-draw-3-origin":
      return "mulliganDraw3Origin";
    case "target-attack-0-impact":
      return "targetAttack0Impact";
    case "target-attack-1-impact":
      return "targetAttack1Impact";
    case "target-attack-2-impact":
      return "targetAttack2Impact";
    case "target-attack-3-impact":
      return "targetAttack3Impact";
    case "target-attack-0-destination":
      return "targetAttack0Destination";
    case "target-attack-1-destination":
      return "targetAttack1Destination";
    case "target-attack-2-destination":
      return "targetAttack2Destination";
    case "target-attack-3-destination":
      return "targetAttack3Destination";
    default:
      return null;
  }
};

const getTargetAttackIndexFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 0 | 1 | 2 | 3 | null => {
  if (preset === "target-attack-0") return 0;
  if (preset === "target-attack-1") return 1;
  if (preset === "target-attack-2") return 2;
  if (preset === "target-attack-3") return 3;
  return null;
};

const mergeBattleLayoutOverrides = (
  base: BattleLayoutOverrides,
  patch: BattleLayoutOverrides,
): BattleLayoutOverrides => {
  const next: BattleLayoutOverrides = { ...base };

  if (patch.shell) {
    next.shell = {
      ...(base.shell ?? {}),
      ...patch.shell,
    };
  }

  if (patch.board) {
    next.board = {
      ...(base.board ?? {}),
      ...patch.board,
    };
  }

  if (patch.sidebars) {
    next.sidebars = {
      ...(base.sidebars ?? {}),
      ...patch.sidebars,
    };
  }

  if (patch.hud) {
    next.hud = {
      ...(base.hud ?? {}),
      ...patch.hud,
    };
  }

  if (patch.text) {
    next.text = {
      ...(base.text ?? {}),
      ...patch.text,
    };
  }

  if (patch.animations) {
    next.animations = {
      ...(base.animations ?? {}),
      ...patch.animations,
    };
  }

  if (patch.elements) {
    next.elements = { ...(base.elements ?? {}) };
    Object.entries(patch.elements).forEach(([elementKey, elementPatch]) => {
      if (!elementPatch) return;
      next.elements![elementKey as BattleEditableElementKey] = {
        ...(base.elements?.[elementKey as BattleEditableElementKey] ?? {}),
        ...elementPatch,
      };
    });
  }

  return next;
};

const focusAreaToElementKey = (
  focusArea: BattleScenePreviewFocusArea,
): BattleEditableElementKey | null => {
  if (focusArea === "overview") return null;
  return focusArea;
};

const LayoutControl: React.FC<LayoutNumberControl> = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
  ui = "slider",
  axis,
}) => {
  const decrementLabel = axis === "y" ? "Subir" : "Mover para esquerda";
  const incrementLabel = axis === "y" ? "Descer" : "Mover para direita";

  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-amber-900/15 bg-amber-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/75">
          {label}
        </span>
        {ui === "stepper" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={decrementLabel}
              onClick={() => onChange(clampNumber(value - step, min, max))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-900/20 bg-white/85 text-base font-black text-amber-950 hover:bg-white"
            >
              {axis === "y" ? "↑" : "←"}
            </button>
            <input
              type="number"
              className="w-20 rounded-lg border border-amber-900/20 bg-white/80 px-2 py-1 text-right text-sm font-semibold text-amber-950 outline-none"
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={(event) =>
                onChange(parseInputValue(event.target.value, value, min, max))
              }
            />
            <button
              type="button"
              aria-label={incrementLabel}
              onClick={() => onChange(clampNumber(value + step, min, max))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-900/20 bg-white/85 text-base font-black text-amber-950 hover:bg-white"
            >
              {axis === "y" ? "↓" : "→"}
            </button>
          </div>
        ) : (
          <input
            type="number"
            className="w-20 rounded-lg border border-amber-900/20 bg-white/80 px-2 py-1 text-right text-sm font-semibold text-amber-950 outline-none"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(event) =>
              onChange(parseInputValue(event.target.value, value, min, max))
            }
          />
        )}
      </div>
      {ui === "slider" ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="accent-amber-700"
        />
      ) : null}
    </label>
  );
};

const ToggleControl: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 rounded-2xl border border-amber-900/15 bg-amber-50/70 p-3">
    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/75">
      {label}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-amber-700"
    />
  </label>
);

const SelectControl = <Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: Array<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
}) => (
  <label className="flex flex-col gap-2 rounded-2xl border border-amber-900/15 bg-amber-50/70 p-3">
    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/75">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Value)}
      className="rounded-lg border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const TextControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="flex flex-col gap-2 rounded-2xl border border-amber-900/15 bg-amber-50/70 p-3">
    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/75">
      {label}
    </span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 outline-none"
    />
  </label>
);

const readInitialBattleLayoutEditorPreviewState = () => {
  if (typeof window === "undefined") {
    return normalizeBattleLayoutEditorPreviewState({
      fixtureKey: "calm",
      focusArea: "shell",
      selectedElements: ["shell"],
      layoutOverrides: battleActiveLayoutOverrides,
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
      animationAnchors: defaultAnimationAnchors,
    });
  }

  try {
    const storedVersion = window.localStorage.getItem(BATTLE_LAYOUT_MODEL_VERSION_KEY);
    if (storedVersion !== String(BATTLE_LAYOUT_MODEL_VERSION)) {
      window.localStorage.setItem(
        BATTLE_LAYOUT_MODEL_VERSION_KEY,
        String(BATTLE_LAYOUT_MODEL_VERSION),
      );
      window.localStorage.removeItem(BATTLE_LAYOUT_EDITOR_STATE_KEY);
      window.localStorage.removeItem(BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY);
      window.localStorage.removeItem(BATTLE_LAYOUT_EDITOR_BASELINE_KEY);
      return normalizeBattleLayoutEditorPreviewState({
        fixtureKey: "calm",
        focusArea: "shell",
        selectedElements: ["shell"],
        layoutOverrides: battleActiveLayoutOverrides,
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
        animationAnchors: defaultAnimationAnchors,
      });
    }
    const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_STATE_KEY);
    if (!raw) {
      return normalizeBattleLayoutEditorPreviewState({
        fixtureKey: "calm",
        focusArea: "shell",
        selectedElements: ["shell"],
        layoutOverrides: battleActiveLayoutOverrides,
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
        animationAnchors: defaultAnimationAnchors,
      });
    }

    const parsed = JSON.parse(raw);
    return normalizeBattleLayoutEditorPreviewState({
      fixtureKey: parsed.fixtureKey ?? "calm",
      focusArea: parsed.focusArea ?? "shell",
      selectedElements:
        parsed.selectedElements ??
        (parsed.focusArea === "overview"
          ? []
          : [parsed.focusArea ?? "shell"]),
      layoutOverrides: parsed.layoutOverrides ?? battleActiveLayoutOverrides,
      showGrid: parsed.showGrid ?? true,
      gridSize: parsed.gridSize ?? 8,
      snapThreshold: parsed.snapThreshold ?? 12,
      previewDevice: parsed.previewDevice ?? "desktop",
      viewportWidth:
        parsed.viewportWidth ?? battleLayoutPreviewDevices.desktop.width,
      viewportHeight:
        parsed.viewportHeight ?? battleLayoutPreviewDevices.desktop.height,
      actionVisualState: parsed.actionVisualState ?? "normal",
      statusVisualState: parsed.statusVisualState ?? "normal",
      chroniclesVisualState: parsed.chroniclesVisualState ?? "normal",
      animationSet: parsed.animationSet ?? "opening-target-entry-first-round",
      animationMode: "idle",
      animationPreset: parsed.animationPreset ?? "none",
      animationRunId: 0,
      animationAnchorTool: null,
      animationDebugEnabled: parsed.animationDebugEnabled ?? false,
      animationAnchors: {
        openingTargetEntry0Origin:
          parsed.animationAnchors?.openingTargetEntry0Origin ?? null,
        openingTargetEntry1Origin:
          parsed.animationAnchors?.openingTargetEntry1Origin ?? null,
        openingTargetEntry2Origin:
          parsed.animationAnchors?.openingTargetEntry2Origin ?? null,
        openingTargetEntry3Origin:
          parsed.animationAnchors?.openingTargetEntry3Origin ?? null,
        postPlayHandDrawOrigin:
          parsed.animationAnchors?.postPlayHandDrawOrigin ?? null,
        mulliganReturn1Destination:
          parsed.animationAnchors?.mulliganReturn1Destination ?? null,
        mulliganReturn2Destination:
          parsed.animationAnchors?.mulliganReturn2Destination ?? null,
        mulliganReturn3Destination:
          parsed.animationAnchors?.mulliganReturn3Destination ?? null,
        mulliganDraw1Origin:
          parsed.animationAnchors?.mulliganDraw1Origin ?? null,
        mulliganDraw2Origin:
          parsed.animationAnchors?.mulliganDraw2Origin ?? null,
        mulliganDraw3Origin:
          parsed.animationAnchors?.mulliganDraw3Origin ?? null,
        targetAttack0Impact:
          parsed.animationAnchors?.targetAttack0Impact ?? null,
        targetAttack1Impact:
          parsed.animationAnchors?.targetAttack1Impact ?? null,
        targetAttack2Impact:
          parsed.animationAnchors?.targetAttack2Impact ?? null,
        targetAttack3Impact:
          parsed.animationAnchors?.targetAttack3Impact ?? null,
        targetAttack0Destination:
          parsed.animationAnchors?.targetAttack0Destination ?? null,
        targetAttack1Destination:
          parsed.animationAnchors?.targetAttack1Destination ?? null,
        targetAttack2Destination:
          parsed.animationAnchors?.targetAttack2Destination ?? null,
        targetAttack3Destination:
          parsed.animationAnchors?.targetAttack3Destination ?? null,
      },
    });
  } catch {
    return normalizeBattleLayoutEditorPreviewState({
      fixtureKey: "calm",
      focusArea: "shell",
      selectedElements: ["shell"],
      layoutOverrides: battleActiveLayoutOverrides,
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
      animationAnchors: defaultAnimationAnchors,
    });
  }
};

export const BattleLayoutEditor: React.FC = () => {
  const initialPreviewState = useMemo(
    () => readInitialBattleLayoutEditorPreviewState(),
    [],
  );
  const [fixtureKey, setFixtureKey] = useState<BattleSceneFixtureKey>(
    initialPreviewState.fixtureKey,
  );
  const [focusArea, setFocusArea] =
    useState<BattleScenePreviewFocusArea>(initialPreviewState.focusArea);
  const [selectedElements, setSelectedElements] = useState<
    BattleScenePreviewFocusArea[]
  >(initialPreviewState.selectedElements);
  const [layoutOverrides, setLayoutOverrides] = useState<BattleLayoutOverrides>(
    initialPreviewState.layoutOverrides,
  );
  const [showGrid, setShowGrid] = useState(initialPreviewState.showGrid);
  const [gridSize, setGridSize] = useState(initialPreviewState.gridSize);
  const [snapThreshold, setSnapThreshold] = useState(initialPreviewState.snapThreshold);
  const [undoStack, setUndoStack] = useState<BattleLayoutOverrides[]>([]);
  const [redoStack, setRedoStack] = useState<BattleLayoutOverrides[]>([]);
  const [previewScale, setPreviewScale] = useState(65);
  const [previewDevice, setPreviewDevice] =
    useState<BattleLayoutPreviewDevice>(initialPreviewState.previewDevice);
  const [viewportWidth, setViewportWidth] = useState(
    initialPreviewState.viewportWidth,
  );
  const [viewportHeight, setViewportHeight] = useState(
    initialPreviewState.viewportHeight,
  );
  const [actionVisualState, setActionVisualState] =
    useState<BattleActionVisualState>(initialPreviewState.actionVisualState);
  const [statusVisualState, setStatusVisualState] =
    useState<BattleStatusVisualState>(initialPreviewState.statusVisualState);
  const [chroniclesVisualState, setChroniclesVisualState] =
    useState<BattleChroniclesVisualState>(
      initialPreviewState.chroniclesVisualState,
    );
  const [animationSet, setAnimationSet] =
    useState<BattleLayoutPreviewAnimationSet>(
      initialPreviewState.animationSet ?? "opening-target-entry-first-round",
    );
  const [animationMode, setAnimationMode] =
    useState<BattleLayoutPreviewAnimationMode>("idle");
  const [animationPreset, setAnimationPreset] =
    useState<BattleLayoutPreviewAnimationPreset>(
      initialPreviewState.animationPreset ?? "none",
    );
  const [animationRunId, setAnimationRunId] = useState(0);
  const [animationAnchorTool, setAnimationAnchorTool] = useState<
    BattleLayoutPreviewAnimationAnchorKey | null
  >(initialPreviewState.animationAnchorTool ?? null);
  const [animationDebugEnabled, setAnimationDebugEnabled] = useState(
    initialPreviewState.animationDebugEnabled ?? false,
  );
  const [animationAnchors, setAnimationAnchors] = useState<BattleLayoutPreviewAnimationAnchors>(
    initialPreviewState.animationAnchors ?? {
      openingTargetEntry0Origin:
        initialPreviewState.layoutOverrides.animations?.openingTargetEntry0Origin ?? null,
      openingTargetEntry1Origin:
        initialPreviewState.layoutOverrides.animations?.openingTargetEntry1Origin ?? null,
      openingTargetEntry2Origin:
        initialPreviewState.layoutOverrides.animations?.openingTargetEntry2Origin ?? null,
      openingTargetEntry3Origin:
        initialPreviewState.layoutOverrides.animations?.openingTargetEntry3Origin ?? null,
      postPlayHandDrawOrigin:
        initialPreviewState.layoutOverrides.animations?.postPlayHandDrawOrigin ?? null,
      mulliganReturn1Destination:
        initialPreviewState.layoutOverrides.animations?.mulliganReturn1Destination ?? null,
      mulliganReturn2Destination:
        initialPreviewState.layoutOverrides.animations?.mulliganReturn2Destination ?? null,
      mulliganReturn3Destination:
        initialPreviewState.layoutOverrides.animations?.mulliganReturn3Destination ?? null,
      mulliganDraw1Origin:
        initialPreviewState.layoutOverrides.animations?.mulliganDraw1Origin ?? null,
      mulliganDraw2Origin:
        initialPreviewState.layoutOverrides.animations?.mulliganDraw2Origin ?? null,
      mulliganDraw3Origin:
        initialPreviewState.layoutOverrides.animations?.mulliganDraw3Origin ?? null,
      targetAttack0Impact:
        initialPreviewState.layoutOverrides.animations?.targetAttack0Impact ?? null,
      targetAttack1Impact:
        initialPreviewState.layoutOverrides.animations?.targetAttack1Impact ?? null,
      targetAttack2Impact:
        initialPreviewState.layoutOverrides.animations?.targetAttack2Impact ?? null,
      targetAttack3Impact:
        initialPreviewState.layoutOverrides.animations?.targetAttack3Impact ?? null,
      targetAttack0Destination:
        initialPreviewState.layoutOverrides.animations?.targetAttack0Destination ?? null,
      targetAttack1Destination:
        initialPreviewState.layoutOverrides.animations?.targetAttack1Destination ?? null,
      targetAttack2Destination:
        initialPreviewState.layoutOverrides.animations?.targetAttack2Destination ?? null,
      targetAttack3Destination:
        initialPreviewState.layoutOverrides.animations?.targetAttack3Destination ?? null,
    },
  );
  const animationResetTimerRef = useRef<number | null>(null);
  const [presetName, setPresetName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [elementPresets, setElementPresets] = useState<
    Record<string, Partial<BattleElementPropertyConfig>>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_PRESETS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, Partial<BattleElementPropertyConfig>>) : {};
    } catch {
      return {};
    }
  });
  const [savedGroups, setSavedGroups] = useState<BattleEditorGroup[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_GROUPS_KEY);
      return raw ? (JSON.parse(raw) as BattleEditorGroup[]) : [];
    } catch {
      return [];
    }
  });
  const [importText, setImportText] = useState(
    JSON.stringify(pruneBattleLayoutOverrides(initialPreviewState.layoutOverrides), null, 2),
  );
  const [pendingImportOverrides, setPendingImportOverrides] =
    useState<BattleLayoutOverrides | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isPresetSaveConfirmOpen, setIsPresetSaveConfirmOpen] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetSaveFeedback, setPresetSaveFeedback] = useState<string | null>(null);
  const [resetBaseline, setResetBaseline] = useState<BattleLayoutOverrides>(() => {
    if (typeof window === "undefined") {
      return pruneBattleLayoutOverrides(battleActiveLayoutOverrides);
    }
    try {
      const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_BASELINE_KEY);
      if (raw) {
        return pruneBattleLayoutOverrides(JSON.parse(raw) as BattleLayoutOverrides);
      }
    } catch {
      // fall through to active layout
    }
    return readActiveBattleLayoutOverrides();
  });
  const dragBaselineRef = useRef<BattleLayoutOverrides | null>(null);
  const dragSelectionBaselineRef = useRef<
    Partial<Record<BattleEditableElementKey, { x: number; y: number }>>
  >({});
  const layoutOverridesRef = useRef(layoutOverrides);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const layout = useMemo(
    () => createBattleLayoutConfig(pruneBattleLayoutOverrides(layoutOverrides)),
    [layoutOverrides],
  );
  const normalizedOverrides = useMemo(
    () => pruneBattleLayoutOverrides(layoutOverrides),
    [layoutOverrides],
  );
  const getSelectedAnimationOriginAnchorTool = useCallback(() => {
    if (animationSet === "post-play-hand-draw") {
      return animationPreset === "post-play-hand-draw"
        ? ("post-play-hand-draw-origin" as const)
        : null;
    }
    if (animationSet === "mulligan-hand-draw") {
      return mulliganDrawOriginAnchorToolByPreset[animationPreset] ?? null;
    }
    return openingTargetEntryAnchorToolByPreset[animationPreset] ?? null;
  }, [animationPreset, animationSet]);
  const getSelectedMulliganReturnDestinationAnchorTool = useCallback(() => {
    if (animationSet !== "mulligan-hand-return") return null;
    return mulliganReturnDestinationAnchorToolByPreset[animationPreset] ?? null;
  }, [animationPreset, animationSet]);
  const getSelectedTargetAttackImpactAnchorTool = useCallback(() => {
    const attackIndex = getTargetAttackIndexFromPreset(animationPreset);
    if (animationSet !== "target-attack" || attackIndex == null) return null;
    return `target-attack-${attackIndex}-impact` as const;
  }, [animationPreset, animationSet]);
  const getSelectedTargetAttackDestinationAnchorTool = useCallback(() => {
    const attackIndex = getTargetAttackIndexFromPreset(animationPreset);
    if (animationSet !== "target-attack" || attackIndex == null) return null;
    return `target-attack-${attackIndex}-destination` as const;
  }, [animationPreset, animationSet]);
  const ensureAnimationAnchor = useCallback((anchorTool: BattleLayoutPreviewAnimationAnchorKey | null) => {
    if (!anchorTool) return;
    setAnimationAnchors((current) => {
      const anchorStateKey = getAnimationAnchorStateKey(anchorTool);
      if (!anchorStateKey) return current;
      if (current[anchorStateKey]) return current;
      const fixture = battleSceneFixtures[fixtureKey] ?? battleSceneFixtures.calm;
      let anchorRect = getBattleElementSceneRect("playerTargetDeck", layout);

      if (anchorTool.startsWith("opening-target-entry-")) {
        const allStagedTargets = [
          ...fixture.scene.board.playerFieldSlots.map((slot, slotIndex) => ({
            side: PLAYER,
            slotIndex,
            hasTarget: Boolean(slot.displayedTarget),
          })),
          ...fixture.scene.board.enemyFieldSlots.map((slot, slotIndex) => ({
            side: ENEMY,
            slotIndex,
            hasTarget: Boolean(slot.displayedTarget),
          })),
        ].filter((entry) => entry.hasTarget);
        const entryIndex =
          animationPreset === "opening-target-entry-0"
            ? 0
            : animationPreset === "opening-target-entry-1"
              ? 1
              : animationPreset === "opening-target-entry-2"
                ? 2
                : 3;
        const selectedEntry = allStagedTargets[entryIndex];
        anchorRect = getBattleElementSceneRect(
          selectedEntry?.side === ENEMY ? "enemyTargetDeck" : "playerTargetDeck",
          layout,
        );
      } else if (anchorTool === "post-play-hand-draw-origin") {
        anchorRect = getBattleElementSceneRect("playerDeck", layout);
      } else if (anchorTool.startsWith("mulligan-hand-draw-")) {
        anchorRect = getBattleElementSceneRect("playerDeck", layout);
      } else if (anchorTool.startsWith("mulligan-hand-return-")) {
        anchorRect = getBattleElementSceneRect("playerDeck", layout);
      } else if (anchorTool.includes("-impact")) {
        const attackIndex = getTargetAttackIndexFromPreset(animationPreset) ?? 0;
        const side = attackIndex >= 2 ? ENEMY : PLAYER;
        const slotIndex = attackIndex % 2;
        const fieldRect = getBattleElementSceneRect(
          side === PLAYER ? "playerField" : "enemyField",
          layout,
        );
        const laneWidth = fieldRect.width;
        const slotWidth = laneWidth / 2;
        anchorRect = {
          x: fieldRect.x + slotWidth * slotIndex,
          y: fieldRect.y,
          width: slotWidth,
          height: fieldRect.height,
        };
      } else if (anchorTool.includes("-destination")) {
        const attackIndex = getTargetAttackIndexFromPreset(animationPreset) ?? 0;
        anchorRect = getBattleElementSceneRect(
          attackIndex >= 2 ? "enemyTargetDeck" : "playerTargetDeck",
          layout,
        );
      }

      const nextPoint: BattleAnimationAnchorPoint = {
        x: Math.round(anchorRect.x + anchorRect.width / 2),
        y: Math.round(anchorRect.y + anchorRect.height / 2),
      };
      setLayoutOverrides((previous) =>
        pruneBattleLayoutOverrides({
          ...previous,
          animations: {
            ...(previous.animations ?? {}),
            [anchorStateKey]: nextPoint,
          },
        }),
      );
      return {
        ...current,
        [anchorStateKey]: nextPoint,
      };
    });
  }, [animationPreset, fixtureKey, layout]);
  const isAnimationFeatureDisabled = animationPreset === "none";
  const animationPresetOptions = animationPresetOptionsBySet[animationSet];
  const selectedAnimationOriginAnchorTool = getSelectedAnimationOriginAnchorTool();
  const selectedMulliganReturnDestinationAnchorTool =
    getSelectedMulliganReturnDestinationAnchorTool();
  const selectedTargetAttackImpactAnchorTool = getSelectedTargetAttackImpactAnchorTool();
  const selectedTargetAttackDestinationAnchorTool = getSelectedTargetAttackDestinationAnchorTool();
  const isIndividualAnimationPreset =
    selectedAnimationOriginAnchorTool !== null ||
    selectedMulliganReturnDestinationAnchorTool !== null ||
    selectedTargetAttackImpactAnchorTool !== null ||
    selectedTargetAttackDestinationAnchorTool !== null;
  const isOriginAnchorAvailable = selectedAnimationOriginAnchorTool !== null;
  const isImpactAnchorAvailable = selectedTargetAttackImpactAnchorTool !== null;
  const isDestinationAnchorAvailable =
    selectedMulliganReturnDestinationAnchorTool !== null ||
    selectedTargetAttackDestinationAnchorTool !== null;

  useEffect(() => {
    layoutOverridesRef.current = layoutOverrides;
  }, [layoutOverrides]);

  useEffect(() => {
    setAnimationAnchors({
      openingTargetEntry0Origin:
        layoutOverrides.animations?.openingTargetEntry0Origin ?? null,
      openingTargetEntry1Origin:
        layoutOverrides.animations?.openingTargetEntry1Origin ?? null,
      openingTargetEntry2Origin:
        layoutOverrides.animations?.openingTargetEntry2Origin ?? null,
      openingTargetEntry3Origin:
        layoutOverrides.animations?.openingTargetEntry3Origin ?? null,
      postPlayHandDrawOrigin:
        layoutOverrides.animations?.postPlayHandDrawOrigin ?? null,
      mulliganReturn1Destination:
        layoutOverrides.animations?.mulliganReturn1Destination ?? null,
      mulliganReturn2Destination:
        layoutOverrides.animations?.mulliganReturn2Destination ?? null,
      mulliganReturn3Destination:
        layoutOverrides.animations?.mulliganReturn3Destination ?? null,
      mulliganDraw1Origin:
        layoutOverrides.animations?.mulliganDraw1Origin ?? null,
      mulliganDraw2Origin:
        layoutOverrides.animations?.mulliganDraw2Origin ?? null,
      mulliganDraw3Origin:
        layoutOverrides.animations?.mulliganDraw3Origin ?? null,
      targetAttack0Impact:
        layoutOverrides.animations?.targetAttack0Impact ?? null,
      targetAttack1Impact:
        layoutOverrides.animations?.targetAttack1Impact ?? null,
      targetAttack2Impact:
        layoutOverrides.animations?.targetAttack2Impact ?? null,
      targetAttack3Impact:
        layoutOverrides.animations?.targetAttack3Impact ?? null,
      targetAttack0Destination:
        layoutOverrides.animations?.targetAttack0Destination ?? null,
      targetAttack1Destination:
        layoutOverrides.animations?.targetAttack1Destination ?? null,
      targetAttack2Destination:
        layoutOverrides.animations?.targetAttack2Destination ?? null,
      targetAttack3Destination:
        layoutOverrides.animations?.targetAttack3Destination ?? null,
    });
  }, [layoutOverrides.animations]);

  const selectElements = useCallback((
    nextFocus: BattleScenePreviewFocusArea,
    nextSelection?: BattleScenePreviewFocusArea[],
  ) => {
    setFocusArea(nextFocus);
    if (nextFocus === "overview") {
      setSelectedElements(nextSelection ?? []);
      return;
    }
    setSelectedElements(
      nextSelection && nextSelection.length > 0 ? nextSelection : [nextFocus],
    );
  }, []);

  const toggleElementSelection = useCallback((element: BattleScenePreviewFocusArea) => {
    setSelectedElements((current) => {
      if (element === "shell") {
        const next: BattleScenePreviewFocusArea[] = current.includes("shell")
          ? []
          : ["shell"];
        if (next.length === 0) {
          setFocusArea("overview");
          return [];
        }
        setFocusArea("shell");
        return next;
      }
      const exists = current.includes(element);
      const currentWithoutShell = current.filter(
        (item): item is Exclude<BattleScenePreviewFocusArea, "shell"> =>
          item !== "shell",
      );
      const next = exists
        ? currentWithoutShell.filter((item) => item !== element)
        : [...currentWithoutShell.filter((item) => item !== element), element];
      if (next.length === 0) {
        setFocusArea("overview");
        return [];
      }
      setFocusArea(next[next.length - 1]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BATTLE_LAYOUT_MODEL_VERSION_KEY,
      String(BATTLE_LAYOUT_MODEL_VERSION),
    );
    const nextState = normalizeBattleLayoutEditorPreviewState({
      fixtureKey,
      focusArea,
      selectedElements,
      layoutOverrides,
      showGrid,
      gridSize,
      snapThreshold,
      previewDevice,
      viewportWidth,
      viewportHeight,
      actionVisualState,
      statusVisualState,
      chroniclesVisualState,
      animationSet,
      animationMode,
      animationPreset,
      animationRunId,
      animationAnchorTool,
      animationDebugEnabled,
      animationAnchors,
    });
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_STATE_KEY,
      JSON.stringify(nextState),
    );
    window.localStorage.setItem(
      BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY,
      JSON.stringify(pruneBattleLayoutOverrides(layoutOverrides)),
    );
    window.dispatchEvent(new Event(BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY));
    previewFrameRef.current?.contentWindow?.postMessage(
      {
        type: BATTLE_LAYOUT_PREVIEW_STATE_MESSAGE_TYPE,
        payload: nextState,
      },
      window.location.origin,
    );
  }, [
    fixtureKey,
    focusArea,
    selectedElements,
    layoutOverrides,
    showGrid,
    gridSize,
    snapThreshold,
    previewDevice,
    viewportWidth,
    viewportHeight,
    actionVisualState,
    statusVisualState,
    chroniclesVisualState,
    animationSet,
    animationMode,
    animationPreset,
    animationRunId,
    animationAnchorTool,
    animationDebugEnabled,
    animationAnchors,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (animationResetTimerRef.current !== null) {
      window.clearTimeout(animationResetTimerRef.current);
      animationResetTimerRef.current = null;
    }

    const isPlayOnceMode =
      animationMode === "opening-target-entry-play-once" ||
      animationMode === "post-play-hand-draw-play-once" ||
      animationMode === "target-attack-play-once";
    if (!isPlayOnceMode) return;

    animationResetTimerRef.current = window.setTimeout(() => {
      setAnimationMode("idle");
      setAnimationRunId((current) => current + 1);
      animationResetTimerRef.current = null;
    }, getAnimationPreviewDurationMs(animationSet, animationPreset) + 40);

    return () => {
      if (animationResetTimerRef.current !== null) {
        window.clearTimeout(animationResetTimerRef.current);
        animationResetTimerRef.current = null;
      }
    };
  }, [animationMode, animationPreset, animationSet]);

  useEffect(() => {
    if (typeof window === "undefined") return;

  const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; payload?: unknown }
        | undefined;
      if (!data || data.type !== BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE) return;
      const payload = data.payload as
        | {
            kind:
              | "select-element"
              | "begin-element-edit"
              | "update-element-edit"
              | "end-element-edit"
              | "update-animation-anchor";
            element: BattleEditableElementKey;
            patch?: Partial<BattleElementPropertyConfig>;
            additive?: boolean;
            toggle?: boolean;
            anchor?: BattleLayoutPreviewAnimationAnchorKey;
            point?: { x: number; y: number };
          }
        | undefined;
      if (!payload) return;

      if (payload.kind === "select-element") {
        if (payload.element === "shell") {
          if (payload.toggle) {
            toggleElementSelection("shell");
            return;
          }
          selectElements("shell", ["shell"]);
          return;
        }
        if (payload.toggle) {
          toggleElementSelection(payload.element);
          return;
        }
        if (payload.additive) {
          const element = payload.element as Exclude<BattleScenePreviewFocusArea, "shell">;
          setSelectedElements((current) => {
            const currentWithoutShell = current.filter(
              (item): item is Exclude<BattleScenePreviewFocusArea, "shell"> =>
                item !== "shell",
            );
            const next: BattleScenePreviewFocusArea[] = currentWithoutShell.includes(element)
              ? currentWithoutShell
              : [...currentWithoutShell, element];
            setFocusArea(element);
            return next;
          });
          return;
        }
        selectElements(payload.element, [payload.element]);
        return;
      }

      if (payload.kind === "begin-element-edit") {
        dragBaselineRef.current = layoutOverridesRef.current;
        dragSelectionBaselineRef.current = selectedElements.reduce<
          Partial<Record<BattleEditableElementKey, { x: number; y: number }>>
        >((acc, area) => {
          const key = focusAreaToElementKey(area);
          if (!key) return acc;
          const config = layoutOverridesRef.current.elements?.[key];
          const fallback = layout.elements[key];
          acc[key] = {
            x: config?.x ?? fallback.x,
            y: config?.y ?? fallback.y,
          };
          return acc;
        }, {});
        if (!selectedElements.includes(payload.element)) {
          selectElements(payload.element, [payload.element]);
        } else {
          setFocusArea(payload.element);
        }
        return;
      }

      if (payload.kind === "update-element-edit" && payload.patch) {
        if (
          selectedElements.length > 1 &&
          selectedElements.includes(payload.element) &&
          payload.patch.width === undefined &&
          payload.patch.height === undefined &&
          (payload.patch.x !== undefined || payload.patch.y !== undefined)
        ) {
          const baseline = dragSelectionBaselineRef.current;
          const anchor = baseline[payload.element];
          if (anchor) {
            const deltaX =
              payload.patch.x !== undefined ? payload.patch.x - anchor.x : 0;
            const deltaY =
              payload.patch.y !== undefined ? payload.patch.y - anchor.y : 0;

            const nextElements = {
              ...(layoutOverridesRef.current.elements ?? {}),
            };

            selectedElements.forEach((area) => {
              const key = focusAreaToElementKey(area);
              if (!key) return;
              const base = baseline[key];
              if (!base) return;
              if (key === payload.element) {
                nextElements[key] = {
                  ...(layoutOverridesRef.current.elements?.[key] ?? {}),
                  ...payload.patch,
                };
                return;
              }
              nextElements[key] = {
                ...(layoutOverridesRef.current.elements?.[key] ?? {}),
                x: base.x + deltaX,
                y: base.y + deltaY,
              };
            });

            applyOverridesWithoutHistory({
              ...layoutOverridesRef.current,
              elements: nextElements,
            });
            return;
          }
        }
        updateElementPropertyWithoutHistory(payload.element, payload.patch);
        return;
      }

      if (payload.kind === "end-element-edit") {
        const baseline = dragBaselineRef.current;
        dragBaselineRef.current = null;
        dragSelectionBaselineRef.current = {};
        if (
          baseline &&
          JSON.stringify(pruneBattleLayoutOverrides(baseline)) !==
            JSON.stringify(pruneBattleLayoutOverrides(layoutOverridesRef.current))
        ) {
          setUndoStack((stack) => [...stack, pruneBattleLayoutOverrides(baseline)]);
          setRedoStack([]);
        }
        return;
      }

      if (
        payload.kind === "update-animation-anchor" &&
        payload.point
      ) {
        const anchorStateKey = getAnimationAnchorStateKey(payload.anchor);
        if (!anchorStateKey) return;
        const nextPoint: BattleAnimationAnchorPoint = {
          x: clampNumber(Math.round(payload.point.x), 0, 1600),
          y: clampNumber(Math.round(payload.point.y), 0, 900),
        };
        setAnimationAnchors((current) => ({
          ...current,
          [anchorStateKey]: nextPoint,
        }));
        applyOverridesWithoutHistory({
          ...layoutOverridesRef.current,
          animations: {
            ...(layoutOverridesRef.current.animations ?? {}),
            [anchorStateKey]: nextPoint,
          },
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [layout, selectElements, selectedElements, toggleElementSelection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_PRESETS_KEY,
      JSON.stringify(elementPresets),
    );
  }, [elementPresets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_GROUPS_KEY,
      JSON.stringify(savedGroups),
    );
  }, [savedGroups]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_BASELINE_KEY,
      JSON.stringify(pruneBattleLayoutOverrides(resetBaseline)),
    );
  }, [resetBaseline]);

  const fixtureMeta = battleSceneFixtureMeta[fixtureKey];

  const applyOverrides = (next: BattleLayoutOverrides, pushHistory = true) => {
    const prunedNext = pruneBattleLayoutOverrides(next);
    setLayoutOverrides((current) => {
      if (JSON.stringify(current) === JSON.stringify(prunedNext)) {
        return current;
      }
      if (pushHistory) {
        setUndoStack((stack) => [...stack, current]);
        setRedoStack([]);
      }
      return prunedNext;
    });
  };

  const applyOverridesWithoutHistory = (next: BattleLayoutOverrides) => {
    const prunedNext = pruneBattleLayoutOverrides(next);
    setLayoutOverrides(prunedNext);
  };

  const updateLayout = <
    Section extends keyof BattleLayoutConfig,
    Key extends keyof BattleLayoutConfig[Section],
  >(
    section: Section,
    key: Key,
    value: BattleLayoutConfig[Section][Key],
  ) => {
    applyOverrides({
      ...layoutOverrides,
      [section]: {
        ...(layoutOverrides[section] ?? {}),
        [key]: value,
      },
    });
  };

  const updateElementProperty = <
    Key extends keyof BattleElementPropertyConfig,
  >(
    elementKey: BattleEditableElementKey,
    key: Key,
    value: BattleElementPropertyConfig[Key],
  ) => {
    applyOverrides({
      ...layoutOverrides,
      elements: {
        ...(layoutOverrides.elements ?? {}),
        [elementKey]: {
          ...(layoutOverrides.elements?.[elementKey] ?? {}),
          [key]: value,
        },
      },
    });
  };

  const updateSelectedElementsProperty = <
    Key extends keyof BattleElementPropertyConfig,
  >(
    key: Key,
    value: BattleElementPropertyConfig[Key],
  ) => {
    const selectedElementKeys = selectedElements
      .map((item) => focusAreaToElementKey(item))
      .filter((item): item is BattleEditableElementKey => item !== null);

    if (selectedElementKeys.length === 0) return;

    const nextElements = { ...(layoutOverrides.elements ?? {}) };
    selectedElementKeys.forEach((elementKey) => {
      nextElements[elementKey] = {
        ...(layoutOverrides.elements?.[elementKey] ?? {}),
        [key]: value,
      };
    });

    applyOverrides({
      ...layoutOverrides,
      elements: nextElements,
    });
  };

  const updateSelectedElementsAxis = (
    key: "x" | "y",
    value: number,
  ) => {
    if (!primarySelectedElementKey || selectedElementKeys.length === 0) return;

    const primaryCurrent = layout.elements[primarySelectedElementKey][key];
    const delta = value - primaryCurrent;
    if (delta === 0) return;

    const nextElements = { ...(layoutOverrides.elements ?? {}) };
    selectedElementKeys.forEach((elementKey) => {
      const currentConfig = layout.elements[elementKey];
      nextElements[elementKey] = {
        ...(layoutOverrides.elements?.[elementKey] ?? {}),
        [key]: currentConfig[key] + delta,
      };
    });

    applyOverrides({
      ...layoutOverrides,
      elements: nextElements,
    });
  };

  const updateElementPropertyWithoutHistory = (
    elementKey: BattleEditableElementKey,
    patch: Partial<BattleElementPropertyConfig>,
  ) => {
    applyOverridesWithoutHistory({
      ...layoutOverridesRef.current,
      elements: {
        ...(layoutOverridesRef.current.elements ?? {}),
        [elementKey]: {
          ...(layoutOverridesRef.current.elements?.[elementKey] ?? {}),
          ...patch,
        },
      },
    });
  };

  const updateText = <Key extends keyof BattleLayoutConfig["text"]>(
    key: Key,
    value: BattleLayoutConfig["text"][Key],
  ) => {
    applyOverrides({
      ...layoutOverrides,
      text: {
        ...(layoutOverrides.text ?? {}),
        [key]: value,
      },
    });
  };

  const undoLayout = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [layoutOverrides, ...stack]);
    setLayoutOverrides(previous);
  };

  const redoLayout = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    setRedoStack(rest);
    setUndoStack((stack) => [...stack, layoutOverrides]);
    setLayoutOverrides(next);
  };

  const resetLayout = () => {
    applyOverrides(resetBaseline);
    setImportText(
      JSON.stringify(pruneBattleLayoutOverrides(resetBaseline), null, 2),
    );
  };

  const copyLayoutJson = async () => {
    const json = currentJsonValue;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    }
  };

  const copyPresetTs = async () => {
    const ts = createBattleLayoutPresetSource(layoutOverrides);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(ts);
    }
  };

  const downloadPresetTs = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const ts = createBattleLayoutPresetSource(layoutOverrides);
    const blob = new Blob([ts], { type: "text/typescript;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "BattleLayoutPreset.ts";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const approveLayoutAsDefaults = async () => {
    if (typeof window === "undefined") return;
    setIsSavingPreset(true);
    setPresetSaveFeedback(null);
    const approvedOverrides = normalizedOverrides;

    try {
      const response = await fetch("/__battle-layout/preset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          overrides: approvedOverrides,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Nao foi possivel salvar o preset.");
      }

      setUndoStack([]);
      setRedoStack([]);
      setResetBaseline(approvedOverrides);
      setLayoutOverrides(approvedOverrides);
      setFocusArea("overview");
      setSelectedElements([]);
      setPresetSaveFeedback("Preset salvo no arquivo e promovido como novo default.");
      setIsPresetSaveConfirmOpen(false);
    } catch (error) {
      setPresetSaveFeedback(
        error instanceof Error ? error.message : "Nao foi possivel salvar o preset.",
      );
    } finally {
      setIsSavingPreset(false);
    }
  };

  const applyImportText = () => {
    try {
      const parsed = JSON.parse(importText) as BattleLayoutOverrides;
      const prunedParsed = pruneBattleLayoutOverrides(parsed);
      setPendingImportOverrides(prunedParsed);
      setIsImportConfirmOpen(true);
    } catch {
      // keep editor resilient; invalid JSON just doesn't apply
    }
  };

  const confirmImportText = () => {
    if (!pendingImportOverrides) return;
    const mergedOverrides = mergeBattleLayoutOverrides(
      pruneBattleLayoutOverrides(layoutOverridesRef.current),
      pendingImportOverrides,
    );
    applyOverrides(mergedOverrides);
    setResetBaseline(mergedOverrides);
    setPendingImportOverrides(null);
    setIsImportConfirmOpen(false);
  };

  const cancelImportText = () => {
    setPendingImportOverrides(null);
    setIsImportConfirmOpen(false);
  };

  const copyElementProperties = async () => {
    if (!activeElementKey || !activeElementConfig || typeof window === "undefined") return;
    const payload = {
      element: activeElementKey,
      properties: activeElementConfig,
    };
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_ELEMENT_CLIPBOARD_KEY,
      JSON.stringify(payload),
    );
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(JSON.stringify(payload.properties, null, 2));
    }
  };

  const pasteElementProperties = () => {
    if (!activeElementKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_ELEMENT_CLIPBOARD_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        element?: BattleEditableElementKey;
        properties?: Partial<BattleElementPropertyConfig>;
      };
      if (!parsed.properties) return;
      applyOverrides({
        ...layoutOverrides,
        elements: {
          ...(layoutOverrides.elements ?? {}),
          [activeElementKey]: {
            ...(layoutOverrides.elements?.[activeElementKey] ?? {}),
            ...parsed.properties,
          },
        },
      });
    } catch {
      // ignore invalid clipboard payload
    }
  };

  const saveElementPreset = () => {
    if (!activeElementConfig || !presetName.trim()) return;
    setElementPresets((current) => ({
      ...current,
      [presetName.trim()]: activeElementConfig,
    }));
  };

  const applyElementPreset = (name: string) => {
    if (!activeElementKey) return;
    const preset = elementPresets[name];
    if (!preset) return;
    applyOverrides({
      ...layoutOverrides,
      elements: {
        ...(layoutOverrides.elements ?? {}),
        [activeElementKey]: {
          ...(layoutOverrides.elements?.[activeElementKey] ?? {}),
          ...preset,
        },
      },
    });
  };

  const deleteElementPreset = (name: string) => {
    setElementPresets((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const saveSelectionAsGroup = () => {
    if (selectedElementKeys.length === 0) return;
    const trimmedName = groupName.trim();
    if (!trimmedName) return;
    const nextGroup: BattleEditorGroup = {
      id: `group-${Date.now()}`,
      name: trimmedName,
      elements: selectedElementKeys,
    };
    setSavedGroups((current) => [...current, nextGroup]);
    setGroupName("");
  };

  const updateGroupFromSelection = (groupId: string) => {
    if (selectedElementKeys.length === 0) return;
    setSavedGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, elements: selectedElementKeys } : group,
      ),
    );
  };

  const renameGroup = (groupId: string, name: string) => {
    setSavedGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    );
  };

  const deleteGroup = (groupId: string) => {
    setSavedGroups((current) => current.filter((group) => group.id !== groupId));
  };

  const selectSavedGroup = (group: BattleEditorGroup) => {
    const normalizedSelection = Array.from(new Set(group.elements));
    if (normalizedSelection.length === 0) return;
    if (normalizedSelection.includes("shell")) {
      selectElements("shell", ["shell"]);
      return;
    }
    selectElements(normalizedSelection[0], normalizedSelection);
  };

  const toggleGroupSelection = (elements: BattleEditableElementKey[]) => {
    const normalizedSelection = Array.from(new Set(elements));
    const normalizedKeys = normalizedSelection
      .map((element) => focusAreaToElementKey(element))
      .filter((element): element is BattleEditableElementKey => element !== null);

    if (normalizedSelection.length === 0) return;
    if (normalizedSelection.includes("shell")) {
      const onlyShellSelected =
        selectedElementKeys.length === 1 && selectedElementKeys[0] === "shell";
      if (onlyShellSelected) {
        selectElements("overview", []);
        return;
      }
      selectElements("shell", ["shell"]);
      return;
    }
    const hasAnySelected = normalizedKeys.some((element) =>
      selectedElementKeys.includes(element),
    );

    if (hasAnySelected) {
      const nextSelection = selectedElements.filter(
        (item): item is BattleEditableElementKey =>
          item !== "overview" && !normalizedSelection.includes(item),
      );
      if (nextSelection.length === 0) {
        selectElements("overview", []);
        return;
      }
      selectElements(nextSelection[nextSelection.length - 1], nextSelection);
      return;
    }

    selectElements(normalizedSelection[0], normalizedSelection);
  };

  const copySelectedGroupProperties = async () => {
    if (selectedElementKeys.length === 0 || typeof window === "undefined") return;
    const payload = {
      elements: selectedElementKeys.reduce<
        Partial<Record<BattleEditableElementKey, Partial<BattleElementPropertyConfig>>>
      >((acc, key) => {
        acc[key] = layout.elements[key];
        return acc;
      }, {}),
    };
    window.localStorage.setItem(
      BATTLE_LAYOUT_EDITOR_GROUP_CLIPBOARD_KEY,
      JSON.stringify(payload),
    );
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(JSON.stringify(payload.elements, null, 2));
    }
  };

  const pasteSelectedGroupProperties = () => {
    if (selectedElementKeys.length === 0 || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BATTLE_LAYOUT_EDITOR_GROUP_CLIPBOARD_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        elements?: Partial<Record<BattleEditableElementKey, Partial<BattleElementPropertyConfig>>>;
      };
      if (!parsed.elements) return;

      const nextElements = { ...(layoutOverrides.elements ?? {}) };
      selectedElementKeys.forEach((elementKey) => {
        const source = parsed.elements?.[elementKey];
        if (!source) return;
        nextElements[elementKey] = {
          ...(layoutOverrides.elements?.[elementKey] ?? {}),
          ...source,
        };
      });

      applyOverrides({
        ...layoutOverrides,
        elements: nextElements,
      });
    } catch {
      // ignore invalid clipboard payload
    }
  };

  const shellControls: LayoutNumberControl[] = [
    {
      label: "Largura das laterais",
      min: 220,
      max: 320,
      step: 4,
      value: layout.shell.desktopSidebarWidth,
      onChange: (value) => updateLayout("shell", "desktopSidebarWidth", value),
    },
    {
      label: "Respiro entre lateral e centro",
      min: 6,
      max: 32,
      step: 2,
      value: layout.shell.desktopGap,
      onChange: (value) => updateLayout("shell", "desktopGap", value),
    },
    {
      label: "Altura da faixa superior",
      min: 96,
      max: 180,
      step: 4,
      value: layout.shell.desktopTopRailHeight,
      onChange: (value) => updateLayout("shell", "desktopTopRailHeight", value),
    },
    {
      label: "Distancia do topo do board",
      min: 80,
      max: 180,
      step: 4,
      value: layout.shell.desktopBoardTopOffset,
      onChange: (value) => updateLayout("shell", "desktopBoardTopOffset", value),
    },
    {
      label: "Respiro abaixo do board",
      min: 96,
      max: 220,
      step: 4,
      value: layout.shell.desktopBoardBottomOffset,
      onChange: (value) => updateLayout("shell", "desktopBoardBottomOffset", value),
    },
    {
      label: "Altura da faixa inferior",
      min: 112,
      max: 220,
      step: 4,
      value: layout.shell.desktopBottomRailHeight,
      onChange: (value) =>
        updateLayout("shell", "desktopBottomRailHeight", value),
    },
  ];

  const boardControls: LayoutNumberControl[] = [
    {
      label: "Largura do board",
      min: 760,
      max: 1120,
      step: 10,
      value: layout.board.desktopMaxWidth,
      onChange: (value) => updateLayout("board", "desktopMaxWidth", value),
    },
    {
      label: "Distancia entre as linhas",
      min: 16,
      max: 64,
      step: 2,
      value: layout.board.desktopGap,
      onChange: (value) => updateLayout("board", "desktopGap", value),
    },
    {
      label: "Padding lateral do board",
      min: 16,
      max: 56,
      step: 2,
      value: layout.board.desktopPaddingX,
      onChange: (value) => updateLayout("board", "desktopPaddingX", value),
    },
    {
      label: "Largura da linha no mobile",
      min: 260,
      max: 360,
      step: 4,
      value: layout.board.mobileLaneMaxWidth,
      onChange: (value) => updateLayout("board", "mobileLaneMaxWidth", value),
    },
    {
      label: "Altura da linha no mobile",
      min: 120,
      max: 220,
      step: 4,
      value: layout.board.mobileRowMinHeight,
      onChange: (value) => updateLayout("board", "mobileRowMinHeight", value),
    },
  ];

  const chroniclesControls: LayoutNumberControl[] = [
    {
      label: "Altura de cronicas",
      min: 300,
      max: 520,
      step: 8,
      value: layout.sidebars.chroniclesHeight,
      onChange: (value) => updateLayout("sidebars", "chroniclesHeight", value),
    },
  ];

  const deckControls: LayoutNumberControl[] = [
    {
      label: "Distancia entre montes",
      min: 8,
      max: 28,
      step: 2,
      value: layout.sidebars.deckRackGap,
      onChange: (value) => updateLayout("sidebars", "deckRackGap", value),
    },
  ];

  const topHandControls: LayoutNumberControl[] = [
    {
      label: "Offset vertical da mao inimiga",
      min: -96,
      max: 24,
      step: 2,
      value: layout.sidebars.topHandOffsetY,
      onChange: (value) => updateLayout("sidebars", "topHandOffsetY", value),
    },
  ];

  const bottomHandControls: LayoutNumberControl[] = [];

  const statusControls: LayoutNumberControl[] = [
    {
      label: "Largura do controle",
      min: 160,
      max: 280,
      step: 4,
      value: layout.hud.statusWidth,
      onChange: (value) => updateLayout("hud", "statusWidth", value),
    },
    {
      label: "Altura do controle",
      min: 120,
      max: 220,
      step: 4,
      value: layout.hud.statusHeight,
      onChange: (value) => updateLayout("hud", "statusHeight", value),
    },
    {
      label: "Largura do controle no mobile",
      min: 160,
      max: 260,
      step: 4,
      value: layout.hud.mobileStatusWidth,
      onChange: (value) => updateLayout("hud", "mobileStatusWidth", value),
    },
    {
      label: "Altura do controle no mobile",
      min: 72,
      max: 120,
      step: 4,
      value: layout.hud.mobileStatusHeight,
      onChange: (value) => updateLayout("hud", "mobileStatusHeight", value),
    },
  ];

  const actionControls: LayoutNumberControl[] = [
    {
      label: "Largura do botao",
      min: 200,
      max: 320,
      step: 4,
      value: layout.hud.actionWidth,
      onChange: (value) => updateLayout("hud", "actionWidth", value),
    },
    {
      label: "Altura do botao",
      min: 88,
      max: 160,
      step: 4,
      value: layout.hud.actionHeight,
      onChange: (value) => updateLayout("hud", "actionHeight", value),
    },
    {
      label: "Largura do botao no mobile",
      min: 180,
      max: 260,
      step: 4,
      value: layout.hud.mobileActionWidth,
      onChange: (value) => updateLayout("hud", "mobileActionWidth", value),
    },
    {
      label: "Altura do botao no mobile",
      min: 56,
      max: 88,
      step: 4,
      value: layout.hud.mobileActionHeight,
      onChange: (value) => updateLayout("hud", "mobileActionHeight", value),
    },
    {
      label: "Altura da area do botao",
      min: 120,
      max: 240,
      step: 4,
      value: layout.hud.actionSlotHeight,
      onChange: (value) => updateLayout("hud", "actionSlotHeight", value),
    },
  ];

  const enemyPillControls: LayoutNumberControl[] = [];

  const playerPillControls: LayoutNumberControl[] = [];

  const sections: LayoutSection[] = [
    {
      key: "shell",
      title: "Estrutura da cena",
      description:
        "Define a estrutura geral da cena: laterais, centro e alturas das faixas.",
      focusArea: "shell",
      controls: shellControls,
      elementKey: "shell",
      typeLabel: "Palco",
      tags: ["layout", "estrutura", "responsivo"],
    },
    {
      key: "board",
      title: "Campo principal",
      description:
        "Ajusta o board central: largura util, espacamento e respiro interno.",
      focusArea: "board",
      controls: boardControls,
      elementKey: "board",
      typeLabel: "Board",
      tags: ["board", "alvos", "core"],
    },
    {
      key: "enemyField",
      title: "Linha inimiga",
      description:
        "Controla apenas a faixa superior dos alvos inimigos dentro do campo.",
      focusArea: "enemyField",
      controls: [],
      elementKey: "enemyField",
      typeLabel: "Faixa",
      tags: ["board", "inimigo", "alvos"],
    },
    {
      key: "playerField",
      title: "Linha do jogador",
      description:
        "Controla apenas a faixa inferior dos alvos do jogador dentro do campo.",
      focusArea: "playerField",
      controls: [],
      elementKey: "playerField",
      typeLabel: "Faixa",
      tags: ["board", "jogador", "alvos"],
    },
    {
      key: "boardMessage",
      title: "Mensagem central",
      description:
        "Controla a faixa da mensagem de turno, dano e avisos do centro da mesa.",
      focusArea: "boardMessage",
      controls: [],
      elementKey: "boardMessage",
      typeLabel: "Mensagem",
      tags: ["board", "mensagem", "overlay"],
    },
    {
      key: "chronicles",
      title: "Cronicas",
      description:
        "Controla o painel de cronicas na lateral esquerda.",
      focusArea: "chronicles",
      controls: chroniclesControls,
      elementKey: "chronicles",
      typeLabel: "Painel",
      tags: ["texto", "log", "sidebar"],
    },
    {
      key: "enemyTargetDeck",
      title: "Alvos inimigos",
      description:
        "Controla o monte de alvos na lateral do inimigo.",
      focusArea: "enemyTargetDeck",
      controls: deckControls,
      elementKey: "enemyTargetDeck",
      typeLabel: "Monte",
      tags: ["alvos", "inimigo", "cards"],
    },
    {
      key: "enemyDeck",
      title: "Deck inimigo",
      description:
        "Controla o monte principal na lateral do inimigo.",
      focusArea: "enemyDeck",
      controls: deckControls,
      elementKey: "enemyDeck",
      typeLabel: "Monte",
      tags: ["deck", "inimigo", "cards"],
    },
    {
      key: "playerTargetDeck",
      title: "Alvos do jogador",
      description:
        "Controla o monte de alvos na lateral do jogador.",
      focusArea: "playerTargetDeck",
      controls: deckControls,
      elementKey: "playerTargetDeck",
      typeLabel: "Monte",
      tags: ["alvos", "jogador", "cards"],
    },
    {
      key: "playerDeck",
      title: "Deck do jogador",
      description:
        "Controla o monte principal na lateral do jogador.",
      focusArea: "playerDeck",
      controls: deckControls,
      elementKey: "playerDeck",
      typeLabel: "Monte",
      tags: ["deck", "jogador", "cards"],
    },
    {
      key: "topHand",
      title: "Mao do oponente",
      description:
        "Controla a area da mao do oponente acima do board.",
      focusArea: "topHand",
      controls: topHandControls,
      elementKey: "topHand",
      typeLabel: "Mao",
      tags: ["mao", "oponente", "desktop"],
    },
    {
      key: "bottomHand",
      title: "Mao do jogador",
      description:
        "Controla a area da sua mao na parte inferior.",
      focusArea: "bottomHand",
      controls: bottomHandControls,
      elementKey: "bottomHand",
      typeLabel: "Mao",
      tags: ["mao", "jogador", "desktop"],
    },
    {
      key: "status",
      title: "Card de controle",
      description:
        "Controla o card de turno e tempo na lateral direita.",
      focusArea: "status",
      controls: statusControls,
      elementKey: "status",
      typeLabel: "Controle",
      tags: ["hud", "timer", "turno"],
    },
    {
      key: "action",
      title: "Botao de trocar",
      description:
        "Ajusta o botao de acao e a area reservada para ele.",
      focusArea: "action",
      controls: actionControls,
      elementKey: "action",
      typeLabel: "Acao",
      tags: ["acao", "texto", "cta"],
    },
    {
      key: "enemyPill",
      title: "Pill inimiga",
      description:
        "Ajusta a pill do inimigo de forma independente do campo.",
      focusArea: "enemyPill",
      controls: enemyPillControls,
      elementKey: "enemyPill",
      typeLabel: "Overlay",
      tags: ["pill", "inimigo", "overlay"],
    },
    {
      key: "playerPill",
      title: "Pill do jogador",
      description:
        "Ajusta a pill do jogador de forma independente do campo.",
      focusArea: "playerPill",
      controls: playerPillControls,
      elementKey: "playerPill",
      typeLabel: "Overlay",
      tags: ["pill", "jogador", "overlay"],
    },
  ];

  const activeSection =
    sections.find((section) => section.focusArea === focusArea) ?? null;
  const activeElementKey = focusAreaToElementKey(focusArea);
  const selectedElementKeys = selectedElements
    .map((item) => focusAreaToElementKey(item))
    .filter((item): item is BattleEditableElementKey => item !== null);
  const activeElementConfig = activeElementKey
    ? layout.elements[activeElementKey]
    : null;
  const primarySelectedElementKey = selectedElementKeys[0] ?? null;
  const primarySelectedElementConfig = primarySelectedElementKey
    ? layout.elements[primarySelectedElementKey]
    : null;
  const isMultiSelection = selectedElementKeys.length > 1;
  const editableJsonValue = useMemo(() => {
    if (primarySelectedElementKey) {
      return JSON.stringify(
        {
          elements: {
            [primarySelectedElementKey]: layout.elements[primarySelectedElementKey],
          },
        },
        null,
        2,
      );
    }

    return JSON.stringify(normalizedOverrides, null, 2);
  }, [layout.elements, normalizedOverrides, primarySelectedElementKey]);
  const currentJsonValue = useMemo(() => {
    if (primarySelectedElementKey) {
      return JSON.stringify(
        {
          element: primarySelectedElementKey,
          config: layout.elements[primarySelectedElementKey],
          overrides: normalizedOverrides.elements?.[primarySelectedElementKey] ?? {},
        },
        null,
        2,
      );
    }

    return JSON.stringify(normalizedOverrides, null, 2);
  }, [layout.elements, normalizedOverrides, primarySelectedElementKey]);
  useEffect(() => {
    setImportText(editableJsonValue);
  }, [editableJsonValue]);
  const previewDevicePreset = battleLayoutPreviewDevices[previewDevice];
  const previewResolutionOptions = battleLayoutPreviewResolutions[previewDevice];
  const selectedResolutionValue = `${viewportWidth}x${viewportHeight}`;
  const hasPresetResolution = previewResolutionOptions.some(
    (option) => `${option.width}x${option.height}` === selectedResolutionValue,
  );
  const previewBaseWidth = viewportWidth;
  const previewBaseHeight = viewportHeight;
  const previewWidth = Math.round((previewBaseWidth * previewScale) / 100);
  const previewHeight = Math.round((previewBaseHeight * previewScale) / 100);

  const openDebugPreview = useCallback(() => {
    if (typeof window === "undefined") return;
    const previewUrl = new URL(
      previewFrameRef.current?.src ?? `${window.location.origin}${window.location.pathname}?battle-layout-preview=1`,
    );
    previewUrl.searchParams.set("battle-layout-debug", "1");
    window.open(previewUrl.toString(), "_blank", "noopener,noreferrer");
  }, []);

  const layoutPropertyControls: LayoutNumberControl[] =
    activeElementKey && activeElementConfig && !isMultiSelection
    ? [
        {
          label: "Centro X",
          min: -EDITOR_POSITION_RANGE,
          max: EDITOR_POSITION_RANGE,
          step: 2,
          value: activeElementConfig.x,
          onChange: (value) => updateElementProperty(activeElementKey, "x", value),
          ui: "stepper",
          axis: "x",
        },
        {
          label: "Centro Y",
          min: -EDITOR_POSITION_RANGE,
          max: EDITOR_POSITION_RANGE,
          step: 2,
          value: activeElementConfig.y,
          onChange: (value) => updateElementProperty(activeElementKey, "y", value),
          ui: "stepper",
          axis: "y",
        },
        {
          label: "Largura do frame",
          min: 0,
          max: 1400,
          step: 4,
          value: activeElementConfig.width,
          onChange: (value) => updateElementProperty(activeElementKey, "width", value),
        },
        {
          label: "Altura do frame",
          min: 0,
          max: 900,
          step: 4,
          value: activeElementConfig.height,
          onChange: (value) => updateElementProperty(activeElementKey, "height", value),
        },
        {
          label: "Rotacao",
          min: -180,
          max: 180,
          step: 1,
          value: activeElementConfig.rotation,
          onChange: (value) => updateElementProperty(activeElementKey, "rotation", value),
        },
        {
          label: "Escala X",
          min: 40,
          max: 180,
          step: 1,
          value: activeElementConfig.scaleX,
          onChange: (value) => updateElementProperty(activeElementKey, "scaleX", value),
        },
        {
          label: "Escala Y",
          min: 40,
          max: 180,
          step: 1,
          value: activeElementConfig.scaleY,
          onChange: (value) => updateElementProperty(activeElementKey, "scaleY", value),
        },
        {
          label: "Opacidade",
          min: 0,
          max: 100,
          step: 1,
          value: activeElementConfig.opacity,
          onChange: (value) => updateElementProperty(activeElementKey, "opacity", value),
        },
        {
          label: "Camada",
          min: -20,
          max: 40,
          step: 1,
          value: activeElementConfig.zIndex,
          onChange: (value) => updateElementProperty(activeElementKey, "zIndex", value),
        },
      ]
    : [];

  const multiSelectionControls: LayoutNumberControl[] =
    selectedElementKeys.length > 1 && primarySelectedElementConfig
      ? [
          {
            label: "Centro X do grupo",
            min: -EDITOR_POSITION_RANGE,
            max: EDITOR_POSITION_RANGE,
            step: 2,
            value: primarySelectedElementConfig.x,
            onChange: (value) => updateSelectedElementsAxis("x", value),
            ui: "stepper",
            axis: "x",
          },
          {
            label: "Centro Y do grupo",
            min: -EDITOR_POSITION_RANGE,
            max: EDITOR_POSITION_RANGE,
            step: 2,
            value: primarySelectedElementConfig.y,
            onChange: (value) => updateSelectedElementsAxis("y", value),
            ui: "stepper",
            axis: "y",
          },
        ]
      : [];

  return (
    <div className="grid h-screen grid-cols-[340px_minmax(0,1fr)] overflow-hidden bg-[#102b1c]">
      <aside className="overflow-y-auto border-r border-amber-900/20 bg-parchment/95 p-4 shadow-2xl">
        <div className="mb-4 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-950/70">
            Editor visual
          </div>
          <h1 className="font-serif text-3xl font-black text-amber-950">
            Battle Layout
          </h1>
        </div>

        <label className="mb-4 flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/75">
            Situacao da batalha
          </span>
          <select
            value={fixtureKey}
            onChange={(event) =>
              setFixtureKey(event.target.value as BattleSceneFixtureKey)
            }
            className="rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 outline-none"
          >
            {fixtureOptions.map((key) => (
              <option key={key} value={key}>
                {battleSceneFixtureMeta[key].label}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            onClick={undoLayout}
            disabled={undoStack.length === 0}
            className="flex-1 rounded-xl bg-stone-800 text-amber-50 hover:bg-stone-700 disabled:opacity-50"
          >
            Undo
          </Button>
          <Button
            type="button"
            onClick={redoLayout}
            disabled={redoStack.length === 0}
            className="flex-1 rounded-xl bg-stone-800 text-amber-50 hover:bg-stone-700 disabled:opacity-50"
          >
            Redo
          </Button>
          <Button
            type="button"
            onClick={resetLayout}
            className="flex-1 rounded-xl bg-amber-950 text-amber-50 hover:bg-amber-900"
          >
            Resetar
          </Button>
        </div>

        <section className="mb-4 space-y-3 rounded-3xl border border-amber-700/35 bg-amber-50/60 p-3 shadow-[0_10px_26px_rgba(120,53,15,0.12)]">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
            Navegador
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => selectElements("overview", [])}
              className={cn(
                "flex-1 rounded-xl text-amber-50",
                focusArea === "overview"
                  ? "bg-stone-900 hover:bg-stone-800"
                  : "bg-stone-800 hover:bg-stone-700",
              )}
            >
              Ver batalha inteira
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Nome do grupo"
              className="rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 outline-none"
            />
            <Button
              type="button"
              onClick={saveSelectionAsGroup}
              className="rounded-xl bg-emerald-900 text-amber-50 hover:bg-emerald-800"
            >
              Salvar grupo
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => void copySelectedGroupProperties()}
              className="rounded-xl bg-amber-950 text-amber-50 hover:bg-amber-900"
            >
              Copiar grupo
            </Button>
            <Button
              type="button"
              onClick={pasteSelectedGroupProperties}
              className="rounded-xl bg-amber-900 text-amber-50 hover:bg-amber-800"
            >
              Colar grupo
            </Button>
          </div>
          <div className="space-y-3">
            {sceneTreeGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-amber-900/15 bg-white/55 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-950/60">
                    {group.title}
                  </div>
                  <Button
                    type="button"
                    onClick={() => toggleGroupSelection(group.elements)}
                    className="h-7 rounded-lg bg-amber-950 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-50 hover:bg-amber-900"
                  >
                    {group.elements.some((element) =>
                      selectedElementKeys.includes(element),
                    )
                      ? "Desmarcar"
                      : "Selecionar"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {group.elements.map((elementKey) => {
                    const normalizedKey = focusAreaToElementKey(elementKey);
                    const section = sections.find((item) => item.elementKey === normalizedKey);
                    const checked = selectedElements.includes(elementKey);
                    return (
                      <div
                        key={elementKey}
                        onClick={() => selectElements(elementKey, [elementKey])}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors",
                          focusArea === elementKey
                            ? "border-amber-900/25 bg-amber-100/70"
                            : "border-amber-900/10 bg-amber-50/60 hover:bg-amber-100/55",
                        )}
                      >
                        <label
                          className="flex items-center gap-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleElementSelection(elementKey)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 accent-amber-700"
                          />
                          <span className="text-sm font-semibold text-amber-950">
                            {section?.title ?? elementKey}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {savedGroups.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-amber-900/15 bg-white/55 p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-950/60">
                Grupos salvos
              </div>
              <div className="space-y-2">
                {savedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-amber-900/10 bg-amber-50/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(event) => renameGroup(group.id, event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white/80 px-2 py-1 text-sm font-semibold text-amber-950 outline-none"
                      />
                      <Button
                        type="button"
                        onClick={() => selectSavedGroup(group)}
                        className="h-8 rounded-lg bg-sky-900 px-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 hover:bg-sky-800"
                      >
                        Usar
                      </Button>
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-amber-950/70">
                      {group.elements
                        .map(
                          (item) =>
                            sections.find((section) => section.elementKey === item)?.title ?? item,
                        )
                        .join(", ")}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        onClick={() => updateGroupFromSelection(group.id)}
                        className="h-8 flex-1 rounded-lg bg-amber-900 px-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 hover:bg-amber-800"
                      >
                        Atualizar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => deleteGroup(group.id)}
                        className="h-8 flex-1 rounded-lg bg-rose-900 px-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 hover:bg-rose-800"
                      >
                        Apagar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-amber-900/15 bg-white/55 p-3 text-xs leading-relaxed text-amber-950/75">
            Selecionados:{" "}
            <span className="font-bold">
              {selectedElements.length > 0
                ? selectedElements
                    .map(
                      (item) =>
                        sections.find((section) => section.focusArea === item)?.title ?? item,
                    )
                    .join(", ")
                : "nenhum"}
            </span>
          </div>
        </section>

        <div className="space-y-5">
          {selectedElementKeys.length > 1 ? (
            <section className="space-y-3 rounded-3xl border border-amber-700/35 bg-amber-50/60 p-3 shadow-[0_10px_26px_rgba(120,53,15,0.12)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                Multi-select
              </div>
              {multiSelectionControls.map((control) => (
                <LayoutControl key={control.label} {...control} />
              ))}
              <div className="rounded-2xl border border-amber-900/15 bg-white/55 p-3 text-xs leading-relaxed text-amber-950/75">
                Com mais de um item selecionado, o editor libera apenas o
                movimento conjunto em X e Y.
              </div>
            </section>
          ) : null}

          {activeSection ? (
            <>
              <section className="space-y-3 rounded-3xl border border-amber-700/35 bg-amber-50/60 p-3 shadow-[0_10px_26px_rgba(120,53,15,0.12)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                  Elemento
                </div>
                <div className="rounded-2xl border border-amber-900/15 bg-white/60 p-3 text-sm text-amber-950/80">
                  <div className="font-black uppercase tracking-[0.14em] text-amber-950">
                    {activeSection.title}
                  </div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-950/55">
                    Tipo: {activeSection.typeLabel}
                  </div>
                </div>
                {!isMultiSelection && activeElementConfig ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={() => void copyElementProperties()}
                        className="rounded-xl bg-amber-950 text-amber-50 hover:bg-amber-900"
                      >
                        Copiar props
                      </Button>
                      <Button
                        type="button"
                        onClick={pasteElementProperties}
                        className="rounded-xl bg-amber-900 text-amber-50 hover:bg-amber-800"
                      >
                        Colar props
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        type="text"
                        value={presetName}
                        onChange={(event) => setPresetName(event.target.value)}
                        placeholder="Nome do preset"
                        className="rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 outline-none"
                      />
                      <Button
                        type="button"
                        onClick={saveElementPreset}
                        className="rounded-xl bg-emerald-900 text-amber-50 hover:bg-emerald-800"
                      >
                        Salvar preset
                      </Button>
                    </div>
                    {Object.keys(elementPresets).length > 0 ? (
                      <div className="space-y-2 rounded-2xl border border-amber-900/15 bg-white/55 p-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-950/60">
                          Presets salvos
                        </div>
                        <div className="space-y-2">
                          {Object.keys(elementPresets).map((name) => (
                            <div
                              key={name}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-900/10 bg-amber-50/70 px-3 py-2"
                            >
                              <span className="text-sm font-semibold text-amber-950">{name}</span>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={() => applyElementPreset(name)}
                                  className="h-8 rounded-lg bg-sky-900 px-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 hover:bg-sky-800"
                                >
                                  Aplicar
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => deleteElementPreset(name)}
                                  className="h-8 rounded-lg bg-rose-900 px-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 hover:bg-rose-800"
                                >
                                  Apagar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>

                {!isMultiSelection && activeElementConfig ? (
                  <>
                  <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                      Layout
                    </div>
                    {layoutPropertyControls.map((control) => (
                      <LayoutControl key={control.label} {...control} />
                    ))}
                    <SelectControl
                      label="Ancora"
                      value={activeElementConfig.anchor}
                      options={anchorOptions}
                      onChange={(value) => updateElementProperty(activeElementKey!, "anchor", value)}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ToggleControl
                        label="Bloquear proporcao"
                        checked={activeElementConfig.lockAspectRatio}
                        onChange={(checked) =>
                          updateElementProperty(activeElementKey!, "lockAspectRatio", checked)
                        }
                      />
                      <ToggleControl
                        label="Snap / grid"
                        checked={activeElementConfig.snapToGrid}
                        onChange={(checked) =>
                          updateElementProperty(activeElementKey!, "snapToGrid", checked)
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                      Visibilidade
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ToggleControl
                        label="Desktop"
                        checked={activeElementConfig.visibleDesktop}
                        onChange={(checked) =>
                          updateElementProperty(activeElementKey!, "visibleDesktop", checked)
                        }
                      />
                      <ToggleControl
                        label="Tablet"
                        checked={activeElementConfig.visibleTablet}
                        onChange={(checked) =>
                          updateElementProperty(activeElementKey!, "visibleTablet", checked)
                        }
                      />
                      <ToggleControl
                        label="Mobile"
                        checked={activeElementConfig.visibleMobile}
                        onChange={(checked) =>
                          updateElementProperty(activeElementKey!, "visibleMobile", checked)
                        }
                      />
                    </div>
                  </section>
                </>
              ) : null}

              {!isMultiSelection && focusArea === "chronicles" ? (
                <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                    Texto
                  </div>
                  <TextControl
                    label="Titulo"
                    value={layout.text.chroniclesTitle}
                    onChange={(value) => updateText("chroniclesTitle", value)}
                  />
                  <LayoutControl
                    label="Fonte do titulo"
                    min={10}
                    max={28}
                    step={1}
                    value={layout.text.titleFontSize}
                    onChange={(value) => updateText("titleFontSize", value)}
                  />
                  <LayoutControl
                    label="Tracking do titulo"
                    min={0}
                    max={0.4}
                    step={0.01}
                    value={layout.text.titleLetterSpacing}
                    onChange={(value) => updateText("titleLetterSpacing", value)}
                  />
                  <LayoutControl
                    label="Fonte do corpo"
                    min={10}
                    max={24}
                    step={1}
                    value={layout.text.bodyFontSize}
                    onChange={(value) => updateText("bodyFontSize", value)}
                  />
                  <LayoutControl
                    label="Tracking do corpo"
                    min={0}
                    max={0.4}
                    step={0.01}
                    value={layout.text.bodyLetterSpacing}
                    onChange={(value) => updateText("bodyLetterSpacing", value)}
                  />
                  <SelectControl
                    label="Alinhamento do titulo"
                    value={layout.text.titleAlign}
                    options={[
                      { value: "left", label: "Esquerda" },
                      { value: "center", label: "Centro" },
                      { value: "right", label: "Direita" },
                    ]}
                    onChange={(value) => updateText("titleAlign", value)}
                  />
                  <SelectControl
                    label="Alinhamento do corpo"
                    value={layout.text.bodyAlign}
                    options={[
                      { value: "left", label: "Esquerda" },
                      { value: "center", label: "Centro" },
                      { value: "right", label: "Direita" },
                    ]}
                    onChange={(value) => updateText("bodyAlign", value)}
                  />
                  <TextControl
                    label="Cor do titulo"
                    value={layout.text.titleColor}
                    onChange={(value) => updateText("titleColor", value)}
                  />
                  <TextControl
                    label="Cor do corpo"
                    value={layout.text.bodyColor}
                    onChange={(value) => updateText("bodyColor", value)}
                  />
                  <SelectControl
                    label="Estado do painel"
                    value={chroniclesVisualState}
                    options={chroniclesVisualStateOptions}
                    onChange={(value) => setChroniclesVisualState(value)}
                  />
                </section>
              ) : null}

              {!isMultiSelection && focusArea === "status" ? (
                <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                    Texto
                  </div>
                  <TextControl
                    label="Titulo"
                    value={layout.text.statusTitle}
                    onChange={(value) => updateText("statusTitle", value)}
                  />
                  <LayoutControl
                    label="Fonte do titulo"
                    min={10}
                    max={28}
                    step={1}
                    value={layout.text.titleFontSize}
                    onChange={(value) => updateText("titleFontSize", value)}
                  />
                  <TextControl
                    label="Cor do titulo"
                    value={layout.text.titleColor}
                    onChange={(value) => updateText("titleColor", value)}
                  />
                </section>
              ) : null}

              {!isMultiSelection && focusArea === "action" ? (
                <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                    Texto
                  </div>
                  <TextControl
                    label="Titulo"
                    value={layout.text.actionTitle}
                    onChange={(value) => updateText("actionTitle", value)}
                  />
                  <TextControl
                    label="Subtitulo"
                    value={layout.text.actionSubtitle}
                    onChange={(value) => updateText("actionSubtitle", value)}
                  />
                  <LayoutControl
                    label="Fonte do titulo"
                    min={10}
                    max={28}
                    step={1}
                    value={layout.text.titleFontSize}
                    onChange={(value) => updateText("titleFontSize", value)}
                  />
                  <LayoutControl
                    label="Fonte do corpo"
                    min={10}
                    max={24}
                    step={1}
                    value={layout.text.bodyFontSize}
                    onChange={(value) => updateText("bodyFontSize", value)}
                  />
                  <TextControl
                    label="Cor do titulo"
                    value={layout.text.titleColor}
                    onChange={(value) => updateText("titleColor", value)}
                  />
                  <TextControl
                    label="Cor do corpo"
                    value={layout.text.bodyColor}
                    onChange={(value) => updateText("bodyColor", value)}
                  />
                </section>
              ) : null}

              {!isMultiSelection && [ "action", "status" ].includes(focusArea) ? (
                <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                    Estados visuais
                  </div>
                  {focusArea === "action" ? (
                    <>
                      <SelectControl
                        label="Estado do botao"
                        value={actionVisualState}
                        options={actionVisualStateOptions}
                        onChange={(value) => setActionVisualState(value)}
                      />
                      <TextControl
                        label="Titulo no hover"
                        value={layout.text.actionTitleHover}
                        onChange={(value) => updateText("actionTitleHover", value)}
                      />
                      <TextControl
                        label="Titulo no pressed"
                        value={layout.text.actionTitlePressed}
                        onChange={(value) => updateText("actionTitlePressed", value)}
                      />
                      <TextControl
                        label="Titulo no disabled"
                        value={layout.text.actionTitleDisabled}
                        onChange={(value) => updateText("actionTitleDisabled", value)}
                      />
                      <TextControl
                        label="Titulo no selected"
                        value={layout.text.actionTitleSelected}
                        onChange={(value) => updateText("actionTitleSelected", value)}
                      />
                      <TextControl
                        label="Subtitulo no hover"
                        value={layout.text.actionSubtitleHover}
                        onChange={(value) => updateText("actionSubtitleHover", value)}
                      />
                      <TextControl
                        label="Subtitulo no pressed"
                        value={layout.text.actionSubtitlePressed}
                        onChange={(value) => updateText("actionSubtitlePressed", value)}
                      />
                      <TextControl
                        label="Subtitulo no disabled"
                        value={layout.text.actionSubtitleDisabled}
                        onChange={(value) => updateText("actionSubtitleDisabled", value)}
                      />
                      <TextControl
                        label="Subtitulo no selected"
                        value={layout.text.actionSubtitleSelected}
                        onChange={(value) => updateText("actionSubtitleSelected", value)}
                      />
                    </>
                  ) : null}
                  {focusArea === "status" ? (
                    <SelectControl
                      label="Estado do card"
                      value={statusVisualState}
                      options={statusVisualStateOptions}
                      onChange={(value) => setStatusVisualState(value)}
                    />
                  ) : null}
                </section>
              ) : null}

              {activeSection.controls.length > 0 ? (
                <section className="space-y-3 rounded-3xl border border-amber-900/12 bg-white/30 p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
                    Ajustes do setor
                  </div>
                  {activeSection.controls.map((control) => (
                    <LayoutControl key={control.label} {...control} />
                  ))}
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="mt-4 space-y-3 rounded-3xl border border-amber-900/12 bg-amber-50/50 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
            JSON
          </div>
          <p className="text-xs leading-relaxed text-amber-950/70">
            Use para testar ou importar ajustes localmente no editor. Isso muda
            apenas o estado local do perfil atual, aplica por cima do layout
            atual e nao publica nada no projeto.
          </p>
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
              Entrar JSON
            </div>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              className="min-h-40 w-full rounded-2xl border border-amber-900/20 bg-white/85 p-3 font-mono text-[11px] leading-relaxed text-amber-950 outline-none"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/60">
              JSON atual
            </div>
            <textarea
              readOnly
              value={currentJsonValue}
              className="min-h-40 w-full rounded-2xl bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-emerald-100 outline-none"
              spellCheck={false}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void copyLayoutJson()}
              className="flex-1 rounded-xl bg-emerald-900 text-amber-50 hover:bg-emerald-800"
            >
              Copiar atual
            </Button>
            <Button
              type="button"
              onClick={applyImportText}
              className="flex-1 rounded-xl bg-amber-900 text-amber-50 hover:bg-amber-800"
            >
              Aplicar JSON
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-3xl border border-sky-900/12 bg-sky-50/50 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-950/60">
            Preset do projeto
          </div>
          <p className="text-xs leading-relaxed text-sky-950/75">
            Quando o layout estiver aprovado, salve este estado como o preset
            do projeto. Isso atualiza o arquivo TS base usado pelo deploy e
            pelo reset do editor.
          </p>
          <Button
            type="button"
            onClick={() => setIsPresetSaveConfirmOpen(true)}
            className="w-full rounded-xl bg-emerald-950 text-emerald-50 hover:bg-emerald-900"
          >
            Salvar layout aprovado
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void copyPresetTs()}
              className="flex-1 rounded-xl bg-sky-950 text-sky-50 hover:bg-sky-900"
            >
              Copiar preset
            </Button>
            <Button
              type="button"
              onClick={downloadPresetTs}
              className="flex-1 rounded-xl bg-sky-800 text-sky-50 hover:bg-sky-700"
            >
              Baixar preset
            </Button>
          </div>
          {presetSaveFeedback ? (
            <div className="rounded-xl border border-sky-900/12 bg-white/70 px-3 py-2 text-xs font-semibold text-sky-950/80">
              {presetSaveFeedback}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2 rounded-3xl border border-emerald-900/12 bg-emerald-50/45 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-950/60">
            Animacao
          </div>
          <p className="text-xs leading-relaxed text-emerald-950/75">
            Preview isolado das animacoes aprovadas no layout. So roda quando
            voce interage com estes botoes.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-950/60">
              Set
            </span>
            <select
              value={animationSet}
              onChange={(event) => {
                setAnimationMode("idle");
                setAnimationRunId((current) => current + 1);
                setAnimationAnchorTool(null);
                setAnimationDebugEnabled(false);
                setAnimationSet(event.target.value as BattleLayoutPreviewAnimationSet);
                setAnimationPreset("none");
              }}
              className="rounded-xl border border-emerald-900/12 bg-white/80 px-3 py-2 text-sm font-semibold text-emerald-950 outline-none"
            >
              {animationSetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-950/60">
              Preset
            </span>
            <select
              value={animationPreset}
              onChange={(event) => {
                setAnimationMode("idle");
                setAnimationRunId((current) => current + 1);
                setAnimationAnchorTool(null);
                setAnimationDebugEnabled(false);
                setAnimationPreset(event.target.value as BattleLayoutPreviewAnimationPreset);
              }}
              className="rounded-xl border border-emerald-900/12 bg-white/80 px-3 py-2 text-sm font-semibold text-emerald-950 outline-none"
            >
              {animationPresetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            {isOriginAnchorAvailable ? (
              <Button
                type="button"
                onClick={() => {
                  ensureAnimationAnchor(selectedAnimationOriginAnchorTool);
                  setAnimationMode("idle");
                  setAnimationRunId((current) => current + 1);
                  setAnimationAnchorTool((current) =>
                    current === selectedAnimationOriginAnchorTool
                      ? null
                      : selectedAnimationOriginAnchorTool,
                  );
                }}
                className={cn(
                  "flex-1 rounded-xl border border-sky-300/20 text-sky-50",
                  animationAnchorTool === selectedAnimationOriginAnchorTool
                    ? "bg-sky-800 hover:bg-sky-700"
                    : "bg-sky-950 hover:bg-sky-900",
                )}
                disabled={!isIndividualAnimationPreset}
              >
                Mover origem
              </Button>
            ) : null}
            {isImpactAnchorAvailable ? (
              <Button
                type="button"
                onClick={() => {
                  ensureAnimationAnchor(selectedTargetAttackImpactAnchorTool);
                  setAnimationMode("idle");
                  setAnimationRunId((current) => current + 1);
                  setAnimationAnchorTool((current) =>
                    current === selectedTargetAttackImpactAnchorTool
                      ? null
                      : selectedTargetAttackImpactAnchorTool,
                  );
                }}
                className={cn(
                  "flex-1 rounded-xl border border-sky-300/20 text-sky-50",
                  animationAnchorTool === selectedTargetAttackImpactAnchorTool
                    ? "bg-sky-800 hover:bg-sky-700"
                    : "bg-sky-950 hover:bg-sky-900",
                )}
                disabled={!isImpactAnchorAvailable}
              >
                Mover impacto
              </Button>
            ) : null}
            {isDestinationAnchorAvailable ? (
              <Button
                type="button"
                onClick={() => {
                  const destinationAnchorTool =
                    selectedMulliganReturnDestinationAnchorTool ??
                    selectedTargetAttackDestinationAnchorTool;
                  ensureAnimationAnchor(destinationAnchorTool);
                  setAnimationMode("idle");
                  setAnimationRunId((current) => current + 1);
                  setAnimationAnchorTool((current) =>
                    current === destinationAnchorTool
                      ? null
                      : destinationAnchorTool,
                  );
                }}
                className={cn(
                  "flex-1 rounded-xl border border-sky-300/20 text-sky-50",
                  animationAnchorTool ===
                    (selectedMulliganReturnDestinationAnchorTool ??
                      selectedTargetAttackDestinationAnchorTool)
                    ? "bg-sky-800 hover:bg-sky-700"
                    : "bg-sky-950 hover:bg-sky-900",
                )}
                disabled={!isDestinationAnchorAvailable}
              >
                Mover destino
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setAnimationDebugEnabled((current) => !current);
              }}
              disabled={isAnimationFeatureDisabled}
              className={cn(
                "flex-1 rounded-xl border border-cyan-300/20 text-cyan-50",
                animationDebugEnabled
                  ? "bg-cyan-800 hover:bg-cyan-700"
                  : "bg-cyan-950 hover:bg-cyan-900",
              )}
            >
              Sonda
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAnimationMode(getAnimationModeForAction(animationSet, "play"));
                setAnimationRunId((current) => current + 1);
              }}
              disabled={isAnimationFeatureDisabled}
              className="flex-1 rounded-xl border border-emerald-300/20 bg-emerald-900 text-emerald-50 hover:bg-emerald-800"
            >
              Play
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAnimationMode(getAnimationModeForAction(animationSet, "loop"));
                setAnimationRunId((current) => current + 1);
              }}
              disabled={isAnimationFeatureDisabled}
              className="flex-1 rounded-xl border border-emerald-300/20 bg-emerald-950 text-emerald-50 hover:bg-emerald-900"
            >
              Loop
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAnimationMode("idle");
                setAnimationRunId((current) => current + 1);
              }}
              disabled={
                isAnimationFeatureDisabled ||
                animationMode !== getAnimationModeForAction(animationSet, "loop")
              }
              className="flex-1 rounded-xl border border-amber-950/10 bg-white/70 text-emerald-950 hover:bg-white disabled:opacity-50"
            >
              Stop
            </Button>
          </div>
        </div>

      </aside>

      <div className="min-w-0 overflow-hidden bg-[#0d2418]">
        <div className="border-b border-white/5 bg-black/20 px-4 py-3 text-amber-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/60">
                Preview da batalha inteira
              </div>
              <div className="mt-1 font-serif text-2xl font-black leading-none">
                {fixtureMeta.label}
              </div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100/55">
                Foco atual:{" "}
                {focusArea === "overview"
                  ? "Batalha inteira"
                  : sections.find((section) => section.focusArea === focusArea)?.title ??
                    "Batalha inteira"}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                {(Object.entries(battleLayoutPreviewDevices) as Array<
                  [BattleLayoutPreviewDevice, (typeof battleLayoutPreviewDevices)[BattleLayoutPreviewDevice]]
                >).map(([deviceKey, device]) => (
                  <button
                    key={deviceKey}
                    type="button"
                    onClick={() => {
                      setPreviewDevice(deviceKey);
                      setViewportWidth(device.width);
                      setViewportHeight(device.height);
                    }}
                    className={cn(
                      "rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors",
                      previewDevice === deviceKey
                        ? "bg-amber-200 text-amber-950"
                        : "text-amber-100/70 hover:bg-white/10",
                    )}
                  >
                    {device.label}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/60">
                  Resolucao comum
                </span>
                <select
                  value={hasPresetResolution ? selectedResolutionValue : "custom"}
                  onChange={(event) => {
                    if (event.target.value === "custom") return;
                    const [nextWidth, nextHeight] = event.target.value
                      .split("x")
                      .map((value) => Number(value));
                    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
                      return;
                    }
                    setViewportWidth(nextWidth);
                    setViewportHeight(nextHeight);
                  }}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm font-semibold text-amber-50 outline-none"
                >
                  {previewResolutionOptions.map((option) => (
                    <option
                      key={`${option.width}x${option.height}`}
                      value={`${option.width}x${option.height}`}
                    >
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Personalizada</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                <label className="flex flex-col gap-1 px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/60">
                    Largura
                  </span>
                  <input
                    type="number"
                    min={320}
                    max={2560}
                    step={1}
                    value={viewportWidth}
                    onChange={(event) =>
                      setViewportWidth(parseViewportValue(event.target.value, viewportWidth))
                    }
                    className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-right text-sm font-semibold text-amber-50 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/60">
                    Altura
                  </span>
                  <input
                    type="number"
                    min={568}
                    max={1600}
                    step={1}
                    value={viewportHeight}
                    onChange={(event) =>
                      setViewportHeight(parseViewportValue(event.target.value, viewportHeight))
                    }
                    className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-right text-sm font-semibold text-amber-50 outline-none"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/65">
                  Zoom
                </span>
                <input
                  type="range"
                  min={45}
                  max={100}
                  step={1}
                  value={previewScale}
                  onChange={(event) => setPreviewScale(Number(event.target.value))}
                  className="w-28 accent-amber-400"
                />
                <span className="min-w-10 text-right text-sm font-bold text-amber-50">
                  {previewScale}%
                </span>
              </label>

              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-amber-50">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/75">
                  Grid
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/65">
                  Grade
                </span>
                <input
                  type="range"
                  min={4}
                  max={32}
                  step={2}
                  value={gridSize}
                  onChange={(event) => setGridSize(Number(event.target.value))}
                  className="w-24 accent-amber-400"
                />
                <span className="min-w-8 text-right text-sm font-bold text-amber-50">
                  {gridSize}
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/65">
                  Snap
                </span>
                <input
                  type="range"
                  min={4}
                  max={24}
                  step={1}
                  value={snapThreshold}
                  onChange={(event) => setSnapThreshold(Number(event.target.value))}
                  className="w-24 accent-amber-400"
                />
                <span className="min-w-8 text-right text-sm font-bold text-amber-50">
                  {snapThreshold}
                </span>
              </label>

              <Button
                type="button"
                onClick={openDebugPreview}
                className="rounded-2xl border border-cyan-300/20 bg-cyan-950/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100 hover:bg-cyan-900/60"
              >
                Abrir debug
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100%-81px)] items-center justify-center overflow-auto p-6">
          <div
            className="overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
          >
            <div
              style={{
                width: `${previewBaseWidth}px`,
                height: `${previewBaseHeight}px`,
              }}
            >
              <iframe
                ref={previewFrameRef}
                title="Battle layout preview"
                src="?battle-layout-preview=1"
                className="block border-0 bg-[#1a472a]"
                style={{
                  width: `${previewBaseWidth}px`,
                  height: `${previewBaseHeight}px`,
                  transform: `scale(${previewScale / 100})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {isImportConfirmOpen ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-md rounded-[28px] border border-amber-950/15 bg-[#f8f0d8] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950/55">
              Confirmar importacao
            </div>
            <div className="mt-2 font-serif text-3xl font-black leading-none text-amber-950">
              Aplicar este JSON?
            </div>
            <p className="mt-3 text-sm leading-relaxed text-amber-950/75">
              Isso vai substituir os overrides atuais do editor e atualizar a base usada pelo
              botao <span className="font-bold text-amber-950">Resetar</span>.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-950/10 bg-white/55 p-3 text-xs leading-relaxed text-amber-950/70">
              Confira se o JSON está no estado que você quer manter antes de aplicar.
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                onClick={cancelImportText}
                className="flex-1 rounded-xl border border-amber-950/15 bg-white/70 text-amber-950 hover:bg-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmImportText}
                className="flex-1 rounded-xl bg-amber-900 text-amber-50 hover:bg-amber-800"
              >
                Aplicar agora
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isPresetSaveConfirmOpen ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-md rounded-[28px] border border-emerald-950/15 bg-[#f8f0d8] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-950/55">
              Aprovar layout
            </div>
            <div className="mt-2 font-serif text-3xl font-black leading-none text-emerald-950">
              Salvar no projeto como novo default?
            </div>
            <p className="mt-3 text-sm leading-relaxed text-emerald-950/75">
              Isso grava o layout atual em{" "}
              <span className="font-mono font-semibold">BattleLayoutPreset.ts</span>
              , substitui a base do projeto e faz esse preset virar a nova base
              do reset para qualquer perfil que abrir o editor depois.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                onClick={() => setIsPresetSaveConfirmOpen(false)}
                className="flex-1 rounded-xl bg-stone-200 text-stone-950 hover:bg-stone-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void approveLayoutAsDefaults()}
                disabled={isSavingPreset}
                className="flex-1 rounded-xl bg-emerald-950 text-emerald-50 hover:bg-emerald-900 disabled:opacity-60"
              >
                {isSavingPreset ? "Salvando..." : "Salvar no projeto"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const EDITOR_POSITION_RANGE = 5000;
const EDITOR_SLIDE_RANGE = 5000;
