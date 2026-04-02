import type { BoardZoneId } from "../game/GameComponents";
import type {
  BattleAnimationAnchorPoint,
  BattleAnimationLayoutConfig,
} from "./BattleLayoutConfig";
import type {
  BattleSceneLayoutBridge,
  BattleScenePoint,
} from "./BattleSceneLayoutBridge";

export const battleAnimationAnchorDescriptors = [
  {
    key: "openingTargetEntry0Origin",
    toolKey: "opening-target-entry-0-origin",
  },
  {
    key: "openingTargetEntry1Origin",
    toolKey: "opening-target-entry-1-origin",
  },
  {
    key: "openingTargetEntry2Origin",
    toolKey: "opening-target-entry-2-origin",
  },
  {
    key: "openingTargetEntry3Origin",
    toolKey: "opening-target-entry-3-origin",
  },
  {
    key: "replacementTargetEntry0Origin",
    toolKey: "replacement-target-entry-0-origin",
  },
  {
    key: "replacementTargetEntry1Origin",
    toolKey: "replacement-target-entry-1-origin",
  },
  {
    key: "replacementTargetEntry2Origin",
    toolKey: "replacement-target-entry-2-origin",
  },
  {
    key: "replacementTargetEntry3Origin",
    toolKey: "replacement-target-entry-3-origin",
  },
  {
    key: "postPlayHandDrawOrigin",
    toolKey: "post-play-hand-draw-origin",
  },
  {
    key: "handPlayTarget0Destination",
    toolKey: "hand-play-target-0-destination",
  },
  {
    key: "handPlayTarget1Destination",
    toolKey: "hand-play-target-1-destination",
  },
  {
    key: "mulliganReturn1Destination",
    toolKey: "mulligan-hand-return-1-destination",
  },
  {
    key: "mulliganReturn2Destination",
    toolKey: "mulligan-hand-return-2-destination",
  },
  {
    key: "mulliganReturn3Destination",
    toolKey: "mulligan-hand-return-3-destination",
  },
  {
    key: "mulliganDraw1Origin",
    toolKey: "mulligan-hand-draw-1-origin",
  },
  {
    key: "mulliganDraw2Origin",
    toolKey: "mulligan-hand-draw-2-origin",
  },
  {
    key: "mulliganDraw3Origin",
    toolKey: "mulligan-hand-draw-3-origin",
  },
  {
    key: "targetAttack0Impact",
    toolKey: "target-attack-0-impact",
  },
  {
    key: "targetAttack1Impact",
    toolKey: "target-attack-1-impact",
  },
  {
    key: "targetAttack2Impact",
    toolKey: "target-attack-2-impact",
  },
  {
    key: "targetAttack3Impact",
    toolKey: "target-attack-3-impact",
  },
  {
    key: "targetAttack0Destination",
    toolKey: "target-attack-0-destination",
  },
  {
    key: "targetAttack1Destination",
    toolKey: "target-attack-1-destination",
  },
  {
    key: "targetAttack2Destination",
    toolKey: "target-attack-2-destination",
  },
  {
    key: "targetAttack3Destination",
    toolKey: "target-attack-3-destination",
  },
] as const satisfies ReadonlyArray<{
  key: keyof BattleAnimationLayoutConfig;
  toolKey: string;
}>;

export type BattleSceneAnimationAnchorKey =
  (typeof battleAnimationAnchorDescriptors)[number]["key"];
export type BattleAnimationToolAnchorKey =
  (typeof battleAnimationAnchorDescriptors)[number]["toolKey"];

export type BattleAnimationReferenceTarget =
  | { kind: "zone"; zoneId: BoardZoneId }
  | { kind: "slot"; zoneId: BoardZoneId; slot: string }
  | null;

export interface BattleResolvedAuthoredAnchor {
  kind: "authored";
  key: BattleSceneAnimationAnchorKey;
  toolKey: BattleAnimationToolAnchorKey;
  point: BattleAnimationAnchorPoint | null;
  status: "resolved" | "missing";
}

export interface BattleResolvedDerivedAnchor {
  kind: "derived";
  target: BattleAnimationReferenceTarget;
  point: BattleScenePoint | null;
  status: "resolved" | "missing";
}

export interface BattleResolvedMotionAnchor {
  kind: "motion";
  key: BattleSceneAnimationAnchorKey;
  toolKey: BattleAnimationToolAnchorKey;
  authored: BattleResolvedAuthoredAnchor;
  derived: BattleResolvedDerivedAnchor;
  fallbackTag: string;
}

const descriptorByKey = battleAnimationAnchorDescriptors.reduce<
  Record<BattleSceneAnimationAnchorKey, (typeof battleAnimationAnchorDescriptors)[number]>
>((acc, descriptor) => {
  acc[descriptor.key] = descriptor;
  return acc;
}, {} as Record<BattleSceneAnimationAnchorKey, (typeof battleAnimationAnchorDescriptors)[number]>);

