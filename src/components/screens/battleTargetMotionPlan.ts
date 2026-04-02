import type { Syllable } from "../../types/game";
import type {
  BattleFieldIncomingTarget,
  BattleFieldLaneRenderNode,
  BattleFieldLaneSlot,
  BattleFieldOutgoingTarget,
} from "./BattleFieldLane";
import type {
  BattleTargetFieldSlotState,
  BattleTargetIncomingMotion,
  BattleTargetOutgoingMotion,
  BattleTargetSceneNode,
} from "./BattleTargetField";

const isIncomingNode = (
  node: BattleTargetSceneNode,
): node is BattleTargetSceneNode & {
  motion: BattleTargetIncomingMotion;
  visualEntity: NonNullable<BattleTargetSceneNode["visualEntity"]>;
} => node.motion?.kind === "incoming" && Boolean(node.visualEntity);

const isOutgoingNode = (
  node: BattleTargetSceneNode,
): node is BattleTargetSceneNode & {
  motion: BattleTargetOutgoingMotion;
  visualEntity: NonNullable<BattleTargetSceneNode["visualEntity"]>;
} => node.motion?.kind === "outgoing" && Boolean(node.visualEntity);

const isIdleNode = (
  node: BattleTargetSceneNode,
): node is BattleTargetSceneNode & {
  visualEntity: NonNullable<BattleTargetSceneNode["visualEntity"]>;
} => node.phase === "idle" && Boolean(node.visualEntity);

const isReceiveCardNode = (node: BattleTargetSceneNode) =>
  node.motion?.kind === "receive-card";

const getPhaseZIndex = (phase: BattleTargetSceneNode["phase"]) => {
  switch (phase) {
    case "attack":
      return 50;
    case "exit":
      return 45;
    case "replacement":
      return 35;
    case "spawn":
      return 32;
    case "receive-card":
      return 28;
    case "idle":
    default:
      return 20;
  }
};

export interface BuildBattleFieldLaneSlotsFromTargetFieldParams {
  fieldSlots: BattleTargetFieldSlotState[];
  bindSlotRef: (
    slotIndex: number,
  ) => (node: HTMLDivElement | null) => void;
  getSlotRect: (slotIndex: number) => DOMRect | null;
  getSelectedCard: (slotIndex: number) => Syllable | null;
  getPendingCard?: (slotIndex: number) => Syllable | null;
  getPendingCardMotion?: (
    slotIndex: number,
  ) => {
    delayMs: number;
  } | null;
  getCanClick: (slotIndex: number, displayedTarget: NonNullable<BattleFieldLaneSlot["displayedTarget"]> | null, incomingTarget: BattleFieldIncomingTarget | null) => boolean;
  onClick: (slotIndex: number) => void;
  onIncomingTargetComplete?: (
    incomingTarget: BattleFieldIncomingTarget,
  ) => void;
  onOutgoingTargetComplete?: (
    outgoingTarget: BattleFieldOutgoingTarget,
  ) => void;
  getPlayerHand?: (slotIndex: number) => Syllable[];
}

