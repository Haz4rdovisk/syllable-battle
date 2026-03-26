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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveHandSpacing = (
  total: number,
  desktop: boolean,
  laneWidth: number | null | undefined,
  compactSpacing: number,
  defaultSpacing: number,
) => {
  if (total <= 1) return 0;

  if (!laneWidth || laneWidth <= 0) {
    return total > 5 ? compactSpacing : defaultSpacing;
  }

  const cardWidth = desktop ? 110 : 86;
  const edgePadding = desktop ? 28 : 16;
  const availableSpacing = (laneWidth - edgePadding * 2 - cardWidth) / (total - 1);
  const minSpacing = desktop ? 56 : 42;
  const maxSpacing = total > 5 ? compactSpacing : defaultSpacing;

  return clamp(availableSpacing, minSpacing, maxSpacing);
};

export const getBattleHandLayout = (
  presentation: "local" | "remote",
  total: number,
  index: number,
  desktop: boolean,
  laneWidth?: number | null,
) => {
  const direction = presentation === "local" ? 1 : -1;
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const spacing = resolveHandSpacing(total, desktop, laneWidth, desktop ? 88 : 64, desktop ? 116 : 76);
  const y = Math.abs(offset) * (desktop ? 10 : 7) * direction;
  return { x: offset * spacing, y, rotate: offset * 5 * direction, scale: 1 };
};

export const getPlayerHandLayout = (
  total: number,
  index: number,
  desktop: boolean,
  laneWidth?: number | null,
) => getBattleHandLayout("local", total, index, desktop, laneWidth);

export const getEnemyHandLayout = (
  total: number,
  index: number,
  desktop: boolean,
  laneWidth?: number | null,
) => getBattleHandLayout("remote", total, index, desktop, laneWidth);

export const getBattleHandFrame = (
  presentation: "local" | "remote",
  total: number,
  desktop: boolean,
) => {
  if (total <= 0) {
    return {
      width: desktop ? 220 : 180,
      height: desktop ? 150 : 120,
    };
  }

  const getLayout =
    (totalCards: number, layoutIndex: number, isDesktop: boolean, width?: number | null) =>
      getBattleHandLayout(presentation, totalCards, layoutIndex, isDesktop, width);
  const cardWidth = desktop ? 110 : 86;
  const cardHeight = desktop ? 150 : 120;

  const bounds = Array.from({ length: total }, (_, index) =>
    getLayout(total, index, desktop, null),
  ).reduce(
    (acc, layout) => ({
      minX: Math.min(acc.minX, layout.x - cardWidth / 2),
      maxX: Math.max(acc.maxX, layout.x + cardWidth / 2),
      minY: Math.min(acc.minY, layout.y),
      maxY: Math.max(acc.maxY, layout.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return {
    width: Math.round(bounds.maxX - bounds.minX + (desktop ? 24 : 16)),
    height: Math.round(cardHeight + (bounds.maxY - bounds.minY) + (desktop ? 22 : 16)),
  };
};

export const getPlayedCardCommitDelayMs = (flow: BattleFlowTimings) => flow.cardToFieldMs + flow.cardSettleMs;

export const getPlayDrawStartDelayMs = (flow: BattleFlowTimings) =>
  flow.cardToFieldMs + flow.cardSettleMs + flow.drawSettleMs;

export const getPlayFinishDelayMs = (flow: BattleFlowTimings) =>
  flow.cardToFieldMs +
  flow.cardSettleMs +
  flow.drawSettleMs +
  flow.drawTravelMs +
  flow.turnHandoffMs;

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