const descriptorByToolKey = battleAnimationAnchorDescriptors.reduce<
  Record<BattleAnimationToolAnchorKey, (typeof battleAnimationAnchorDescriptors)[number]>
>((acc, descriptor) => {
  acc[descriptor.toolKey] = descriptor;
  return acc;
}, {} as Record<BattleAnimationToolAnchorKey, (typeof battleAnimationAnchorDescriptors)[number]>);

export const toBattleSceneAnimationAnchorKey = (
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey | null | undefined,
): BattleSceneAnimationAnchorKey | null => {
  if (!anchor) return null;
  if (anchor in descriptorByKey) {
    return anchor as BattleSceneAnimationAnchorKey;
  }
  return descriptorByToolKey[anchor as BattleAnimationToolAnchorKey]?.key ?? null;
};

export const toBattleAnimationToolAnchorKey = (
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey | null | undefined,
): BattleAnimationToolAnchorKey | null => {
  if (!anchor) return null;
  if (anchor in descriptorByToolKey) {
    return anchor as BattleAnimationToolAnchorKey;
  }
  return descriptorByKey[anchor as BattleSceneAnimationAnchorKey]?.toolKey ?? null;
};

export const createBattleAuthoredAnimationAnchorSet = (
  anchors: BattleAnimationLayoutConfig,
): Record<BattleSceneAnimationAnchorKey, BattleAnimationAnchorPoint | null> => ({
  openingTargetEntry0Origin: anchors.openingTargetEntry0Origin,
  openingTargetEntry1Origin: anchors.openingTargetEntry1Origin,
  openingTargetEntry2Origin: anchors.openingTargetEntry2Origin,
  openingTargetEntry3Origin: anchors.openingTargetEntry3Origin,
  replacementTargetEntry0Origin: anchors.replacementTargetEntry0Origin,
  replacementTargetEntry1Origin: anchors.replacementTargetEntry1Origin,
  replacementTargetEntry2Origin: anchors.replacementTargetEntry2Origin,
  replacementTargetEntry3Origin: anchors.replacementTargetEntry3Origin,
  postPlayHandDrawOrigin: anchors.postPlayHandDrawOrigin,
  handPlayTarget0Destination: anchors.handPlayTarget0Destination,
  handPlayTarget1Destination: anchors.handPlayTarget1Destination,
  mulliganReturn1Destination: anchors.mulliganReturn1Destination,
  mulliganReturn2Destination: anchors.mulliganReturn2Destination,
  mulliganReturn3Destination: anchors.mulliganReturn3Destination,
  mulliganDraw1Origin: anchors.mulliganDraw1Origin,
  mulliganDraw2Origin: anchors.mulliganDraw2Origin,
  mulliganDraw3Origin: anchors.mulliganDraw3Origin,
  targetAttack0Impact: anchors.targetAttack0Impact,
  targetAttack1Impact: anchors.targetAttack1Impact,
  targetAttack2Impact: anchors.targetAttack2Impact,
  targetAttack3Impact: anchors.targetAttack3Impact,
  targetAttack0Destination: anchors.targetAttack0Destination,
  targetAttack1Destination: anchors.targetAttack1Destination,
  targetAttack2Destination: anchors.targetAttack2Destination,
  targetAttack3Destination: anchors.targetAttack3Destination,
});

export const createBattleAuthoredAnimationAnchorSetFromPartial = (
  anchors: Partial<BattleAnimationLayoutConfig>,
): Record<BattleSceneAnimationAnchorKey, BattleAnimationAnchorPoint | null> =>
  createBattleAuthoredAnimationAnchorSet({
    openingTargetEntry0Origin: null,
    openingTargetEntry1Origin: null,
    openingTargetEntry2Origin: null,
    openingTargetEntry3Origin: null,
    replacementTargetEntry0Origin: null,
    replacementTargetEntry1Origin: null,
    replacementTargetEntry2Origin: null,
    replacementTargetEntry3Origin: null,
    postPlayHandDrawOrigin: null,
    handPlayTarget0Destination: null,
    handPlayTarget1Destination: null,
    mulliganReturn1Destination: null,
    mulliganReturn2Destination: null,
    mulliganReturn3Destination: null,
    mulliganDraw1Origin: null,
    mulliganDraw2Origin: null,
    mulliganDraw3Origin: null,
    targetAttack0Impact: null,
    targetAttack1Impact: null,
    targetAttack2Impact: null,
    targetAttack3Impact: null,
    targetAttack0Destination: null,
    targetAttack1Destination: null,
    targetAttack2Destination: null,
    targetAttack3Destination: null,
    ...anchors,
  });

export const getBattleAnimationAnchorPoint = (
  anchors: BattleAnimationLayoutConfig,
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey | null | undefined,
): BattleAnimationAnchorPoint | null => {
  const resolvedKey = toBattleSceneAnimationAnchorKey(anchor);
  return resolvedKey ? anchors[resolvedKey] : null;
};

