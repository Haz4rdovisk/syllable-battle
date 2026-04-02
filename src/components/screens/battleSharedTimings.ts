import { TIMINGS } from "../../logic/gameLogic";
import type { BattleFlowTimings } from "./battleFlow";

export interface BattleAnimationTimingConfig extends BattleFlowTimings {
  attackWindupMs: number;
  attackWindupBufferMs: number;
  attackTravelMs: number;
  attackTravelBufferMs: number;
  impactPauseMs: number;
  targetExitMs: number;
  targetExitBufferMs: number;
  replacementGapMs: number;
  targetEnterMs: number;
  targetSettleMs: number;
  openingTargetEnterStaggerMs: number;
  openingTargetSettleMs: number;
}

export const BATTLE_SHARED_ANIMATION_TIMINGS: BattleAnimationTimingConfig = {
  cardToFieldMs: 660,
  cardSettleMs: 180,
  drawTravelMs: 940,
  drawStaggerMs: 130,
  drawSettleMs: 220,
  visualSettleBufferMs: 180,
  turnHandoffMs: 260,
  mulliganTurnHandoffMs: 140,
  attackWindupMs: 220,
  attackWindupBufferMs: 90,
  attackTravelMs: 1020,
  attackTravelBufferMs: 120,
  impactPauseMs: 260,
  targetExitMs: TIMINGS.leaveMs,
  targetExitBufferMs: 180,
  replacementGapMs: 220,
  targetEnterMs: TIMINGS.leaveMs,
  targetSettleMs: 240,
  mulliganReturnMs: 760,
  mulliganReturnStaggerMs: 110,
  mulliganDrawDelayMs: 220,
  mulliganSettleMs: 260,
  openingTargetEnterStaggerMs: 220,
  openingTargetSettleMs: 560,
};

export const BATTLE_SHARED_FLOW_TIMINGS = BATTLE_SHARED_ANIMATION_TIMINGS;

export const BATTLE_SHARED_OPENING_TARGET_TIMINGS = {
  targetEnterStaggerMs: BATTLE_SHARED_ANIMATION_TIMINGS.openingTargetEnterStaggerMs,
  targetSettleMs: BATTLE_SHARED_ANIMATION_TIMINGS.openingTargetSettleMs,
} as const;
