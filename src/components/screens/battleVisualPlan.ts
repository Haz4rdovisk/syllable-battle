import type { Syllable } from "../../types/game";
import type { BattleFlowTimings } from "./battleFlow";
import {
  getPlayDrawStartDelayMs,
  getPlayFinishDelayMs,
  getPlayedCardCommitDelayMs,
} from "./battleFlow";
import type { ResolvedBattlePlayAction } from "./battleResolution";

export type BattleSimplePlayVisualResult = Pick<
  ResolvedBattlePlayAction,
  "damage" | "completedSlot" | "actorIndex" | "playedCard" | "drawnCards"
>;

export interface BattleSimplePlayVisualPlan {
  kind: "simple-play";
  actorIndex: 0 | 1;
  targetIndex: number;
  playedCard: Syllable;
  stableHandCountBeforePlay: number;
  stableHandCountAfterPlay: number;
  handExit: {
    atMs: 0;
    handIndex: number;
    handCountBefore: number;
  };
  targetProgressCommit: {
    atMs: number;
    targetIndex: number;
  };
  postPlayDraw:
    | {
        atMs: number;
        cards: Syllable[];
        finalIndexBase: number;
        finalTotal: number;
        staggerMs: number;
        durationMs: number;
      }
    | null;
  finish: {
    atMs: number;
  };
}

export const createSimplePlayVisualPlan = (args: {
  flow: BattleFlowTimings;
  result: BattleSimplePlayVisualResult;
  targetIndex: number;
  handIndex: number;
  stableHandCountBeforePlay: number;
  handLayoutSlotCount?: number;
}): BattleSimplePlayVisualPlan | null => {
  const {
    flow,
    result,
    targetIndex,
    handIndex,
    stableHandCountBeforePlay,
    handLayoutSlotCount = 5,
  } = args;

  if (
    result.damage !== 0 ||
    result.completedSlot !== null ||
    handIndex < 0 ||
    stableHandCountBeforePlay <= 0
  ) {
    return null;
  }

  const stableHandCountAfterPlay = Math.max(0, stableHandCountBeforePlay - 1);
  const drawCount = result.drawnCards.length;
  const finalTotal = Math.min(
    handLayoutSlotCount,
    stableHandCountAfterPlay + drawCount,
  );

  return {
    kind: "simple-play",
    actorIndex: result.actorIndex as 0 | 1,
    targetIndex,
    playedCard: result.playedCard,
    stableHandCountBeforePlay,
    stableHandCountAfterPlay,
    handExit: {
      atMs: 0,
      handIndex,
      handCountBefore: stableHandCountBeforePlay,
    },
    targetProgressCommit: {
      atMs: getPlayedCardCommitDelayMs(flow),
      targetIndex,
    },
    postPlayDraw:
      drawCount > 0
        ? {
            atMs: getPlayDrawStartDelayMs(flow),
            cards: result.drawnCards,
            finalIndexBase: stableHandCountAfterPlay,
            finalTotal,
            staggerMs: flow.drawStaggerMs,
            durationMs: flow.drawTravelMs,
          }
        : null,
    finish: {
      atMs: getPlayFinishDelayMs(flow),
    },
  };
};
