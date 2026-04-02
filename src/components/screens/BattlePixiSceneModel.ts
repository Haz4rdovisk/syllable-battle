import type { Syllable } from "../../types/game";
import type {
  BattleFieldLaneRenderNode,
  BattleFieldLaneSlot,
  BattleFieldOutgoingTarget,
} from "./BattleFieldLane";
import type {
  BattleHandLaneCard,
  BattleHandLaneOutgoingCard,
} from "./BattleHandLane";
import type {
  BattleResolvedMotionAnchor,
  BattleSceneAnimationAnchorKey,
} from "./BattleAnchorResolver";
import type { BattleSceneLayoutBridge } from "./BattleSceneLayoutBridge";
import type { BattleSceneRect } from "./BattleSceneSpace";
import type { BattleSceneRenderModel } from "./BattleSceneViewModel";
import { getBattleHandFrame, getBattleHandLayout } from "./battleFlow";

export interface BattlePixiSlotGuide {
  id: string;
  side: "player" | "enemy";
  slotIndex: number;
  rect: BattleSceneRect;
  zIndex: number;
}

export interface BattlePixiTargetIncomingMotion {
  kind: "incoming";
  startPoint: { x: number; y: number };
  delayMs: number;
  durationMs: number;
}

export interface BattlePixiTargetOutgoingMotion {
  kind: "outgoing";
  impactPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number };
  delayMs: number;
  windupMs: number;
  attackMs: number;
  pauseMs: number;
  exitMs: number;
  endScale: number;
}

export type BattlePixiTargetMotion =
  | BattlePixiTargetIncomingMotion
  | BattlePixiTargetOutgoingMotion
  | null;

export interface BattlePixiTargetDrawable {
  id: string;
  slotId: string;
  side: "player" | "enemy";
  slotIndex: number;
  phase: BattleFieldLaneRenderNode["phase"];
  rect: BattleSceneRect;
  zIndex: number;
  label: string;
  emoji: string;
  pendingCard: Syllable | null;
  motion: BattlePixiTargetMotion;
  onComplete?: () => void;
}

export interface BattlePixiHandTravelDrawable {
  id: string;
  side: 0 | 1;
  syllable: Syllable;
  startRect: BattleSceneRect;
  endRect: BattleSceneRect;
  delayMs: number;
  durationMs: number;
  endRotate: number;
  endScale: number;
  onComplete?: (outgoingCard: BattleHandLaneOutgoingCard) => void;
  outgoingCard: BattleHandLaneOutgoingCard;
}

export interface BattlePixiSceneModel {
  slotGuides: BattlePixiSlotGuide[];
  targetDrawables: BattlePixiTargetDrawable[];
  handTravelDrawables: BattlePixiHandTravelDrawable[];
  durationMs: number;
  signature: string;
}

const clampHandSceneScale = (value: number) => Math.max(0.6, value);

const getNodeZIndex = (phase: BattleFieldLaneRenderNode["phase"]) => {
  switch (phase) {
    case "attack":
      return 70;
    case "exit":
      return 68;
    case "replacement":
      return 60;
    case "spawn":
      return 56;
    case "receive-card":
      return 54;
    case "idle":
    default:
      return 40;
  }
};

const getHandCardSize = (usesMobileShell: boolean) =>
  usesMobileShell
    ? { width: 86, height: 120, scale: "mobile" as const }
    : { width: 110, height: 150, scale: "desktop" as const };

const getMotionPoint = (
  anchor: BattleResolvedMotionAnchor | null | undefined,
  fallback: { x: number; y: number },
) => anchor?.authored.point ?? anchor?.derived.point ?? fallback;

