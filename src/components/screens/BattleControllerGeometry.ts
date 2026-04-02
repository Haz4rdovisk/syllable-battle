import React, { useCallback, useMemo } from "react";
import { CONFIG } from "../../logic/gameLogic";
import { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import type { BattleAnimationAnchorPoint } from "./BattleLayoutConfig";
import { BATTLE_STAGE_HEIGHT, BATTLE_STAGE_WIDTH } from "./BattleSceneSpace";
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

  const handPlayTargetPointsByIndex = useMemo(
    () => ({
      0: animations.handPlayTarget0Destination,
      1: animations.handPlayTarget1Destination,
    }),
    [animations.handPlayTarget0Destination, animations.handPlayTarget1Destination],
  );

  const replacementTargetEntryPointsByIndex = useMemo(
    () => ({
      0: animations.replacementTargetEntry0Origin,
      1: animations.replacementTargetEntry1Origin,
      2: animations.replacementTargetEntry2Origin,
      3: animations.replacementTargetEntry3Origin,
    }),
    [
      animations.replacementTargetEntry0Origin,
      animations.replacementTargetEntry1Origin,
      animations.replacementTargetEntry2Origin,
      animations.replacementTargetEntry3Origin,
    ],
  );

  const mulliganReturnPointsByCount = useMemo(
    () => ({
      1: animations.mulliganReturn1Destination,
      2: animations.mulliganReturn2Destination,
      3: animations.mulliganReturn3Destination,
    }),
    [
      animations.mulliganReturn1Destination,
      animations.mulliganReturn2Destination,
      animations.mulliganReturn3Destination,
    ],
  );

  const mulliganDrawPointsByCount = useMemo(
    () => ({
      1: animations.mulliganDraw1Origin,
      2: animations.mulliganDraw2Origin,
      3: animations.mulliganDraw3Origin,
    }),
    [
      animations.mulliganDraw1Origin,
      animations.mulliganDraw2Origin,
      animations.mulliganDraw3Origin,
    ],
  );

  const getMulliganAnimationPointByCount = useCallback(
    (
      count: number,
      pointsByCount: {
        1: BattleAnimationAnchorPoint | null;
        2: BattleAnimationAnchorPoint | null;
        3: BattleAnimationAnchorPoint | null;
      },
    ) => {
      if (count === 1 || count === 2 || count === 3) {
        return pointsByCount[count];
      }
      return null;
    },
    [],
  );

  const getPostPlayHandDrawOriginSnapshot = useCallback(
    (side: BattleRuntimeSide) => {
      if (side !== localPlayerIndex) return null;
      return snapshotSceneAnimationOriginWithFallback(
        "post-play-hand-draw",
        animations.postPlayHandDrawOrigin,
        "deck",
      );
    },
    [animations.postPlayHandDrawOrigin, localPlayerIndex, snapshotSceneAnimationOriginWithFallback],
  );

  const getHandPlayTargetDestinationSnapshot = useCallback(
    (side: BattleRuntimeSide, targetIndex: number) => {
      if (side !== localPlayerIndex) return null;
      if (targetIndex !== 0 && targetIndex !== 1) return null;
      return snapshotSceneAnimationOriginWithFallback(
        `hand-play-target-${targetIndex}`,
        handPlayTargetPointsByIndex[targetIndex],
        `player-field-slot-${targetIndex}`,
      );
    },
    [handPlayTargetPointsByIndex, localPlayerIndex, snapshotSceneAnimationOriginWithFallback],
  );

  const getReplacementTargetEntryOriginSnapshot = useCallback(
    (side: BattleRuntimeSide, slotIndex: number) => {
      if (slotIndex !== 0 && slotIndex !== 1) return null;
      const replacementIndex = side * CONFIG.targetsInPlay + slotIndex;
      return snapshotSceneAnimationOriginWithFallback(
        `replacement-target-entry-${replacementIndex}`,
        replacementTargetEntryPointsByIndex[replacementIndex],
        `${side === PLAYER ? "player" : "enemy"}-target-deck`,
      );
    },
    [replacementTargetEntryPointsByIndex, snapshotSceneAnimationOriginWithFallback],
  );

  const getMulliganHandReturnDestinationSnapshot = useCallback(
    (side: BattleRuntimeSide, count: number) => {
      if (side !== localPlayerIndex) return null;
      return snapshotSceneAnimationOriginWithFallback(
        `mulligan-return-${count}`,
        getMulliganAnimationPointByCount(count, mulliganReturnPointsByCount),
        "deck",
      );
    },
    [
      getMulliganAnimationPointByCount,
      localPlayerIndex,
      mulliganReturnPointsByCount,
      snapshotSceneAnimationOriginWithFallback,
    ],
  );

  const getMulliganHandDrawOriginSnapshot = useCallback(
    (side: BattleRuntimeSide, count: number) => {
      if (side !== localPlayerIndex) return null;
      return snapshotSceneAnimationOriginWithFallback(
        `mulligan-draw-${count}`,
        getMulliganAnimationPointByCount(count, mulliganDrawPointsByCount),
        "deck",
      );
    },
    [
      getMulliganAnimationPointByCount,
      localPlayerIndex,
      mulliganDrawPointsByCount,
      snapshotSceneAnimationOriginWithFallback,
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
