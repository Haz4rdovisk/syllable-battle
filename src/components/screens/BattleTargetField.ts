import type { Syllable, UITarget } from "../../types/game";
import type {
  BoardZoneId,
  VisualTargetEntity,
  ZoneAnchorSnapshot,
} from "../game/GameComponents";
import type {
  BattleFieldIncomingTarget,
  BattleFieldLaneSlot,
  BattleFieldOutgoingTarget,
} from "./BattleFieldLane";

export type BattleTargetFieldRuntimeSide = 0 | 1;
export type BattleTargetFieldSide = "player" | "enemy";
export type BattleTargetScenePhase =
  | "spawn"
  | "idle"
  | "receive-card"
  | "attack"
  | "exit"
  | "replacement";

export interface BattleTargetSlot {
  slotId: string;
  side: BattleTargetFieldSide;
  runtimeSide: BattleTargetFieldRuntimeSide;
  slotIndex: number;
  fieldZoneId: BoardZoneId;
  slotAnchorKey: string;
}

export interface BattleTargetInstance {
  instanceId: string;
  canonicalTargetId: string;
  targetId: string;
  uiId: string;
  side: BattleTargetFieldSide;
  runtimeSide: BattleTargetFieldRuntimeSide;
  slotId: string;
  slotIndex: number;
  sourceDeckId?: string;
  name: string;
  emoji: string;
  rarity: UITarget["rarity"];
  progress: Syllable[];
  requiredCardIds?: string[];
  targetSuperclass?: string;
  targetClassKey?: string;
  target: UITarget;
}

export interface BattleTargetSceneNode {
  sceneNodeId: string;
  slotId: string;
  instanceId: string;
  side: BattleTargetFieldSide;
  runtimeSide: BattleTargetFieldRuntimeSide;
  slotIndex: number;
  phase: BattleTargetScenePhase;
  visualTargetId?: string;
  pendingCard?: Syllable | null;
  sourceKind: "stable" | "incoming" | "outgoing" | "pending-card";
}

export interface BattleTargetFieldSlotState {
  slot: BattleTargetSlot;
  occupant: BattleTargetInstance | null;
  sceneNodes: BattleTargetSceneNode[];
  locked: boolean;
  pendingCard: Syllable | null;
}

export interface BattleTargetFieldState {
  playerSlots: BattleTargetFieldSlotState[];
  enemySlots: BattleTargetFieldSlotState[];
}

interface BuildBattleTargetFieldStateParams {
  localPlayerIndex: BattleTargetFieldRuntimeSide;
  targetsInPlay: number;
  logicalTargets: Record<BattleTargetFieldRuntimeSide, UITarget[]>;
  stableTargets: Record<
    BattleTargetFieldRuntimeSide,
    Array<VisualTargetEntity | null>
  >;
  incomingTargets: Record<
    BattleTargetFieldRuntimeSide,
    Array<{
      id: string;
      slotIndex: number;
      entity: VisualTargetEntity;
      origin?: ZoneAnchorSnapshot;
      delayMs?: number;
      durationMs?: number;
    }>
  >;
  outgoingTargets: Record<
    BattleTargetFieldRuntimeSide,
    Array<{
      id: string;
      slotIndex: number;
      entity: VisualTargetEntity;
      impactDestination?: ZoneAnchorSnapshot | null;
      destination?: ZoneAnchorSnapshot;
      delayMs?: number;
      windupMs?: number;
      attackMs?: number;
      pauseMs?: number;
      exitMs?: number;
    }>
  >;
  lockedTargetSlots: Record<BattleTargetFieldRuntimeSide, boolean[]>;
  pendingTargetPlacements: Record<
    BattleTargetFieldRuntimeSide,
    Array<Syllable | null>
  >;
}

const getPresentationSide = (
  runtimeSide: BattleTargetFieldRuntimeSide,
  localPlayerIndex: BattleTargetFieldRuntimeSide,
): BattleTargetFieldSide =>
  runtimeSide === localPlayerIndex ? "player" : "enemy";

const getFieldZoneId = (side: BattleTargetFieldSide): BoardZoneId =>
  side === "player" ? "playerField" : "enemyField";

export const createBattleTargetSlot = ({
  side,
  runtimeSide,
  slotIndex,
}: {
  side: BattleTargetFieldSide;
  runtimeSide: BattleTargetFieldRuntimeSide;
  slotIndex: number;
}): BattleTargetSlot => ({
  slotId: `${side}-field-slot-${slotIndex}`,
  side,
  runtimeSide,
  slotIndex,
  fieldZoneId: getFieldZoneId(side),
  slotAnchorKey: `slot-${slotIndex}`,
});