const getRenderNodes = (slot: BattleFieldLaneSlot): BattleFieldLaneRenderNode[] => {
  if (slot.renderNodes && slot.renderNodes.length > 0) return slot.renderNodes;
  if (!slot.displayedTarget) return [];
  return [
    {
      key: slot.outgoingTarget
        ? `${slot.outgoingTarget.id}-outgoing`
        : slot.incomingTarget
          ? `${slot.displayedTarget.id}-${slot.incomingTarget.id}`
          : slot.displayedTarget.id,
      phase: slot.outgoingTarget
        ? slot.outgoingTarget.impactDestination
          ? "attack"
          : "exit"
        : slot.incomingTarget
          ? "spawn"
          : "idle",
      entity: slot.displayedTarget,
      incomingTarget: slot.incomingTarget,
      outgoingTarget: slot.outgoingTarget ?? null,
      zIndex: slot.outgoingTarget ? 40 : slot.incomingTarget ? 30 : 20,
      canClick: slot.canClick && !slot.outgoingTarget,
      selectedCard: slot.selectedCard,
      pendingCard: slot.pendingCard ?? null,
      pendingCardRevealDelayMs: 0,
      playerHand: slot.playerHand ?? [],
    },
  ];
};

const getFieldSlots = (
  renderModel: BattleSceneRenderModel,
  side: "player" | "enemy",
) =>
  side === "player"
    ? renderModel.scene.board.playerFieldSlots
    : renderModel.scene.board.enemyFieldSlots;

const getGlobalTargetIndex = (
  side: "player" | "enemy",
  slotIndex: number,
  targetsInPlay: number,
) => (side === "player" ? slotIndex : targetsInPlay + slotIndex);

const getMotionAnchorByKey = (
  renderModel: BattleSceneRenderModel,
  key: BattleSceneAnimationAnchorKey,
) => renderModel.motionAnchors.find((anchor) => anchor.key === key) ?? null;

const getOutgoingEndScale = (
  layoutBridge: BattleSceneLayoutBridge,
  side: "player" | "enemy",
  slotIndex: number,
) => {
  const slotRect = layoutBridge.fields[side].slots[slotIndex]?.sceneRect;
  const zoneRect =
    layoutBridge.elements[side === "player" ? "playerTargetDeck" : "enemyTargetDeck"]
      ?.sceneRect;
  if (!slotRect || !zoneRect) return 0.86;
  return Math.min(
    1.2,
    Math.max(
      0.55,
      Math.min(
        zoneRect.width / Math.max(1, slotRect.width),
        zoneRect.height / Math.max(1, slotRect.height),
      ),
    ),
  );
};

