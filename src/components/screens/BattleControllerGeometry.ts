import React, { useCallback, useMemo } from "react";
import { CONFIG } from "../../logic/gameLogic";
import { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import type { BattleAnimationAnchorPoint } from "./BattleLayoutConfig";
import { BATTLE_STAGE_HEIGHT, BATTLE_STAGE_WIDTH } from "./BattleSceneSpace";
import {
  createBattleAuthoredAnimationAnchorSetFromPartial,
  resolveBattleMotionAnchor,
  type BattleSceneAnimationAnchorKey,
} from "./BattleAnchorResolver";
import {
  AnimationFallbackEvent,
  BattleRuntimeSide,
  PLAYER,
} from "./BattleRuntimeState";

interface BattleControllerGeometryAnimations {
  postPlayHandDrawOrigin: BattleAnimationAnchorPoint | null;
  handPlayTarget0Destination: BattleAnimationAnchorPoint | null;
  handPlayTarget1Destination: BattleAnimationAnchorPoint | null;
  replacementTargetEntry0Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry1Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry2Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry3Origin: BattleAnimationAnchorPoint | null;
  mulliganReturn1Destination: BattleAnimationAnchorPoint | null;
  mulliganReturn2Destination: BattleAnimationAnchorPoint | null;
  mulliganReturn3Destination: BattleAnimationAnchorPoint | null;
  mulliganDraw1Origin: BattleAnimationAnchorPoint | null;
  mulliganDraw2Origin: BattleAnimationAnchorPoint | null;
  mulliganDraw3Origin: BattleAnimationAnchorPoint | null;
}

interface BattleControllerStageResolution {
  selector: string;
  rootCount: number;
  root: HTMLElement | null;
  rect: DOMRect | null;
  scaleX: number | null;
  scaleY: number | null;
  reason: string | null;
}

interface UseBattleControllerGeometryParams {
  localPlayerIndex: BattleRuntimeSide;
  animations: BattleControllerGeometryAnimations;
  zoneNodesRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handCardNodesRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  animationFallbackHistoryRef: React.MutableRefObject<AnimationFallbackEvent[]>;
  animationFallbackIdRef: React.MutableRefObject<number>;
  setAnimationFallbackHistoryVersion: React.Dispatch<React.SetStateAction<number>>;
}

const zoneRefKey = (zoneId: BoardZoneId, slot: string) => `${zoneId}:${slot}`;

export const useBattleControllerGeometry = ({
  localPlayerIndex,
  animations,
  zoneNodesRef,
  handCardNodesRef,
  animationFallbackHistoryRef,
  animationFallbackIdRef,
  setAnimationFallbackHistoryVersion,
}: UseBattleControllerGeometryParams) => {
  const bindZoneRef = useCallback(
    (zoneId: BoardZoneId, slot: string) => (node: HTMLDivElement | null) => {
      zoneNodesRef.current[zoneRefKey(zoneId, slot)] = node;
    },
    [zoneNodesRef],
  );

  const bindHandCardRef = useCallback(
    (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => {
      handCardNodesRef.current[`${cardId}:${layoutId}`] = node;
    },
    [handCardNodesRef],
  );

  const snapshotZone = useCallback((zoneId: BoardZoneId): ZoneAnchorSnapshot | null => {
    const bestNode = Object.entries(zoneNodesRef.current)
      .filter(([key, node]) => key.startsWith(`${zoneId}:`) && node)
      .map(([, node]) => node as HTMLDivElement)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0];

    if (!bestNode) return null;

    const { left, top, width, height } = bestNode.rect;
    return { left, top, width, height };
  }, [zoneNodesRef]);

  const snapshotZoneSlot = useCallback((zoneId: BoardZoneId, slot: string): ZoneAnchorSnapshot | null => {
    const node = zoneNodesRef.current[zoneRefKey(zoneId, slot)];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, [zoneNodesRef]);

  const getZoneSlotRect = useCallback((zoneId: BoardZoneId, slot: string): DOMRect | null => {
    const node = zoneNodesRef.current[zoneRefKey(zoneId, slot)];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }, [zoneNodesRef]);

  const snapshotHandCard = useCallback((cardId: string): ZoneAnchorSnapshot | null => {
    const bestNode = Object.entries(handCardNodesRef.current)
      .filter(([key, node]) => key.startsWith(`${cardId}:`) && node)
      .map(([, node]) => node as HTMLDivElement)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0];

    if (!bestNode) return null;

    const { left, top, width, height } = bestNode.rect;
    return { left, top, width, height };
  }, [handCardNodesRef]);

  const resolveBattleStageMetrics = useCallback((): BattleControllerStageResolution => {
    const selector = '[data-battle-stage-root="true"]';
    if (typeof document === "undefined") {
      return {
        selector,
        rootCount: 0,
        root: null,
        rect: null,
        scaleX: null,
        scaleY: null,
        reason: "no-document",
      };
    }

    const roots = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const root = roots[0] ?? null;
    if (!root) {
      return {
        selector,
        rootCount: roots.length,
        root,
        rect: null,
        scaleX: null,
        scaleY: null,
        reason: "stage-root-missing",
      };
    }

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return {
        selector,
        rootCount: roots.length,
        root,
        rect,
        scaleX: null,
        scaleY: null,
        reason: `stage-rect-invalid:${Math.round(rect.width)}x${Math.round(rect.height)}`,
      };
    }

    return {
      selector,
      rootCount: roots.length,
      root,
      rect,
      scaleX: rect.width / BATTLE_STAGE_WIDTH,
      scaleY: rect.height / BATTLE_STAGE_HEIGHT,
      reason: null,
    };
  }, []);

  const serializeZoneAnchorSnapshot = useCallback((snapshot: ZoneAnchorSnapshot | null | undefined) => {
    if (!snapshot) return null;
    return {
      left: Math.round(snapshot.left),
      top: Math.round(snapshot.top),
      width: Math.round(snapshot.width),
      height: Math.round(snapshot.height),
    };
  }, []);

  const snapshotSceneAnimationOrigin = useCallback(
    (point: { x: number; y: number } | null | undefined): ZoneAnchorSnapshot | null => {
      if (!point) return null;
      const stageMetrics = resolveBattleStageMetrics();
      if (!stageMetrics.rect || stageMetrics.scaleX == null || stageMetrics.scaleY == null) {
        return null;
      }
      return {
        left: stageMetrics.rect.left + point.x * stageMetrics.scaleX,
        top: stageMetrics.rect.top + point.y * stageMetrics.scaleY,
        width: 0,
        height: 0,
      };
    },
    [resolveBattleStageMetrics],
  );

  const getSceneAnimationOriginFailureReason = useCallback(
    (point: { x: number; y: number } | null | undefined) => {
      if (!point) return "anchor-not-set";
      return resolveBattleStageMetrics().reason;
    },
    [resolveBattleStageMetrics],
  );

  const pushAnimationFallbackEvent = useCallback((label: string, reason: string, fallback: string) => {
    animationFallbackHistoryRef.current = [
      {
        id: `anim-fallback-${animationFallbackIdRef.current++}`,
        label,
        reason,
        fallback,
        createdAt: Date.now(),
      },
      ...animationFallbackHistoryRef.current,
    ].slice(0, 16);
    setAnimationFallbackHistoryVersion((value) => value + 1);
  }, [
    animationFallbackHistoryRef,
    animationFallbackIdRef,
    setAnimationFallbackHistoryVersion,
  ]);

  const snapshotSceneAnimationOriginWithFallback = useCallback(
    (
      label: string,
      point: { x: number; y: number } | null | undefined,
      fallback: string,
    ) => {
      const snapshot = snapshotSceneAnimationOrigin(point);
      if (snapshot) return snapshot;
      const reason = getSceneAnimationOriginFailureReason(point) ?? "snapshot-null";
      pushAnimationFallbackEvent(label, reason, fallback);
      return null;
    },
    [getSceneAnimationOriginFailureReason, pushAnimationFallbackEvent, snapshotSceneAnimationOrigin],
  );

  const authoredAnchorSet = useMemo(
    () => createBattleAuthoredAnimationAnchorSetFromPartial(animations),
    [animations],
  );

  const getMotionAnchorSnapshot = useCallback(
    (
      label: string,
      anchorKey: BattleSceneAnimationAnchorKey,
      fallbackOverride?: string,
    ) => {
      const resolved = resolveBattleMotionAnchor({
        anchors: authoredAnchorSet,
        anchor: anchorKey,
        targetsInPlay: CONFIG.targetsInPlay,
      });
      if (!resolved) return null;
      return snapshotSceneAnimationOriginWithFallback(
        label,
        resolved.authored.point,
        fallbackOverride ?? resolved.fallbackTag,
      );
    },
    [authoredAnchorSet, snapshotSceneAnimationOriginWithFallback],
  );

  const getPostPlayHandDrawOriginSnapshot = useCallback(
    (side: BattleRuntimeSide) => {
      if (side !== localPlayerIndex) return null;
      return getMotionAnchorSnapshot(
        "post-play-hand-draw",
        "postPlayHandDrawOrigin",
        "deck",
      );
    },
    [getMotionAnchorSnapshot, localPlayerIndex],
  );

  const getHandPlayTargetDestinationSnapshot = useCallback(
    (side: BattleRuntimeSide, targetIndex: number) => {
      if (side !== localPlayerIndex) return null;
      if (targetIndex !== 0 && targetIndex !== 1) return null;
      return getMotionAnchorSnapshot(
        `hand-play-target-${targetIndex}`,
        targetIndex === 0
          ? "handPlayTarget0Destination"
          : "handPlayTarget1Destination",
        `player-field-slot-${targetIndex}`,
      );
    },
    [getMotionAnchorSnapshot, localPlayerIndex],
  );

  const getReplacementTargetEntryOriginSnapshot = useCallback(
    (side: BattleRuntimeSide, slotIndex: number) => {
      if (slotIndex !== 0 && slotIndex !== 1) return null;
      const replacementIndex = side * CONFIG.targetsInPlay + slotIndex;
      const anchorKey = (
        `replacementTargetEntry${replacementIndex}Origin`
      ) as BattleSceneAnimationAnchorKey;
      return getMotionAnchorSnapshot(
        `replacement-target-entry-${replacementIndex}`,
        anchorKey,
        `${side === PLAYER ? "player" : "enemy"}-target-deck`,
      );
    },
    [getMotionAnchorSnapshot],
  );

  const getMulliganHandReturnDestinationSnapshot = useCallback(
    (side: BattleRuntimeSide, count: number) => {
      if (side !== localPlayerIndex) return null;
      const anchorKey =
        count === 1
          ? "mulliganReturn1Destination"
          : count === 2
            ? "mulliganReturn2Destination"
            : count === 3
              ? "mulliganReturn3Destination"
              : null;
      return anchorKey
        ? getMotionAnchorSnapshot(`mulligan-return-${count}`, anchorKey, "deck")
        : null;
    },
    [
      getMotionAnchorSnapshot,
      localPlayerIndex,
    ],
  );

  const getMulliganHandDrawOriginSnapshot = useCallback(
    (side: BattleRuntimeSide, count: number) => {
      if (side !== localPlayerIndex) return null;
      const anchorKey =
        count === 1
          ? "mulliganDraw1Origin"
          : count === 2
            ? "mulliganDraw2Origin"
            : count === 3
              ? "mulliganDraw3Origin"
              : null;
      return anchorKey
        ? getMotionAnchorSnapshot(`mulligan-draw-${count}`, anchorKey, "deck")
        : null;
    },
    [
      getMotionAnchorSnapshot,
      localPlayerIndex,
    ],
  );

  const getBattleStageMetrics = useCallback(() => {
    const resolved = resolveBattleStageMetrics();
    if (!resolved.rect || resolved.scaleX == null || resolved.scaleY == null) return null;
    return {
      rect: resolved.rect,
      scaleX: resolved.scaleX,
      scaleY: resolved.scaleY,
    };
  }, [resolveBattleStageMetrics]);

  return {
    bindZoneRef,
    bindHandCardRef,
    snapshotZone,
    snapshotZoneSlot,
    getZoneSlotRect,
    snapshotHandCard,
    resolveBattleStageMetrics,
    serializeZoneAnchorSnapshot,
    snapshotSceneAnimationOrigin,
    snapshotSceneAnimationOriginWithFallback,
    getPostPlayHandDrawOriginSnapshot,
    getHandPlayTargetDestinationSnapshot,
    getReplacementTargetEntryOriginSnapshot,
    getMulliganHandReturnDestinationSnapshot,
    getMulliganHandDrawOriginSnapshot,
    getBattleStageMetrics,
  };
};