export const createBattleTargetInstance = ({
  target,
  slot,
}: {
  target: UITarget;
  slot: BattleTargetSlot;
}): BattleTargetInstance => ({
  instanceId: target.targetInstanceId ?? target.uiId,
  canonicalTargetId: target.canonicalTargetId ?? target.id,
  targetId: target.id,
  uiId: target.uiId,
  side: slot.side,
  runtimeSide: slot.runtimeSide,
  slotId: slot.slotId,
  slotIndex: slot.slotIndex,
  sourceDeckId: target.sourceDeckId,
  name: target.name,
  emoji: target.emoji,
  rarity: target.rarity,
  progress: [...target.progress],
  requiredCardIds: target.requiredCardIds ? [...target.requiredCardIds] : undefined,
  targetSuperclass: target.targetSuperclass,
  targetClassKey: target.targetClassKey,
  target,
});

const createSceneNodeFromEntity = ({
  sceneNodeId,
  slot,
  entity,
  phase,
  sourceKind,
  pendingCard = null,
}: {
  sceneNodeId: string;
  slot: BattleTargetSlot;
  entity: VisualTargetEntity;
  phase: BattleTargetScenePhase;
  sourceKind: BattleTargetSceneNode["sourceKind"];
  pendingCard?: Syllable | null;
}): BattleTargetSceneNode => ({
  sceneNodeId,
  slotId: slot.slotId,
  instanceId: entity.target.targetInstanceId ?? entity.target.uiId,
  side: slot.side,
  runtimeSide: slot.runtimeSide,
  slotIndex: slot.slotIndex,
  phase,
  visualTargetId: entity.id,
  pendingCard,
  sourceKind,
});

const inferIncomingPhase = (
  incomingTargetId: string,
): Extract<BattleTargetScenePhase, "spawn" | "replacement"> =>
  incomingTargetId.startsWith("opening-target-") ? "spawn" : "replacement";

const inferOutgoingPhase = (
  outgoing: { impactDestination?: ZoneAnchorSnapshot | null },
): Extract<BattleTargetScenePhase, "attack" | "exit"> =>
  outgoing.impactDestination ? "attack" : "exit";

const buildBattleTargetFieldSlots = ({
  presentationSide,
  runtimeSide,
  targetsInPlay,
  logicalTargets,
  stableTargets,
  incomingTargets,
  outgoingTargets,
  lockedTargetSlots,
  pendingTargetPlacements,
}: {
  presentationSide: BattleTargetFieldSide;
  runtimeSide: BattleTargetFieldRuntimeSide;
  targetsInPlay: number;
  logicalTargets: UITarget[];
  stableTargets: Array<VisualTargetEntity | null>;
  incomingTargets: BuildBattleTargetFieldStateParams["incomingTargets"][BattleTargetFieldRuntimeSide];
  outgoingTargets: BuildBattleTargetFieldStateParams["outgoingTargets"][BattleTargetFieldRuntimeSide];
  lockedTargetSlots: boolean[];
  pendingTargetPlacements: Array<Syllable | null>;
}): BattleTargetFieldSlotState[] =>
  Array.from({ length: targetsInPlay }, (_, slotIndex) => {
    const slot = createBattleTargetSlot({
      side: presentationSide,
      runtimeSide,
      slotIndex,
    });
    const logicalTarget = logicalTargets[slotIndex] ?? null;
    const occupant = logicalTarget
      ? createBattleTargetInstance({ target: logicalTarget, slot })
      : null;
    const stableTarget = stableTargets[slotIndex] ?? null;
    const incomingTarget =
      incomingTargets.find((target) => target.slotIndex === slotIndex) ?? null;
    const outgoingTarget =
      outgoingTargets.find((target) => target.slotIndex === slotIndex) ?? null;
    const pendingCard = pendingTargetPlacements[slotIndex] ?? null;
    const sceneNodes: BattleTargetSceneNode[] = [];

    if (stableTarget && !incomingTarget && !outgoingTarget) {
      sceneNodes.push(
        createSceneNodeFromEntity({
          sceneNodeId: `${slot.slotId}:idle:${stableTarget.id}`,
          slot,
          entity: stableTarget,
          phase: "idle",
          sourceKind: "stable",
        }),
      );
    }

    if (incomingTarget) {
      sceneNodes.push(
        createSceneNodeFromEntity({
          sceneNodeId: incomingTarget.id,
          slot,
          entity: incomingTarget.entity,
          phase: inferIncomingPhase(incomingTarget.id),
          sourceKind: "incoming",
        }),
      );
    }

    if (outgoingTarget) {
      sceneNodes.push(
        createSceneNodeFromEntity({
          sceneNodeId: outgoingTarget.id,
          slot,
          entity: outgoingTarget.entity,
          phase: inferOutgoingPhase(outgoingTarget),
          sourceKind: "outgoing",
        }),
      );
    }

    if (pendingCard && occupant) {
      sceneNodes.push({
        sceneNodeId: `${slot.slotId}:receive-card:${occupant.instanceId}:${pendingCard}`,
        slotId: slot.slotId,
        instanceId: occupant.instanceId,
        side: slot.side,
        runtimeSide: slot.runtimeSide,
        slotIndex: slot.slotIndex,
        phase: "receive-card",
        pendingCard,
        sourceKind: "pending-card",
      });
    }

    return {
      slot,
      occupant,
      sceneNodes,
      locked: Boolean(lockedTargetSlots[slotIndex]),
      pendingCard,
    };
  });

