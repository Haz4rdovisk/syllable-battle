import type { Syllable } from "../../types/game";
import type {
  BattleLayoutPreviewAnimationPreset,
  BattleLayoutPreviewAnimationSet,
} from "./BattleLayoutEditorState";
import type { BattleAnimationTimingLayoutConfig } from "./BattleLayoutConfig";
import {
  createBattleCombatPreviewSchedule,
  createBattleMulliganPreviewSchedule,
} from "./battleCompositeSchedule";
import {
  createBattleHandPlayTargetPreviewPhaseDebugEntries,
  createBattleOpeningPreviewPhaseDebugEntries,
  createBattlePostPlayDrawPreviewPhaseDebugEntries,
  createBattleReplacementPreviewPhaseDebugEntries,
  getBattlePreviewPhasesCompletionAtMs,
} from "./battlePreviewPlayback";
import { createSimplePlayVisualPlan } from "./battleVisualPlan";

const PILL_DAMAGE_DURATION_MS = 1200;
const PILL_TURN_DURATION_MS = 1120;
const BOARD_MESSAGE_TURN_DURATION_MS = 1120;
const BOARD_MESSAGE_INFO_DURATION_MS = 1100;
const PREVIEW_PLACEHOLDER_SYLLABLE = "ba" as Syllable;

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

const getMulliganCompleteComboCountFromPreset = (
  preset: BattleLayoutPreviewAnimationPreset,
): 1 | 2 | 3 | null => {
  if (preset === "mulligan-complete-combo-1") return 1;
  if (preset === "mulligan-complete-combo-2") return 2;
  if (preset === "mulligan-complete-combo-3") return 3;
  return null;
};

export const getBattleAnimationPreviewDurationMs = (args: {
  animationSet: BattleLayoutPreviewAnimationSet;
  preset: BattleLayoutPreviewAnimationPreset;
  timings: BattleAnimationTimingLayoutConfig;
}): number => {
  const { animationSet, preset, timings } = args;
  if (preset === "none") return 0;

  if (animationSet === "pill-damage") {
    return PILL_DAMAGE_DURATION_MS;
  }
  if (animationSet === "pill-turn") {
    return PILL_TURN_DURATION_MS;
  }
  if (animationSet === "board-message") {
    return preset === "board-message-round-info"
      ? BOARD_MESSAGE_INFO_DURATION_MS
      : BOARD_MESSAGE_TURN_DURATION_MS;
  }
  if (animationSet === "opening-target-entry-first-round") {
    const targetCount = preset === "opening-target-entry-simultaneous" ? 4 : 1;
    return getBattlePreviewPhasesCompletionAtMs(
      createBattleOpeningPreviewPhaseDebugEntries({
        targetCount,
        staggerMs: timings.openingTargetEnterStaggerMs,
        enterDurationMs: timings.targetEnterMs,
        settleMs: timings.openingTargetSettleMs,
        initialDelayMs: timings.openingTargetInitialDelayMs,
      }),
    );
  }
  if (animationSet === "replacement-target-entry") {
    return getBattlePreviewPhasesCompletionAtMs(
      createBattleReplacementPreviewPhaseDebugEntries({
        enterDurationMs: timings.targetEnterMs,
        settleMs: timings.targetSettleMs,
      }),
    );
  }
  if (animationSet === "post-play-hand-draw") {
    return getBattlePreviewPhasesCompletionAtMs(
      createBattlePostPlayDrawPreviewPhaseDebugEntries({
        drawDurationMs: timings.drawTravelMs,
        settleMs: timings.drawSettleMs,
      }),
    );
  }
  if (animationSet === "hand-play-target") {
    return getBattlePreviewPhasesCompletionAtMs(
      createBattleHandPlayTargetPreviewPhaseDebugEntries({
        travelMs: timings.cardToFieldMs,
        settleMs: timings.cardSettleMs,
      }),
    );
  }
  if (animationSet === "mulligan-hand-return") {
    const count = getMulliganCountFromPreset(preset) ?? 0;
    const schedule = createBattleMulliganPreviewSchedule({
      flow: timings,
      returnedCount: count,
      drawnCount: count,
    });
    return schedule.return.endMs + timings.mulliganSettleMs;
  }
  if (animationSet === "mulligan-hand-draw") {
    const count = getMulliganCountFromPreset(preset) ?? 0;
    return createBattleMulliganPreviewSchedule({
      flow: timings,
      returnedCount: count,
      drawnCount: count,
    }).finish.atMs;
  }
  if (animationSet === "target-attack") {
    return createBattleCombatPreviewSchedule({
      flow: timings,
      drawnCardCount: 0,
    }).attack.endMs;
  }
  if (animationSet === "hand-play-draw-combo") {
    const visualPlan = createSimplePlayVisualPlan({
      flow: timings,
      result: {
        damage: 0,
        completedSlot: null,
        actorIndex: 0,
        playedCard: PREVIEW_PLACEHOLDER_SYLLABLE,
        drawnCards: [PREVIEW_PLACEHOLDER_SYLLABLE],
      },
      targetIndex: 0,
      handIndex: 0,
      stableHandCountBeforePlay: 5,
    });
    return visualPlan?.finish.atMs ?? 0;
  }
  if (animationSet === "target-attack-replacement-combo") {
    const schedule = createBattleCombatPreviewSchedule({
      flow: timings,
      drawnCardCount: 1,
    });
    return schedule.finish.atMs;
  }

  const count = getMulliganCompleteComboCountFromPreset(preset) ?? 0;
  return createBattleMulliganPreviewSchedule({
    flow: timings,
    returnedCount: count,
    drawnCount: count,
  }).finish.atMs;
};
