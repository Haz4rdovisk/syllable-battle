import { BattleTurnAction, Syllable, UITarget } from "../../types/game";
import { canPlace } from "../../logic/gameLogic";

export interface BattleFlowTimings {
  cardToFieldMs: number;
  cardSettleMs: number;
  drawTravelMs: number;
  drawStaggerMs: number;
  drawSettleMs: number;
  visualSettleBufferMs: number;
  turnHandoffMs: number;
  mulliganTurnHandoffMs: number;
  mulliganReturnMs: number;
  mulliganReturnStaggerMs: number;
  mulliganDrawDelayMs: number;
  mulliganSettleMs: number;
}

export const getPlayerHandLayout = (total: number, index: number, desktop: boolean) => {
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const spacing = total > 5 ? (desktop ? 78 : 64) : desktop ? 100 : 76;
  const y = Math.abs(offset) * (desktop ? 10 : 7);
  return { x: offset * spacing, y, rotate: offset * 5, scale: 1 };
};

export const getEnemyHandLayout = (total: number, index: number, desktop: boolean) => {
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const spacing = total > 5 ? (desktop ? 78 : 64) : desktop ? 92 : 72;
  const y = Math.abs(offset) * (desktop ? -10 : -7);
  return { x: offset * spacing, y, rotate: offset * -5, scale: 1 };
};

export const getPlayedCardCommitDelayMs = (flow: BattleFlowTimings) => flow.cardToFieldMs + flow.cardSettleMs;

export const getPlayDrawStartDelayMs = (flow: BattleFlowTimings) => flow.cardToFieldMs + flow.cardSettleMs;

export const getPlayFinishDelayMs = (flow: BattleFlowTimings) =>
  flow.cardToFieldMs + flow.cardSettleMs + flow.drawTravelMs + flow.turnHandoffMs;

export const getMulliganDrawStartDelayMs = (flow: BattleFlowTimings, returnedCount: number) =>
  flow.mulliganReturnMs + Math.max(0, returnedCount - 1) * flow.mulliganReturnStaggerMs + flow.mulliganDrawDelayMs;

export const getMulliganFinishDelayMs = (flow: BattleFlowTimings, returnedCount: number, drawnCount: number) =>
  getMulliganDrawStartDelayMs(flow, returnedCount) +
  flow.drawTravelMs +
  Math.max(0, drawnCount - 1) * flow.drawStaggerMs +
  flow.mulliganTurnHandoffMs;

export const getBotMulliganIndexes = (hand: Syllable[], maxReturns: number) => {
  const capped = Math.min(maxReturns, hand.length);
  return Array.from({ length: capped }, (_, index) => index);
};

export const resolveBotTurnAction = (args: {
  actedThisTurn: boolean;
  hand: Syllable[];
  targets: UITarget[];
  mulliganUsedThisRound: boolean;
  maxMulligan: number;
}): BattleTurnAction => {
  if (args.actedThisTurn) return { type: "pass" };

  for (let handIndex = 0; handIndex < args.hand.length; handIndex++) {
    for (let targetIndex = 0; targetIndex < args.targets.length; targetIndex++) {
      if (canPlace(args.hand[handIndex], args.targets[targetIndex])) {
        return { type: "play", handIndex, targetIndex };
      }
    }
  }

  const isStuck = !args.hand.some((card) => args.targets.some((target) => canPlace(card, target)));

  if (!args.mulliganUsedThisRound && isStuck) {
    return {
      type: "mulligan",
      handIndexes: getBotMulliganIndexes(args.hand, args.maxMulligan),
    };
  }

  return { type: "pass" };
};