export const buildBattleTargetFieldState = ({
  localPlayerIndex,
  targetsInPlay,
  logicalTargets,
  stableTargets,
  incomingTargets,
  outgoingTargets,
  lockedTargetSlots,
  pendingTargetPlacements,
}: BuildBattleTargetFieldStateParams): BattleTargetFieldState => {
  const remotePlayerIndex = localPlayerIndex === 0 ? 1 : 0;

  return {
    playerSlots: buildBattleTargetFieldSlots({
      presentationSide: "player",
      runtimeSide: localPlayerIndex,
      targetsInPlay,
      logicalTargets: logicalTargets[localPlayerIndex],
      stableTargets: stableTargets[localPlayerIndex],
      incomingTargets: incomingTargets[localPlayerIndex],
      outgoingTargets: outgoingTargets[localPlayerIndex],
      lockedTargetSlots: lockedTargetSlots[localPlayerIndex],
      pendingTargetPlacements: pendingTargetPlacements[localPlayerIndex],
    }),
    enemySlots: buildBattleTargetFieldSlots({
      presentationSide: "enemy",
      runtimeSide: remotePlayerIndex,
      targetsInPlay,
      logicalTargets: logicalTargets[remotePlayerIndex],
      stableTargets: stableTargets[remotePlayerIndex],
      incomingTargets: incomingTargets[remotePlayerIndex],
      outgoingTargets: outgoingTargets[remotePlayerIndex],
      lockedTargetSlots: lockedTargetSlots[remotePlayerIndex],
      pendingTargetPlacements: pendingTargetPlacements[remotePlayerIndex],
    }),
  };
};

const createLaneSlotFieldState = ({
  laneSlot,
  side,
  slotIndex,
}: {
  laneSlot: BattleFieldLaneSlot;
  side: BattleTargetFieldSide;
  slotIndex: number;
}): BattleTargetFieldSlotState => {
  const runtimeSide = side === "player" ? 0 : 1;
  const slot = createBattleTargetSlot({ side, runtimeSide, slotIndex });
  const displayedTarget = laneSlot.displayedTarget;
  const occupant =
    displayedTarget?.target != null
      ? createBattleTargetInstance({ target: displayedTarget.target, slot })
      : null;
  const sceneNodes: BattleTargetSceneNode[] = [];

  if (displayedTarget) {
    sceneNodes.push(
      createSceneNodeFromEntity({
        sceneNodeId: `${slot.slotId}:idle:${displayedTarget.id}`,
        slot,
        entity: displayedTarget,
        phase: "idle",
        sourceKind: "stable",
      }),
    );
  }

  if (laneSlot.incomingTarget) {
    sceneNodes.push(
      createSceneNodeFromEntity({
        sceneNodeId: laneSlot.incomingTarget.id,
        slot,
        entity: laneSlot.incomingTarget.entity,
        phase: inferIncomingPhase(laneSlot.incomingTarget.id),
        sourceKind: "incoming",
      }),
    );
  }

  if (laneSlot.outgoingTarget) {
    sceneNodes.push(
      createSceneNodeFromEntity({
        sceneNodeId: laneSlot.outgoingTarget.id,
        slot,
        entity: laneSlot.outgoingTarget.entity,
        phase: inferOutgoingPhase(laneSlot.outgoingTarget),
        sourceKind: "outgoing",
      }),
    );
  }

  if (laneSlot.pendingCard && occupant) {
    sceneNodes.push({
      sceneNodeId: `${slot.slotId}:receive-card:${occupant.instanceId}:${laneSlot.pendingCard}`,
      slotId: slot.slotId,
      instanceId: occupant.instanceId,
      side: slot.side,
      runtimeSide: slot.runtimeSide,
      slotIndex: slot.slotIndex,
      phase: "receive-card",
      pendingCard: laneSlot.pendingCard,
      sourceKind: "pending-card",
    });
  }

  return {
    slot,
    occupant,
    sceneNodes,
    locked: false,
    pendingCard: laneSlot.pendingCard ?? null,
  };
};

export const buildBattleTargetFieldStateFromSceneSlots = ({
  playerFieldSlots,
  enemyFieldSlots,
}: {
  playerFieldSlots: BattleFieldLaneSlot[];
  enemyFieldSlots: BattleFieldLaneSlot[];
}): BattleTargetFieldState => ({
  playerSlots: playerFieldSlots.map((slot, slotIndex) =>
    createLaneSlotFieldState({
      laneSlot: slot,
      side: "player",
      slotIndex,
    }),
  ),
  enemySlots: enemyFieldSlots.map((slot, slotIndex) =>
    createLaneSlotFieldState({
      laneSlot: slot,
      side: "enemy",
      slotIndex,
    }),
  ),
});

