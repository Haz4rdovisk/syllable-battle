import type { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import type { BattleFlowTimings } from "./battleFlow";
import type { ResolvedBattlePlayAction } from "./battleResolution";
import {
  resolveBattleSimplePlayLiveGeometry,
  type ResolvedBattleSimplePlayLiveGeometry,
} from "./battleSimplePlayGeometry";
import {
  createSimplePlayVisualPlan,
  type BattleSimplePlayVisualPlan,
} from "./battleVisualPlan";

export interface PreparedBattleSimplePlayStep {
  logicalEvent: {
    result: ResolvedBattlePlayAction;
    targetIndex: number;
    targetName: string;
  };
  visualPlan: BattleSimplePlayVisualPlan | null;
  liveGeometry: ResolvedBattleSimplePlayLiveGeometry;
  statefulExecution: {
    playedCardLayout: {
      index: number;
      total: number;
    };
  };
}

export const prepareBattleSimplePlayStep = ({
  side,
  flow,
  result,
  handIndex,
  targetIndex,
  targetName,
  stableHandCountBeforePlay,
  handLayoutSlotCount,
  fieldZoneId,
  getHandPlayTargetDestinationSnapshot,
  getPostPlayHandDrawOriginSnapshot,
  snapshotZoneSlot,
}: {
  side: 0 | 1;
  flow: BattleFlowTimings;
  result: ResolvedBattlePlayAction;
  handIndex: number;
  targetIndex: number;
  targetName: string;
  stableHandCountBeforePlay: number;
  handLayoutSlotCount: number;
  fieldZoneId: BoardZoneId;
  getHandPlayTargetDestinationSnapshot: (
    side: 0 | 1,
    targetIndex: number,
  ) => ZoneAnchorSnapshot | null;
  getPostPlayHandDrawOriginSnapshot: (side: 0 | 1) => ZoneAnchorSnapshot | null;
  snapshotZoneSlot: (zoneId: BoardZoneId, slot: string) => ZoneAnchorSnapshot | null;
}): PreparedBattleSimplePlayStep => {
  const visualPlan = createSimplePlayVisualPlan({
    flow,
    result,
    targetIndex,
    handIndex,
    stableHandCountBeforePlay,
    handLayoutSlotCount,
  });
  const liveGeometry = resolveBattleSimplePlayLiveGeometry({
    side,
    targetIndex,
    hasVisualPlan: Boolean(visualPlan),
    fieldZoneId,
    getHandPlayTargetDestinationSnapshot,
    getPostPlayHandDrawOriginSnapshot,
    snapshotZoneSlot,
  });

  return {
    logicalEvent: {
      result,
      targetIndex,
      targetName,
    },
    visualPlan,
    liveGeometry,
    statefulExecution: {
      playedCardLayout: {
        index: handIndex,
        total: stableHandCountBeforePlay,
      },
    },
  };
};
