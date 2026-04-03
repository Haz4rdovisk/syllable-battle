import type {
  BattleCombatPreviewSchedule,
  BattleMulliganPreviewSchedule,
} from "./battleCompositeSchedule";

export interface BattlePreviewPhaseDebugEntry {
  key: string;
  atMs: number;
  durationMs: number;
  endMs: number;
  dependsOn?: string | null;
}

export interface BattlePreviewCompletionPlan {
  completionAtMs: number;
  restartAtMs: number | null;
  cleanupAtMs: number;
  loopMode: boolean;
  gapMs: number;
  cleanupBufferMs: number;
}

export interface BattleOpeningPreviewTiming {
  targetCount: number;
  staggerMs: number;
  enterDurationMs: number;
  settleMs: number;
  initialDelayMs?: number;
}

export interface BattleReplacementPreviewTiming {
  enterDurationMs: number;
  settleMs: number;
}

export interface BattlePostPlayDrawPreviewTiming {
  drawDurationMs: number;
  settleMs: number;
}

export interface BattleHandPlayTargetPreviewTiming {
  travelMs: number;
  settleMs: number;
}

export interface BattleSimplePlayPreviewTiming {
  commitAtMs: number;
  finishAtMs: number;
  drawAtMs: number | null;
  drawDurationMs: number | null;
}

export const BATTLE_OPENING_PREVIEW_INITIAL_DELAY_MS = 40;

export const getBattleOpeningPreviewTargetEnterAtMs = (args: {
  index: number;
  staggerMs: number;
  enterDurationMs: number;
  initialDelayMs?: number;
}) =>
  (args.initialDelayMs ?? BATTLE_OPENING_PREVIEW_INITIAL_DELAY_MS) +
  args.index * (args.enterDurationMs + args.staggerMs);

export interface BattlePreviewPlayableTargetSlot<TTarget> {
  displayedTarget: {
    target: TTarget;
  } | null;
}

export const createBattlePreviewCompletionPlan = (args: {
  completionAtMs: number;
  loopMode: boolean;
  gapMs: number;
  cleanupBufferMs?: number;
}): BattlePreviewCompletionPlan => {
  const cleanupBufferMs = args.cleanupBufferMs ?? 40;

  return {
    completionAtMs: args.completionAtMs,
    restartAtMs: args.loopMode ? args.completionAtMs + args.gapMs : null,
    cleanupAtMs: args.completionAtMs + cleanupBufferMs,
    loopMode: args.loopMode,
    gapMs: args.gapMs,
    cleanupBufferMs,
  };
};

export const createBattleCombatPreviewPhaseDebugEntries = (
  schedule: BattleCombatPreviewSchedule,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "attack",
    atMs: schedule.attack.atMs,
    durationMs: schedule.attack.durationMs,
    endMs: schedule.attack.endMs,
  },
  {
    key: "impact",
    atMs: schedule.impact.atMs,
    durationMs: schedule.impact.durationMs,
    endMs: schedule.impact.endMs,
    dependsOn: schedule.impact.dependsOn ?? null,
  },
  {
    key: "replacement",
    atMs: schedule.replacement.atMs,
    durationMs: schedule.replacement.durationMs,
    endMs: schedule.replacement.endMs,
    dependsOn: schedule.replacement.dependsOn ?? null,
  },
  {
    key: "finish",
    atMs: schedule.finish.atMs,
    durationMs: schedule.finish.durationMs,
    endMs: schedule.finish.endMs,
    dependsOn: schedule.finish.dependsOn ?? null,
  },
];

export const createBattleOpeningPreviewPhaseDebugEntries = (
  timing: BattleOpeningPreviewTiming,
): BattlePreviewPhaseDebugEntry[] => {
  const lastEnterStartMs =
    timing.targetCount > 0
      ? getBattleOpeningPreviewTargetEnterAtMs({
          index: Math.max(0, timing.targetCount - 1),
          staggerMs: timing.staggerMs,
          enterDurationMs: timing.enterDurationMs,
          initialDelayMs: timing.initialDelayMs,
        })
      : timing.initialDelayMs ?? BATTLE_OPENING_PREVIEW_INITIAL_DELAY_MS;
  const enterEndMs = lastEnterStartMs + timing.enterDurationMs;

  return [
    {
      key: "opening-enter",
      atMs: 0,
      durationMs: enterEndMs,
      endMs: enterEndMs,
    },
    {
      key: "finish",
      atMs: enterEndMs + timing.settleMs,
      durationMs: 0,
      endMs: enterEndMs + timing.settleMs,
      dependsOn: "opening-enter",
    },
  ];
};

