import type { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";

export interface BattleSimplePlayRuntimeGeometry {
  handPlayDestination: ZoneAnchorSnapshot | null;
  postPlayDrawOrigin: ZoneAnchorSnapshot | null;
}

export interface ResolvedBattleSimplePlayLiveGeometry {
  visualGeometry: BattleSimplePlayRuntimeGeometry | null;
  fallbackHandPlayDestination: ZoneAnchorSnapshot | null;
  fallbackPostPlayDrawOrigin: ZoneAnchorSnapshot | null;
}

export const resolveBattleSimplePlayLiveGeometry = ({
  side,
  targetIndex,
  hasVisualPlan,
  fieldZoneId,
  getHandPlayTargetDestinationSnapshot,
  getPostPlayHandDrawOriginSnapshot,
  snapshotZoneSlot,
}: {
  side: 0 | 1;
  targetIndex: number;
  hasVisualPlan: boolean;
  fieldZoneId: BoardZoneId;
  getHandPlayTargetDestinationSnapshot: (
    side: 0 | 1,
    targetIndex: number,
  ) => ZoneAnchorSnapshot | null;
  getPostPlayHandDrawOriginSnapshot: (side: 0 | 1) => ZoneAnchorSnapshot | null;
  snapshotZoneSlot: (zoneId: BoardZoneId, slot: string) => ZoneAnchorSnapshot | null;
}): ResolvedBattleSimplePlayLiveGeometry => {
  const fallbackHandPlayDestination =
    getHandPlayTargetDestinationSnapshot(side, targetIndex) ??
    snapshotZoneSlot(fieldZoneId, `slot-${targetIndex}`);
  const fallbackPostPlayDrawOrigin = getPostPlayHandDrawOriginSnapshot(side);

  return {
    visualGeometry: hasVisualPlan
      ? {
          handPlayDestination: fallbackHandPlayDestination,
          postPlayDrawOrigin: fallbackPostPlayDrawOrigin,
        }
      : null,
    fallbackHandPlayDestination,
    fallbackPostPlayDrawOrigin,
  };
};
