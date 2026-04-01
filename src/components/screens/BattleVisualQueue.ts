import { BattleHandLaneOutgoingCard } from "./BattleHandLane";
import {
  BattleRuntimeSide,
  IncomingHandCard,
  IncomingTargetCard,
  LockedTargetSlotsState,
  OutgoingTargetCard,
  PendingTargetPlacementsState,
} from "./BattleRuntimeState";

export interface BattleVisualQueueState {
  incomingHands: Record<BattleRuntimeSide, IncomingHandCard[]>;
  outgoingHands: Record<BattleRuntimeSide, BattleHandLaneOutgoingCard[]>;
  pendingMulliganDrawCounts: Record<BattleRuntimeSide, number>;
  incomingTargets: Record<BattleRuntimeSide, IncomingTargetCard[]>;
  outgoingTargets: Record<BattleRuntimeSide, OutgoingTargetCard[]>;
  lockedTargetSlots: LockedTargetSlotsState;
  pendingTargetPlacements: PendingTargetPlacementsState;
  freshCardIds: string[];
  enemyHandPulse: boolean;
}

export const createEmptyBattleVisualQueueState = (): BattleVisualQueueState => ({
  incomingHands: {
    0: [],
    1: [],
  },
  outgoingHands: {
    0: [],
    1: [],
  },
  pendingMulliganDrawCounts: {
    0: 0,
    1: 0,
  },
  incomingTargets: {
    0: [],
    1: [],
  },
  outgoingTargets: {
    0: [],
    1: [],
  },
  lockedTargetSlots: {
    0: [],
    1: [],
  },
  pendingTargetPlacements: {
    0: [],
    1: [],
  },
  freshCardIds: [],
  enemyHandPulse: false,
});
