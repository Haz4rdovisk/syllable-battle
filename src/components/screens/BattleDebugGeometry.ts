import type { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import type {
  BattleAnimationAnchorPoint,
  BattleAnimationLayoutConfig,
} from "./BattleLayoutConfig";

export type BattleDebugPoint = { x: number; y: number };

export type LiveBattleAnimationAnchorKey = keyof BattleAnimationLayoutConfig;

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
): Record<LiveBattleAnimationAnchorKey, BattleAnimationAnchorPoint | null> => ({
  openingTargetEntry0Origin: animations.openingTargetEntry0Origin,
  openingTargetEntry1Origin: animations.openingTargetEntry1Origin,
  openingTargetEntry2Origin: animations.openingTargetEntry2Origin,
  openingTargetEntry3Origin: animations.openingTargetEntry3Origin,
  replacementTargetEntry0Origin: animations.replacementTargetEntry0Origin,
  replacementTargetEntry1Origin: animations.replacementTargetEntry1Origin,
  replacementTargetEntry2Origin: animations.replacementTargetEntry2Origin,
  replacementTargetEntry3Origin: animations.replacementTargetEntry3Origin,
  postPlayHandDrawOrigin: animations.postPlayHandDrawOrigin,
  handPlayTarget0Destination: animations.handPlayTarget0Destination,
  handPlayTarget1Destination: animations.handPlayTarget1Destination,
  mulliganReturn1Destination: animations.mulliganReturn1Destination,
  mulliganReturn2Destination: animations.mulliganReturn2Destination,
  mulliganReturn3Destination: animations.mulliganReturn3Destination,
  mulliganDraw1Origin: animations.mulliganDraw1Origin,
  mulliganDraw2Origin: animations.mulliganDraw2Origin,
  mulliganDraw3Origin: animations.mulliganDraw3Origin,
  targetAttack0Impact: animations.targetAttack0Impact,
  targetAttack1Impact: animations.targetAttack1Impact,
  targetAttack2Impact: animations.targetAttack2Impact,
  targetAttack3Impact: animations.targetAttack3Impact,
  targetAttack0Destination: animations.targetAttack0Destination,
  targetAttack1Destination: animations.targetAttack1Destination,
  targetAttack2Destination: animations.targetAttack2Destination,
  targetAttack3Destination: animations.targetAttack3Destination,
});

export const getLiveAnimationAnchorReferenceTarget = (
  anchorKey: LiveBattleAnimationAnchorKey,
  targetsInPlay: number,
): LiveBattleAnimationReferenceTarget => {
  if (anchorKey.startsWith("openingTargetEntry")) {
    const index = Number(anchorKey.replace("openingTargetEntry", "").replace("Origin", ""));
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  if (anchorKey.startsWith("replacementTargetEntry")) {
    const index = Number(anchorKey.replace("replacementTargetEntry", "").replace("Origin", ""));
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  if (anchorKey === "postPlayHandDrawOrigin") {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (anchorKey.startsWith("handPlayTarget")) {
    const index = Number(anchorKey.replace("handPlayTarget", "").replace("Destination", ""));
    return {
      kind: "slot",
      zoneId: "playerField",
      slot: `slot-${index}`,
    };
  }

  if (anchorKey.startsWith("mulliganReturn") || anchorKey.startsWith("mulliganDraw")) {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (anchorKey.startsWith("targetAttack") && anchorKey.endsWith("Impact")) {
    const index = Number(anchorKey.replace("targetAttack", "").replace("Impact", ""));
    return {
      kind: "slot",
      zoneId: index >= targetsInPlay ? "enemyField" : "playerField",
      slot: `slot-${index % targetsInPlay}`,
    };
  }

  if (anchorKey.startsWith("targetAttack") && anchorKey.endsWith("Destination")) {
    const index = Number(anchorKey.replace("targetAttack", "").replace("Destination", ""));
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  return null;
};

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
): LiveBattleAnimationReferenceTarget => {
  if (anchorKey.startsWith("replacement-target-entry-")) {
    const match = anchorKey.match(/^replacement-target-entry-(\d+)-origin$/);
    const index = match ? Number(match[1]) : Number.NaN;
    if (Number.isNaN(index)) return null;
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  if (anchorKey === "post-play-hand-draw-origin") {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (anchorKey.startsWith("hand-play-target-")) {
    const match = anchorKey.match(/^hand-play-target-(\d+)-destination$/);
    const index = match ? Number(match[1]) : Number.NaN;
    if (Number.isNaN(index)) return null;
    return {
      kind: "slot",
      zoneId: "playerField",
      slot: `slot-${index}`,
    };
  }

  if (
    anchorKey.startsWith("mulligan-hand-draw-") ||
    anchorKey.startsWith("mulligan-hand-return-")
  ) {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (anchorKey.startsWith("target-attack-") && anchorKey.endsWith("-impact")) {
    const match = anchorKey.match(/^target-attack-(\d+)-impact$/);
    const index = match ? Number(match[1]) : Number.NaN;
    if (Number.isNaN(index)) return null;
    return {
      kind: "slot",
      zoneId: index >= targetsInPlay ? "enemyField" : "playerField",
      slot: `slot-${index % targetsInPlay}`,
    };
  }

  if (anchorKey.startsWith("target-attack-") && anchorKey.endsWith("-destination")) {
    const match = anchorKey.match(/^target-attack-(\d+)-destination$/);
    const index = match ? Number(match[1]) : Number.NaN;
    if (Number.isNaN(index)) return null;
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  return null;
};

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