const getHandCardSceneRect = ({
  handRect,
  presentation,
  totalCards,
  index,
  usesMobileShell,
}: {
  handRect: BattleSceneRect;
  presentation: "local" | "remote";
  totalCards: number;
  index: number;
  usesMobileShell: boolean;
}): BattleSceneRect => {
  const size = getHandCardSize(usesMobileShell);
  const baseHandFrame = getBattleHandFrame(
    presentation,
    totalCards,
    size.scale === "desktop",
  );
  const layouts = Array.from({ length: Math.max(1, totalCards) }, (_, layoutIndex) =>
    getBattleHandLayout(
      presentation,
      Math.max(1, totalCards),
      layoutIndex,
      size.scale === "desktop",
      baseHandFrame.width,
    ),
  );
  const layout = getBattleHandLayout(
    presentation,
    Math.max(1, totalCards),
    index,
    size.scale === "desktop",
    baseHandFrame.width,
  );
  const layoutBounds = layouts.reduce(
    (acc, item) => ({
      minY: Math.min(acc.minY, item.y),
      maxY: Math.max(acc.maxY, item.y),
    }),
    { minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
  const bottomOffset =
    totalCards > 0
      ? Math.max(
          0,
          baseHandFrame.height / 2 -
            size.height / 2 +
            (layoutBounds.minY + layoutBounds.maxY) / 2,
        )
      : 0;
  const handScale = clampHandSceneScale(
    Math.min(
      handRect.width / Math.max(1, baseHandFrame.width),
      handRect.height / Math.max(1, baseHandFrame.height),
    ),
  );
  const sceneWidth = baseHandFrame.width * handScale;
  const sceneHeight = baseHandFrame.height * handScale;
  const sceneLeft = handRect.x + (handRect.width - sceneWidth) / 2;
  const sceneTop = handRect.y + (handRect.height - sceneHeight) / 2;
  const baseLeft = baseHandFrame.width / 2 - size.width / 2;
  const baseTop = baseHandFrame.height - bottomOffset - size.height;

  return {
    x: Math.round(sceneLeft + (baseLeft + layout.x) * handScale),
    y: Math.round(sceneTop + (baseTop + layout.y) * handScale),
    width: Math.round(size.width * handScale),
    height: Math.round(size.height * handScale),
  };
};

const createTargetDrawable = ({
  renderModel,
  side,
  slotIndex,
  slot,
  node,
  targetsInPlay,
}: {
  renderModel: BattleSceneRenderModel;
  side: "player" | "enemy";
  slotIndex: number;
  slot: BattleFieldLaneSlot;
  node: BattleFieldLaneRenderNode;
  targetsInPlay: number;
}): BattlePixiTargetDrawable => {
  const slotRect = renderModel.layoutBridge.fields[side].slots[slotIndex].sceneRect;
  const slotCenter = renderModel.layoutBridge.fields[side].slots[slotIndex].center;
  const globalIndex = getGlobalTargetIndex(side, slotIndex, targetsInPlay);
  const pendingCard =
    node.pendingCard ??
    (node.phase === "receive-card" ? slot.pendingCard ?? null : null) ??
    null;
  let motion: BattlePixiTargetMotion = null;

  if (node.incomingTarget) {
    const motionKey =
      node.phase === "replacement"
        ? (`replacementTargetEntry${globalIndex}Origin` as BattleSceneAnimationAnchorKey)
        : (`openingTargetEntry${globalIndex}Origin` as BattleSceneAnimationAnchorKey);
    const originAnchor = getMotionAnchorByKey(renderModel, motionKey);
    motion = {
      kind: "incoming",
      startPoint: getMotionPoint(originAnchor, slotCenter),
      delayMs: node.incomingTarget.delayMs,
      durationMs: node.incomingTarget.durationMs,
    };
  }

  if (node.outgoingTarget) {
    const impactAnchor = getMotionAnchorByKey(
      renderModel,
      `targetAttack${globalIndex}Impact` as BattleSceneAnimationAnchorKey,
    );
    const destinationAnchor = getMotionAnchorByKey(
      renderModel,
      `targetAttack${globalIndex}Destination` as BattleSceneAnimationAnchorKey,
    );
    motion = {
      kind: "outgoing",
      impactPoint:
        node.phase === "attack"
          ? getMotionPoint(impactAnchor, slotCenter)
          : null,
      endPoint: getMotionPoint(destinationAnchor, slotCenter),
      delayMs: node.outgoingTarget.delayMs,
      windupMs: node.outgoingTarget.windupMs,
      attackMs: node.outgoingTarget.attackMs,
      pauseMs: node.outgoingTarget.pauseMs,
      exitMs: node.outgoingTarget.exitMs,
      endScale: getOutgoingEndScale(renderModel.layoutBridge, side, slotIndex),
    };
  }

  return {
    id: node.key,
    slotId: slot.key,
    side,
    slotIndex,
    phase: node.phase,
    rect: slotRect,
    zIndex: getNodeZIndex(node.phase),
    label: node.entity.target.name,
    emoji: node.entity.target.emoji,
    pendingCard,
    motion,
    onComplete: node.incomingTarget
      ? () => slot.onIncomingTargetComplete?.(node.incomingTarget!)
      : node.outgoingTarget
        ? () => slot.onOutgoingTargetComplete?.(node.outgoingTarget as BattleFieldOutgoingTarget)
        : undefined,
  };
};

const createHandTravelDrawables = (
  renderModel: BattleSceneRenderModel,
): BattlePixiHandTravelDrawable[] => {
  const hand = renderModel.scene.hands.bottom;
  const handRect = renderModel.layoutBridge.elements.bottomHand.sceneRect;

  return (hand.outgoingCards ?? [])
    .filter(
      (card) =>
        (card.destinationMode ?? "deck-bottom") === "zone-center" &&
        typeof card.targetSlotIndex === "number",
    )
    .map((card) => {
      const slotIndex = card.targetSlotIndex ?? 0;
      const slotRect =
        renderModel.layoutBridge.fields.player.slots[slotIndex]?.sceneRect ??
        renderModel.layoutBridge.fields.player.slots[0].sceneRect;
      const destinationAnchor = getMotionAnchorByKey(
        renderModel,
        (`handPlayTarget${Math.min(1, slotIndex)}Destination` as BattleSceneAnimationAnchorKey),
      );
      const destinationPoint = getMotionPoint(destinationAnchor, {
        x: slotRect.x + slotRect.width / 2,
        y: slotRect.y + slotRect.height / 2,
      });
      const endScale = card.endScale ?? 1;
      const endRect = {
        x: Math.round(destinationPoint.x - (slotRect.width * endScale) / 2),
        y: Math.round(destinationPoint.y - (slotRect.height * endScale) / 2),
        width: Math.round(slotRect.width),
        height: Math.round(slotRect.height),
      };

      return {
        id: card.id,
        side: card.side,
        syllable: card.card.syllable,
        startRect: getHandCardSceneRect({
          handRect,
          presentation: hand.presentation,
          totalCards: card.initialTotal,
          index: card.initialIndex,
          usesMobileShell: renderModel.layoutBridge.usesMobileShell,
        }),
        endRect,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        endRotate: card.endRotate ?? 4,
        endScale,
        onComplete: hand.onOutgoingCardComplete,
        outgoingCard: card,
      };
    });
};

const getSceneDurationMs = (
  targetDrawables: BattlePixiTargetDrawable[],
  handTravelDrawables: BattlePixiHandTravelDrawable[],
) => {
  const targetDuration = targetDrawables.reduce((maxDuration, drawable) => {
    if (!drawable.motion) return maxDuration;
    if (drawable.motion.kind === "incoming") {
      return Math.max(
        maxDuration,
        drawable.motion.delayMs + drawable.motion.durationMs,
      );
    }
    return Math.max(
      maxDuration,
      drawable.motion.delayMs +
        drawable.motion.windupMs +
        drawable.motion.attackMs +
        drawable.motion.pauseMs +
        drawable.motion.exitMs,
    );
  }, 0);

  const handDuration = handTravelDrawables.reduce(
    (maxDuration, drawable) =>
      Math.max(maxDuration, drawable.delayMs + drawable.durationMs),
    0,
  );

  return Math.max(targetDuration, handDuration);
};

export const createBattlePixiSceneModel = (
  renderModel: BattleSceneRenderModel,
): BattlePixiSceneModel => {
  const targetsInPlay = Math.max(
    renderModel.scene.board.playerFieldSlots.length,
    renderModel.scene.board.enemyFieldSlots.length,
  );
  const slotGuides = (["enemy", "player"] as const).flatMap((side) =>
    renderModel.layoutBridge.fields[side].slots.map((slot) => ({
      id: `${side}-slot-${slot.slotIndex}`,
      side,
      slotIndex: slot.slotIndex,
      rect: slot.sceneRect,
      zIndex: 8,
    })),
  );
  const targetDrawables = (["enemy", "player"] as const).flatMap((side) =>
    getFieldSlots(renderModel, side).flatMap((slot, slotIndex) =>
      getRenderNodes(slot).map((node) =>
        createTargetDrawable({
          renderModel,
          side,
          slotIndex,
          slot,
          node,
          targetsInPlay,
        }),
      ),
    ),
  );
  const handTravelDrawables = createHandTravelDrawables(renderModel);
  const durationMs = getSceneDurationMs(targetDrawables, handTravelDrawables);

  return {
    slotGuides,
    targetDrawables,
    handTravelDrawables,
    durationMs,
    signature: JSON.stringify({
      layoutDevice: renderModel.layoutDevice,
      slotGuides: slotGuides.map((slot) => [slot.id, slot.rect.x, slot.rect.y]),
      targets: targetDrawables.map((target) => [
        target.id,
        target.phase,
        target.motion?.kind ?? "static",
      ]),
      travel: handTravelDrawables.map((travel) => [
        travel.id,
        travel.startRect.x,
        travel.endRect.x,
      ]),
    }),
  };
};
