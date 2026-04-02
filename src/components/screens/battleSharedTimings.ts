import { TIMINGS } from "../../logic/gameLogic";

export const BATTLE_SHARED_FLOW_TIMINGS = {
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
} as const;

export const BATTLE_SHARED_OPENING_TARGET_TIMINGS = {
  targetEnterStaggerMs: 220,
  targetSettleMs: 560,
} as const;