export const buildBattleFieldLaneSlotsFromTargetField = ({
  fieldSlots,
  bindSlotRef,
  getSlotRect,
  getSelectedCard,
  getPendingCard,
  getPendingCardMotion,
  getCanClick,
  onClick,
  onIncomingTargetComplete,
  onOutgoingTargetComplete,
  getPlayerHand,
}: BuildBattleFieldLaneSlotsFromTargetFieldParams): BattleFieldLaneSlot[] =>
  fieldSlots.map((fieldSlot) => {
    const outgoingNode = fieldSlot.sceneNodes.find(isOutgoingNode) ?? null;
    const incomingNode = fieldSlot.sceneNodes.find(isIncomingNode) ?? null;
    const idleNode = fieldSlot.sceneNodes.find(isIdleNode) ?? null;
    const receiveCardNode = fieldSlot.sceneNodes.find(isReceiveCardNode) ?? null;
    const visualNodes = fieldSlot.sceneNodes.filter(
      (node): node is BattleTargetSceneNode & {
        visualEntity: NonNullable<BattleTargetSceneNode["visualEntity"]>;
      } => Boolean(node.visualEntity),
    );
    const sortedVisualNodes = [...visualNodes].sort(
      (left, right) => getPhaseZIndex(left.phase) - getPhaseZIndex(right.phase),
    );
    const pendingCard =
      (receiveCardNode?.motion?.kind === "receive-card"
        ? receiveCardNode.motion.pendingCard
        : null) ??
      getPendingCard?.(fieldSlot.slot.slotIndex) ??
      fieldSlot.pendingCard ??
      null;
    const pendingCardMotion = pendingCard
      ? getPendingCardMotion?.(fieldSlot.slot.slotIndex) ??
        (receiveCardNode?.motion?.kind === "receive-card"
          ? receiveCardNode.motion
          : null)
      : null;
    const pendingCardOwnerKey =
      [...sortedVisualNodes]
        .reverse()
        .find((node) => node.phase !== "attack" && node.phase !== "exit")
        ?.sceneNodeId ??
      sortedVisualNodes[sortedVisualNodes.length - 1]?.sceneNodeId ??
      null;
    const interactiveNodeKey =
      [...sortedVisualNodes]
        .reverse()
        .find((node) => node.phase !== "attack" && node.phase !== "exit")
        ?.sceneNodeId ??
      null;
    const renderNodes: BattleFieldLaneRenderNode[] = sortedVisualNodes.map((node) => {
      const incomingTarget =
        isIncomingNode(node)
          ? {
              id: node.sceneNodeId,
              side: fieldSlot.slot.runtimeSide,
              slotIndex: fieldSlot.slot.slotIndex,
              entity: node.visualEntity,
              origin: node.motion.origin,
              delayMs: node.motion.delayMs,
              durationMs: node.motion.durationMs,
            }
          : null;
      const outgoingTarget =
        isOutgoingNode(node)
          ? {
              id: node.sceneNodeId,
              side: fieldSlot.slot.runtimeSide,
              entity: node.visualEntity,
              impactDestination: node.motion.impactDestination,
              destination: node.motion.destination,
              delayMs: node.motion.delayMs,
              windupMs: node.motion.windupMs,
              attackMs: node.motion.attackMs,
              pauseMs: node.motion.pauseMs,
              exitMs: node.motion.exitMs,
            }
          : null;

      return {
        key: node.sceneNodeId,
        phase: node.phase,
        entity: node.visualEntity,
        incomingTarget,
        outgoingTarget,
        zIndex: getPhaseZIndex(node.phase),
        canClick:
          interactiveNodeKey === node.sceneNodeId &&
          getCanClick(
            fieldSlot.slot.slotIndex,
            node.visualEntity,
            incomingTarget,
          ),
        selectedCard:
          interactiveNodeKey === node.sceneNodeId
            ? getSelectedCard(fieldSlot.slot.slotIndex)
            : null,
        pendingCard:
          pendingCardOwnerKey === node.sceneNodeId ? pendingCard : null,
        pendingCardRevealDelayMs:
          pendingCardOwnerKey === node.sceneNodeId
            ? pendingCardMotion?.delayMs ?? 0
            : undefined,
        playerHand:
          interactiveNodeKey === node.sceneNodeId
            ? getPlayerHand?.(fieldSlot.slot.slotIndex) ?? []
            : [],
      };
    });
    const displayedTarget =
      renderNodes[renderNodes.length - 1]?.entity ??
      outgoingNode?.visualEntity ??
      incomingNode?.visualEntity ??
      idleNode?.visualEntity ??
      null;
    const incomingTarget = incomingNode
      ? {
          id: incomingNode.sceneNodeId,
          side: fieldSlot.slot.runtimeSide,
          slotIndex: fieldSlot.slot.slotIndex,
          entity: incomingNode.visualEntity,
          origin: incomingNode.motion.origin,
          delayMs: incomingNode.motion.delayMs,
          durationMs: incomingNode.motion.durationMs,
        }
      : null;
    const outgoingTarget = outgoingNode
      ? {
          id: outgoingNode.sceneNodeId,
          side: fieldSlot.slot.runtimeSide,
          entity: outgoingNode.visualEntity,
          impactDestination: outgoingNode.motion.impactDestination,
          destination: outgoingNode.motion.destination,
          delayMs: outgoingNode.motion.delayMs,
          windupMs: outgoingNode.motion.windupMs,
          attackMs: outgoingNode.motion.attackMs,
          pauseMs: outgoingNode.motion.pauseMs,
          exitMs: outgoingNode.motion.exitMs,
        }
      : null;

    return {
      key: displayedTarget?.id ?? fieldSlot.slot.slotId,
      slotRef: bindSlotRef(fieldSlot.slot.slotIndex),
      displayedTarget,
      incomingTarget,
      outgoingTarget,
      renderNodes,
      slotRect: getSlotRect(fieldSlot.slot.slotIndex),
      selectedCard: getSelectedCard(fieldSlot.slot.slotIndex),
      pendingCard,
      canClick: getCanClick(
        fieldSlot.slot.slotIndex,
        displayedTarget,
        incomingTarget,
      ),
      onClick: () => onClick(fieldSlot.slot.slotIndex),
      onIncomingTargetComplete,
      onOutgoingTargetComplete,
      playerHand: getPlayerHand?.(fieldSlot.slot.slotIndex) ?? [],
    } satisfies BattleFieldLaneSlot;
  });