export const createBattleReplacementPreviewPhaseDebugEntries = (
  timing: BattleReplacementPreviewTiming,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "replacement-enter",
    atMs: 0,
    durationMs: timing.enterDurationMs,
    endMs: timing.enterDurationMs,
  },
  {
    key: "finish",
    atMs: timing.enterDurationMs + timing.settleMs,
    durationMs: 0,
    endMs: timing.enterDurationMs + timing.settleMs,
    dependsOn: "replacement-enter",
  },
];

export const createBattlePostPlayDrawPreviewPhaseDebugEntries = (
  timing: BattlePostPlayDrawPreviewTiming,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "draw",
    atMs: 0,
    durationMs: timing.drawDurationMs,
    endMs: timing.drawDurationMs,
  },
  {
    key: "finish",
    atMs: timing.drawDurationMs + timing.settleMs,
    durationMs: 0,
    endMs: timing.drawDurationMs + timing.settleMs,
    dependsOn: "draw",
  },
];

export const createBattleHandPlayTargetPreviewPhaseDebugEntries = (
  timing: BattleHandPlayTargetPreviewTiming,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "hand-exit",
    atMs: 0,
    durationMs: timing.travelMs,
    endMs: timing.travelMs,
  },
  {
    key: "target-commit",
    atMs: timing.travelMs + timing.settleMs,
    durationMs: 0,
    endMs: timing.travelMs + timing.settleMs,
    dependsOn: "hand-exit",
  },
];

export const createBattleSimplePlayPreviewPhaseDebugEntries = (
  timing: BattleSimplePlayPreviewTiming,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "hand-exit",
    atMs: 0,
    durationMs: timing.commitAtMs,
    endMs: timing.commitAtMs,
  },
  {
    key: "target-commit",
    atMs: timing.commitAtMs,
    durationMs: 0,
    endMs: timing.commitAtMs,
    dependsOn: "hand-exit",
  },
  ...(timing.drawAtMs != null && timing.drawDurationMs != null
    ? [
        {
          key: "draw",
          atMs: timing.drawAtMs,
          durationMs: timing.drawDurationMs,
          endMs: timing.drawAtMs + timing.drawDurationMs,
          dependsOn: "target-commit",
        } satisfies BattlePreviewPhaseDebugEntry,
      ]
    : []),
  {
    key: "finish",
    atMs: timing.finishAtMs,
    durationMs: 0,
    endMs: timing.finishAtMs,
    dependsOn: timing.drawAtMs != null ? "draw" : "target-commit",
  },
];

export const createBattleMulliganPreviewPhaseDebugEntries = (
  schedule: BattleMulliganPreviewSchedule,
): BattlePreviewPhaseDebugEntry[] => [
  {
    key: "return",
    atMs: schedule.return.atMs,
    durationMs: schedule.return.durationMs,
    endMs: schedule.return.endMs,
  },
  {
    key: "draw",
    atMs: schedule.draw.atMs,
    durationMs: schedule.draw.durationMs,
    endMs: schedule.draw.endMs,
    dependsOn: schedule.draw.dependsOn ?? null,
  },
  {
    key: "finish",
    atMs: schedule.finish.atMs,
    durationMs: schedule.finish.durationMs,
    endMs: schedule.finish.endMs,
    dependsOn: schedule.finish.dependsOn ?? null,
  },
];

export const formatBattlePreviewPhaseDebugEntry = (
  entry: BattlePreviewPhaseDebugEntry,
) =>
  `phase:${entry.key} at:${entry.atMs} dur:${entry.durationMs} end:${entry.endMs}${
    entry.dependsOn ? ` dep:${entry.dependsOn}` : ""
  }`;

export const formatBattlePreviewCompletionDebugLine = (
  plan: BattlePreviewCompletionPlan,
) =>
  `completion:${plan.completionAtMs} restart:${
    plan.restartAtMs ?? "-"
  } cleanup:${plan.cleanupAtMs} loop:${plan.loopMode ? 1 : 0} gap:${plan.gapMs}`;

export const getBattlePreviewPhasesCompletionAtMs = (
  phases: BattlePreviewPhaseDebugEntry[],
) =>
  phases.reduce((max, phase) => Math.max(max, phase.endMs), 0);

export const collectBattlePreviewPlayableTargets = <TTarget>(
  slots: BattlePreviewPlayableTargetSlot<TTarget>[],
): TTarget[] =>
  slots.flatMap((slot) =>
    slot.displayedTarget ? [slot.displayedTarget.target] : [],
  );
