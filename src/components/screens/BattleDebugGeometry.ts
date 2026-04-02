import type { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import type {
  BattleAnimationAnchorPoint,
  BattleAnimationLayoutConfig,
} from "./BattleLayoutConfig";
import {
  BattleSceneAnimationAnchorKey,
  createBattleAuthoredAnimationAnchorSet,
  getBattleAnimationAnchorReferenceTarget,
} from "./BattleAnchorResolver";

export type BattleDebugPoint = { x: number; y: number };

export type LiveBattleAnimationAnchorKey = BattleSceneAnimationAnchorKey;

export interface BattleProbeRow<AnchorKey extends string = string> {
  anchor: AnchorKey;
  point: BattleDebugPoint;
  screen: BattleDebugPoint | null;
  reference: BattleDebugPoint | null;
  referenceScreen: BattleDebugPoint | null;
  deltaScene: BattleDebugPoint | null;
  deltaScreen: BattleDebugPoint | null;
  failureReason?: string | null;
}

export interface BattleAnimationSnapshotEntry<
  AnchorKey extends string = string,
  GroupKey extends string = string,
> {
  group: GroupKey;
  key: AnchorKey;
  point: BattleAnimationAnchorPoint | null;
}

export type LiveBattleAnimationReferenceTarget =
  | { kind: "zone"; zoneId: BoardZoneId }
  | { kind: "slot"; zoneId: BoardZoneId; slot: string }
  | null;

export interface BattleDebugStageMetrics {
  rect: { left: number; top: number };
  scaleX: number;
  scaleY: number;
}

export const getBattleDebugZoneSnapshotCenter = (
  snapshot: ZoneAnchorSnapshot | null | undefined,
): BattleDebugPoint | null => {
  if (!snapshot) return null;
  return {
    x: Math.round(snapshot.left + snapshot.width / 2),
    y: Math.round(snapshot.top + snapshot.height / 2),
  };
};

export const createLiveAnimationAnchorPoints = (
  animations: BattleAnimationLayoutConfig,
): Record<LiveBattleAnimationAnchorKey, BattleAnimationAnchorPoint | null> =>
  createBattleAuthoredAnimationAnchorSet(animations);

export const getLiveAnimationAnchorReferenceTarget = (
  anchorKey: LiveBattleAnimationAnchorKey,
  targetsInPlay: number,
): LiveBattleAnimationReferenceTarget =>
  getBattleAnimationAnchorReferenceTarget(anchorKey, targetsInPlay);

export const getVisibleBattleAnimationAnchors = <AnchorKey extends string>(
  anchorPoints: Record<AnchorKey, BattleAnimationAnchorPoint | null>,
) =>
  (Object.entries(anchorPoints) as [AnchorKey, BattleAnimationAnchorPoint | null][])
    .filter(([, point]) => Boolean(point))
    .map(([anchor, point]) => ({ anchor, point: point as BattleAnimationAnchorPoint }));

export const buildBattleProbeRow = <AnchorKey extends string>({
  anchor,
  point,
  screen,
  reference,
  referenceScreen,
  failureReason,
}: {
  anchor: AnchorKey;
  point: BattleDebugPoint;
  screen: BattleDebugPoint | null;
  reference: BattleDebugPoint | null;
  referenceScreen: BattleDebugPoint | null;
  failureReason?: string | null;
}): BattleProbeRow<AnchorKey> => ({
  anchor,
  point,
  screen,
  reference,
  referenceScreen,
  failureReason,
  deltaScene: reference
    ? {
        x: Math.round(point.x - reference.x),
        y: Math.round(point.y - reference.y),
      }
    : null,
  deltaScreen:
    screen && referenceScreen
      ? {
          x: Math.round(screen.x - referenceScreen.x),
          y: Math.round(screen.y - referenceScreen.y),
        }
      : null,
});

export const formatBattleProbeLine = <AnchorKey extends string>(
  row: BattleProbeRow<AnchorKey>,
  label?: string | null,
) =>
  `probe:${label ? `${label}:` : ""}${row.anchor} scene:${formatBattleDebugPoint(row.point)} screen:${formatBattleDebugPoint(row.screen)} ref:${formatBattleDebugPoint(row.reference)} refScreen:${formatBattleDebugPoint(row.referenceScreen)} dScene:${formatBattleDebugDelta(row.deltaScene)} dScreen:${formatBattleDebugDelta(row.deltaScreen)}`;

export const buildLiveAnimationSnapshotEntries = (
  animations: BattleAnimationLayoutConfig,
): Array<BattleAnimationSnapshotEntry<LiveBattleAnimationAnchorKey>> => [
  {
    group: "postPlayDraw",
    key: "postPlayHandDrawOrigin",
    point: animations.postPlayHandDrawOrigin,
  },
  {
    group: "handPlayDests",
    key: "handPlayTarget0Destination",
    point: animations.handPlayTarget0Destination,
  },
  {
    group: "handPlayDests",
    key: "handPlayTarget1Destination",
    point: animations.handPlayTarget1Destination,
  },
  {
    group: "replacementOrigins",
    key: "replacementTargetEntry0Origin",
    point: animations.replacementTargetEntry0Origin,
  },
  {
    group: "replacementOrigins",
    key: "replacementTargetEntry1Origin",
    point: animations.replacementTargetEntry1Origin,
  },
  {
    group: "replacementOrigins",
    key: "replacementTargetEntry2Origin",
    point: animations.replacementTargetEntry2Origin,
  },
  {
    group: "replacementOrigins",
    key: "replacementTargetEntry3Origin",
    point: animations.replacementTargetEntry3Origin,
  },
  {
    group: "mulliganReturns",
    key: "mulliganReturn1Destination",
    point: animations.mulliganReturn1Destination,
  },
  {
    group: "mulliganReturns",
    key: "mulliganReturn2Destination",
    point: animations.mulliganReturn2Destination,
  },
  {
    group: "mulliganReturns",
    key: "mulliganReturn3Destination",
    point: animations.mulliganReturn3Destination,
  },
  {
    group: "mulliganDraws",
    key: "mulliganDraw1Origin",
    point: animations.mulliganDraw1Origin,
  },
  {
    group: "mulliganDraws",
    key: "mulliganDraw2Origin",
    point: animations.mulliganDraw2Origin,
  },
  {
    group: "mulliganDraws",
    key: "mulliganDraw3Origin",
    point: animations.mulliganDraw3Origin,
  },
  {
    group: "attackImpacts",
    key: "targetAttack0Impact",
    point: animations.targetAttack0Impact,
  },
  {
    group: "attackImpacts",
    key: "targetAttack1Impact",
    point: animations.targetAttack1Impact,
  },
  {
    group: "attackImpacts",
    key: "targetAttack2Impact",
    point: animations.targetAttack2Impact,
  },
  {
    group: "attackImpacts",
    key: "targetAttack3Impact",
    point: animations.targetAttack3Impact,
  },
  {
    group: "attackDests",
    key: "targetAttack0Destination",
    point: animations.targetAttack0Destination,
  },
  {
    group: "attackDests",
    key: "targetAttack1Destination",
    point: animations.targetAttack1Destination,
  },
  {
    group: "attackDests",
    key: "targetAttack2Destination",
    point: animations.targetAttack2Destination,
  },
  {
    group: "attackDests",
    key: "targetAttack3Destination",
    point: animations.targetAttack3Destination,
  },
  {
    group: "openingOrigins",
    key: "openingTargetEntry0Origin",
    point: animations.openingTargetEntry0Origin,
  },
  {
    group: "openingOrigins",
    key: "openingTargetEntry1Origin",
    point: animations.openingTargetEntry1Origin,
  },
  {
    group: "openingOrigins",
    key: "openingTargetEntry2Origin",
    point: animations.openingTargetEntry2Origin,
  },
  {
    group: "openingOrigins",
    key: "openingTargetEntry3Origin",
    point: animations.openingTargetEntry3Origin,
  },
];

export const formatBattleDebugPoint = (
  point: BattleDebugPoint | null | undefined,
) => (point ? `${point.x},${point.y}` : "-");

export const formatBattleDebugDelta = (
  point: BattleDebugPoint | null | undefined,
) => (point ? `${point.x >= 0 ? "+" : ""}${point.x},${point.y >= 0 ? "+" : ""}${point.y}` : "-");

export const formatBattleDebugSnapshot = (
  snapshot: ZoneAnchorSnapshot | null | undefined,
) =>
  snapshot
    ? `${Math.round(snapshot.left)},${Math.round(snapshot.top)} ${Math.round(snapshot.width)}x${Math.round(snapshot.height)}`
    : "-";

export const toBattleDebugScreenPoint = (
  point: BattleAnimationAnchorPoint | BattleDebugPoint | null | undefined,
  stageMetrics: BattleDebugStageMetrics | null | undefined,
): BattleDebugPoint | null => {
  if (!point || !stageMetrics) return null;
  return {
    x: Math.round(stageMetrics.rect.left + point.x * stageMetrics.scaleX),
    y: Math.round(stageMetrics.rect.top + point.y * stageMetrics.scaleY),
  };
};

export const toBattleDebugScenePoint = (
  point: BattleDebugPoint | null | undefined,
  stageMetrics: BattleDebugStageMetrics | null | undefined,
): BattleDebugPoint | null => {
  if (!point || !stageMetrics) return null;
  return {
    x: Math.round((point.x - stageMetrics.rect.left) / stageMetrics.scaleX),
    y: Math.round((point.y - stageMetrics.rect.top) / stageMetrics.scaleY),
  };
};

export const buildBattleDebugPointSnapshot = (
  point: BattleAnimationAnchorPoint | BattleDebugPoint | null | undefined,
  stageMetrics: BattleDebugStageMetrics | null | undefined,
): ZoneAnchorSnapshot | null => {
  const screenPoint = toBattleDebugScreenPoint(point, stageMetrics);
  return screenPoint
    ? {
        left: screenPoint.x,
        top: screenPoint.y,
        width: 0,
        height: 0,
      }
    : null;
};

export const getPreviewAnimationAnchorReferenceTarget = (
  anchorKey: string,
  targetsInPlay: number,
): LiveBattleAnimationReferenceTarget =>
  getBattleAnimationAnchorReferenceTarget(
    anchorKey as Parameters<typeof getBattleAnimationAnchorReferenceTarget>[0],
    targetsInPlay,
  );

export const formatBattleDebugFallbackLine = (entry: {
  createdAt: number;
  label: string;
  reason: string;
  fallback: string;
}) => {
  const timestamp = new Date(entry.createdAt).toLocaleTimeString("pt-BR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `fallback:${timestamp} ${entry.label} reason:${entry.reason} -> ${entry.fallback}`;
};