export const getBattleAnimationAnchorReferenceTarget = (
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey,
  targetsInPlay: number,
): BattleAnimationReferenceTarget => {
  const canonicalKey = toBattleSceneAnimationAnchorKey(anchor);
  if (!canonicalKey) return null;

  if (canonicalKey.startsWith("openingTargetEntry")) {
    const index = Number(
      canonicalKey.replace("openingTargetEntry", "").replace("Origin", ""),
    );
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  if (canonicalKey.startsWith("replacementTargetEntry")) {
    const index = Number(
      canonicalKey.replace("replacementTargetEntry", "").replace("Origin", ""),
    );
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  if (canonicalKey === "postPlayHandDrawOrigin") {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (canonicalKey.startsWith("handPlayTarget")) {
    const index = Number(
      canonicalKey.replace("handPlayTarget", "").replace("Destination", ""),
    );
    return {
      kind: "slot",
      zoneId: "playerField",
      slot: `slot-${index}`,
    };
  }

  if (
    canonicalKey.startsWith("mulliganReturn") ||
    canonicalKey.startsWith("mulliganDraw")
  ) {
    return {
      kind: "zone",
      zoneId: "playerDeck",
    };
  }

  if (canonicalKey.startsWith("targetAttack") && canonicalKey.endsWith("Impact")) {
    const index = Number(
      canonicalKey.replace("targetAttack", "").replace("Impact", ""),
    );
    return {
      kind: "slot",
      zoneId: index >= targetsInPlay ? "enemyField" : "playerField",
      slot: `slot-${index % targetsInPlay}`,
    };
  }

  if (
    canonicalKey.startsWith("targetAttack") &&
    canonicalKey.endsWith("Destination")
  ) {
    const index = Number(
      canonicalKey.replace("targetAttack", "").replace("Destination", ""),
    );
    return {
      kind: "zone",
      zoneId: index >= targetsInPlay ? "enemyTargetDeck" : "playerTargetDeck",
    };
  }

  return null;
};

const getBattleSceneLayoutCenterForTarget = (
  target: BattleAnimationReferenceTarget,
  layoutBridge?: BattleSceneLayoutBridge | null,
): BattleScenePoint | null => {
  if (!target || !layoutBridge) return null;

  if (target.kind === "zone") {
    const element = layoutBridge.elements[target.zoneId as keyof typeof layoutBridge.elements];
    return element?.center ?? null;
  }

  const slotIndex = Number(target.slot.replace("slot-", ""));
  if (Number.isNaN(slotIndex)) return null;
  const side = target.zoneId === "enemyField" ? "enemy" : "player";
  return layoutBridge.fields[side].slots[slotIndex]?.center ?? null;
};

const getFallbackTagForReferenceTarget = (
  target: BattleAnimationReferenceTarget,
): string => {
  if (!target) return "anchor";
  if (target.kind === "zone") return target.zoneId;
  return `${target.zoneId}-${target.slot}`;
};

export const resolveBattleAuthoredAnchor = ({
  anchors,
  anchor,
}: {
  anchors: BattleAnimationLayoutConfig;
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey;
}): BattleResolvedAuthoredAnchor | null => {
  const key = toBattleSceneAnimationAnchorKey(anchor);
  const toolKey = toBattleAnimationToolAnchorKey(anchor);
  if (!key || !toolKey) return null;
  const point = anchors[key];
  return {
    kind: "authored",
    key,
    toolKey,
    point,
    status: point ? "resolved" : "missing",
  };
};

export const resolveBattleDerivedAnchor = ({
  anchor,
  targetsInPlay,
  layoutBridge,
}: {
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey;
  targetsInPlay: number;
  layoutBridge?: BattleSceneLayoutBridge | null;
}): BattleResolvedDerivedAnchor => {
  const target = getBattleAnimationAnchorReferenceTarget(anchor, targetsInPlay);
  const point = getBattleSceneLayoutCenterForTarget(target, layoutBridge);
  return {
    kind: "derived",
    target,
    point,
    status: point ? "resolved" : "missing",
  };
};

export const resolveBattleMotionAnchor = ({
  anchors,
  anchor,
  targetsInPlay,
  layoutBridge,
}: {
  anchors: BattleAnimationLayoutConfig;
  anchor: BattleSceneAnimationAnchorKey | BattleAnimationToolAnchorKey;
  targetsInPlay: number;
  layoutBridge?: BattleSceneLayoutBridge | null;
}): BattleResolvedMotionAnchor | null => {
  const authored = resolveBattleAuthoredAnchor({
    anchors,
    anchor,
  });
  if (!authored) return null;

  const derived = resolveBattleDerivedAnchor({
    anchor,
    targetsInPlay,
    layoutBridge,
  });

  return {
    kind: "motion",
    key: authored.key,
    toolKey: authored.toolKey,
    authored,
    derived,
    fallbackTag: getFallbackTagForReferenceTarget(derived.target),
  };
};
