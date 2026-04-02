import React, { useCallback, useMemo } from "react";
import { CONFIG } from "../../logic/gameLogic";
import { BattleEvent, BattleSubmittedAction, GameMode, GameState } from "../../types/game";
import { BoardZoneId, ZoneAnchorSnapshot } from "../game/GameComponents";
import { BattleDevWatcherSample } from "./BattleDevRuntime";
import type { BattleAnimationAnchorPoint } from "./BattleLayoutConfig";
import {
  LiveBattleAnimationAnchorKey,
  buildBattleDebugPointSnapshot,
  buildBattleProbeRow,
  buildLiveAnimationSnapshotEntries,
  createLiveAnimationAnchorPoints,
  formatBattleDebugFallbackLine,
  formatBattleDebugPoint,
  formatBattleDebugSnapshot,
  formatBattleProbeLine,
  getBattleDebugZoneSnapshotCenter,
  getLiveAnimationAnchorReferenceTarget,
  getVisibleBattleAnimationAnchors,
  toBattleDebugScenePoint,
  toBattleDebugScreenPoint,
} from "./BattleDebugGeometry";
import { BattleFieldLaneDebugSnapshot } from "./BattleFieldLane";
import { BattleHandLaneDebugSnapshot } from "./BattleHandLane";
import {
  AnimationFallbackEvent,
  BattleIntroPhase,
  BattleOutgoingHandCardsState,
  BattleRuntimeSide,
  IncomingHandCard,
  IncomingTargetCard,
  LockedTargetSlotsState,
  MulliganDebugState,
  OutgoingTargetCard,
  PendingMulliganDraw,
  PendingTargetPlacementsState,
  StableHandsState,
  PLAYER,
  ENEMY,
} from "./BattleRuntimeState";

interface UseBattleControllerDebugParams {
  animations: Parameters<typeof createLiveAnimationAnchorPoints>[0];
  game: GameState;
  localPlayerIndex: BattleRuntimeSide;
  remotePlayerIndex: BattleRuntimeSide;
  mode: GameMode;
  roomTransportKind?: "mock" | "broadcast" | "remote";
  authoritativeBattleSnapshot?: GameState;
  pendingExternalAction?: BattleSubmittedAction | null;
  stableHands: StableHandsState;
  incomingHands: Record<BattleRuntimeSide, IncomingHandCard[]>;
  outgoingHands: BattleOutgoingHandCardsState;
  pendingMulliganDrawCountsRef: React.MutableRefObject<Record<BattleRuntimeSide, number>>;
  pendingMulliganDrawQueuesRef: React.MutableRefObject<Record<BattleRuntimeSide, PendingMulliganDraw[]>>;
  incomingTargets: Record<BattleRuntimeSide, IncomingTargetCard[]>;
  outgoingTargets: Record<BattleRuntimeSide, OutgoingTargetCard[]>;
  lockedTargetSlots: LockedTargetSlotsState;
  pendingTargetPlacements: PendingTargetPlacementsState;
  freshCardIds: string[];
  mulliganDebug: MulliganDebugState;
  battleEventsRef: React.MutableRefObject<BattleEvent[]>;
  battleDebugSamplesRef: React.MutableRefObject<BattleDevWatcherSample[]>;
  battleDebugStartedAtRef: React.MutableRefObject<number | null>;
  battleDebugLastSignatureRef: React.MutableRefObject<string>;
  animationFallbackHistoryRef: React.MutableRefObject<AnimationFallbackEvent[]>;
  battleDebugWatcherVersion: number;
  animationFallbackHistoryVersion: number;
  turnRemainingMs: number;
  coinChoiceRemainingMs: number;
  actionTimersRef: React.MutableRefObject<NodeJS.Timeout[]>;
  visualTimersRef: React.MutableRefObject<NodeJS.Timeout[]>;
  zoneNodesRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handCardNodesRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handLaneDebugRef: React.MutableRefObject<Record<string, BattleHandLaneDebugSnapshot | null>>;
  fieldLaneDebugRef: React.MutableRefObject<Record<string, BattleFieldLaneDebugSnapshot | null>>;
  getBattleStageMetrics: () => { rect: DOMRect; scaleX: number; scaleY: number } | null;
  resolveBattleStageMetrics: () => {
    selector: string;
    rootCount: number;
    root: HTMLElement | null;
    rect: DOMRect | null;
    scaleX: number | null;
    scaleY: number | null;
    reason: string | null;
  };
  serializeZoneAnchorSnapshot: (
    snapshot: ZoneAnchorSnapshot | null | undefined,
  ) => { left: number; top: number; width: number; height: number } | null;
  snapshotSceneAnimationOrigin: (point: { x: number; y: number } | null | undefined) => ZoneAnchorSnapshot | null;
  snapshotZone: (zoneId: BoardZoneId) => ZoneAnchorSnapshot | null;
  snapshotZoneSlot: (zoneId: BoardZoneId, slot: string) => ZoneAnchorSnapshot | null;
  snapshotHandCard: (cardId: string) => ZoneAnchorSnapshot | null;
}

export const useBattleControllerDebug = ({
  animations,
  game,
  localPlayerIndex,
  remotePlayerIndex,
  mode,
  roomTransportKind,
  authoritativeBattleSnapshot,
  pendingExternalAction,
  stableHands,
  incomingHands,
  outgoingHands,
  pendingMulliganDrawCountsRef,
  pendingMulliganDrawQueuesRef,
  incomingTargets,
  outgoingTargets,
  lockedTargetSlots,
  pendingTargetPlacements,
  freshCardIds,
  mulliganDebug,
  battleEventsRef,
  battleDebugSamplesRef,
  battleDebugStartedAtRef,
  battleDebugLastSignatureRef,
  animationFallbackHistoryRef,
  battleDebugWatcherVersion,
  animationFallbackHistoryVersion,
  turnRemainingMs,
  coinChoiceRemainingMs,
  actionTimersRef,
  visualTimersRef,
  zoneNodesRef,
  handCardNodesRef,
  handLaneDebugRef,
  fieldLaneDebugRef,
  getBattleStageMetrics,
  resolveBattleStageMetrics,
  serializeZoneAnchorSnapshot,
  snapshotSceneAnimationOrigin,
  snapshotZone,
  snapshotZoneSlot,
  snapshotHandCard,
}: UseBattleControllerDebugParams) => {
  const liveAnimationAnchorPoints = useMemo(
    () => createLiveAnimationAnchorPoints(animations),
    [animations],
  );

  const getScreenPointFromScenePoint = useCallback(
    (point: { x: number; y: number } | null | undefined) => {
      return toBattleDebugScreenPoint(point, getBattleStageMetrics());
    },
    [getBattleStageMetrics],
  );

  const getScenePointFromScreenPoint = useCallback(
    (point: { x: number; y: number } | null | undefined) => {
      return toBattleDebugScenePoint(point, getBattleStageMetrics());
    },
    [getBattleStageMetrics],
  );

  const getReferenceScreenPointForAnimationAnchor = useCallback(
    (anchorKey: LiveBattleAnimationAnchorKey) => {
      const target = getLiveAnimationAnchorReferenceTarget(anchorKey, CONFIG.targetsInPlay);
      if (!target) return null;
      if (target.kind === "slot") {
        return getBattleDebugZoneSnapshotCenter(
          snapshotZoneSlot(target.zoneId, target.slot),
        );
      }
      return getBattleDebugZoneSnapshotCenter(snapshotZone(target.zoneId));
    },
    [snapshotZone, snapshotZoneSlot],
  );

  const liveVisibleAnimationAnchors = useMemo(
    () => getVisibleBattleAnimationAnchors(liveAnimationAnchorPoints),
    [liveAnimationAnchorPoints],
  );

  const liveAnchorProbeRows = useMemo(
    () =>
      liveVisibleAnimationAnchors.map(({ anchor, point }) => {
        const screen = getScreenPointFromScenePoint(point);
        const referenceScreen = getReferenceScreenPointForAnimationAnchor(anchor);
        const reference = getScenePointFromScreenPoint(referenceScreen);
        return buildBattleProbeRow({
          anchor,
          point,
          screen,
          reference,
          referenceScreen,
        });
      }),
    [
      getReferenceScreenPointForAnimationAnchor,
      getScenePointFromScreenPoint,
      getScreenPointFromScenePoint,
      liveVisibleAnimationAnchors,
    ],
  );

  const liveAnimationDebugData = useMemo(() => {
    const stageMetrics = getBattleStageMetrics();
    const stageLine = stageMetrics
      ? `stage:${Math.round(stageMetrics.rect.width)}x${Math.round(stageMetrics.rect.height)} scale:${stageMetrics.scaleX.toFixed(3)},${stageMetrics.scaleY.toFixed(3)} off:${Math.round(stageMetrics.rect.left)},${Math.round(stageMetrics.rect.top)}`
      : "stage:-";
    const probeLines = liveAnchorProbeRows.map((row) => formatBattleProbeLine(row));
    const groupedSnapshotRows = buildLiveAnimationSnapshotEntries(animations).reduce<Record<string, string[]>>((acc, entry) => {
      const snapshot = snapshotSceneAnimationOrigin(entry.point);
      const line = `${entry.key}:${formatBattleDebugPoint(entry.point)} -> ${formatBattleDebugSnapshot(snapshot)}`;
      acc[entry.group] = [...(acc[entry.group] ?? []), line];
      return acc;
    }, {});
    const snapshotLines = [
      `postPlayDraw:${groupedSnapshotRows.postPlayDraw?.join(" | ") ?? "-"}`,
      `handPlayDests:[${groupedSnapshotRows.handPlayDests?.join(" | ") ?? "-"}]`,
      `replacementOrigins:[${groupedSnapshotRows.replacementOrigins?.join(" | ") ?? "-"}]`,
      `mulliganReturns:[${groupedSnapshotRows.mulliganReturns?.join(" | ") ?? "-"}]`,
      `mulliganDraws:[${groupedSnapshotRows.mulliganDraws?.join(" | ") ?? "-"}]`,
      `attackImpacts:[${groupedSnapshotRows.attackImpacts?.join(" | ") ?? "-"}]`,
      `attackDests:[${groupedSnapshotRows.attackDests?.join(" | ") ?? "-"}]`,
      `openingOrigins:[${groupedSnapshotRows.openingOrigins?.join(" | ") ?? "-"}]`,
    ];
    const fallbackLines = animationFallbackHistoryRef.current.map(formatBattleDebugFallbackLine);

    return {
      stageLine,
      anchorsLine: `anchors:[${liveVisibleAnimationAnchors.map(({ anchor, point }) => `${anchor}@${formatBattleDebugPoint(point)}`).join(" | ")}]`,
      probeLines,
      snapshotLines,
      fallbackLines,
    };
  }, [
    animations,
    animationFallbackHistoryRef,
    battleDebugWatcherVersion,
    animationFallbackHistoryVersion,
    getBattleStageMetrics,
    liveAnchorProbeRows,
    liveVisibleAnimationAnchors,
    snapshotSceneAnimationOrigin,
  ]);

  const buildFreshAnimationProbeSnapshot = useCallback(() => {
    const stageResolution = resolveBattleStageMetrics();
    const stageLine =
      stageResolution.rect && stageResolution.scaleX != null && stageResolution.scaleY != null
        ? `stage:${Math.round(stageResolution.rect.width)}x${Math.round(stageResolution.rect.height)} scale:${stageResolution.scaleX.toFixed(3)},${stageResolution.scaleY.toFixed(3)} off:${Math.round(stageResolution.rect.left)},${Math.round(stageResolution.rect.top)}`
        : "stage:-";
    const stageDiagnostics = {
      selector: stageResolution.selector,
      rootCount: stageResolution.rootCount,
      stageRootFound: Boolean(stageResolution.root),
      stageRootConnected: stageResolution.root ? stageResolution.root.isConnected : false,
      stageRootTag: stageResolution.root?.tagName ?? null,
      stageRootClassName: stageResolution.root?.className ?? null,
      reason: stageResolution.reason,
      rect:
        stageResolution.rect == null
          ? null
          : {
              left: Math.round(stageResolution.rect.left),
              top: Math.round(stageResolution.rect.top),
              width: Math.round(stageResolution.rect.width),
              height: Math.round(stageResolution.rect.height),
            },
      scale:
        stageResolution.scaleX == null || stageResolution.scaleY == null
          ? null
          : {
              x: Number(stageResolution.scaleX.toFixed(3)),
              y: Number(stageResolution.scaleY.toFixed(3)),
            },
    };
    const toSnapshotWithMetrics = (point: BattleAnimationAnchorPoint | null | undefined) =>
      buildBattleDebugPointSnapshot(
        point,
        stageResolution.rect && stageResolution.scaleX != null && stageResolution.scaleY != null
          ? {
              rect: stageResolution.rect,
              scaleX: stageResolution.scaleX,
              scaleY: stageResolution.scaleY,
            }
          : null,
      );
    const toScreenPointWithMetrics = (point: BattleAnimationAnchorPoint | null | undefined) =>
      toBattleDebugScreenPoint(
        point,
        stageResolution.rect && stageResolution.scaleX != null && stageResolution.scaleY != null
          ? {
              rect: stageResolution.rect,
              scaleX: stageResolution.scaleX,
              scaleY: stageResolution.scaleY,
            }
          : null,
      );
    const toScenePointWithMetrics = (point: { x: number; y: number } | null | undefined) =>
      toBattleDebugScenePoint(
        point,
        stageResolution.rect && stageResolution.scaleX != null && stageResolution.scaleY != null
          ? {
              rect: stageResolution.rect,
              scaleX: stageResolution.scaleX,
              scaleY: stageResolution.scaleY,
            }
          : null,
      );
    const visibleAnchors = getVisibleBattleAnimationAnchors(liveAnimationAnchorPoints);
    const probeRows = visibleAnchors.map(({ anchor, point }) => {
      const screen = toScreenPointWithMetrics(point);
      const referenceScreen = getReferenceScreenPointForAnimationAnchor(anchor);
      const reference = toScenePointWithMetrics(referenceScreen);
      const failureReason = point ? stageResolution.reason : "anchor-not-set";
      return buildBattleProbeRow({
        anchor,
        point,
        screen,
        reference,
        referenceScreen,
        failureReason,
      });
    });
    const snapshotEntries = buildLiveAnimationSnapshotEntries(animations);
    const groupedSnapshotRows = snapshotEntries.reduce<Record<string, string[]>>((acc, entry) => {
      const snapshot = toSnapshotWithMetrics(entry.point);
      const line = `${entry.key}:${formatBattleDebugPoint(entry.point)} -> ${formatBattleDebugSnapshot(snapshot)}`;
      acc[entry.group] = [...(acc[entry.group] ?? []), line];
      return acc;
    }, {});
    const snapshotRows = snapshotEntries.map((entry) => {
      const snapshot = toSnapshotWithMetrics(entry.point);
      return {
        group: entry.group,
        key: entry.key,
        point: entry.point,
        snapshot: serializeZoneAnchorSnapshot(snapshot),
        failureReason: entry.point ? stageResolution.reason : "anchor-not-set",
      };
    });
    const fallbackEntries = animationFallbackHistoryRef.current.map((entry) => ({
      id: entry.id,
      label: entry.label,
      reason: entry.reason,
      fallback: entry.fallback,
      createdAt: entry.createdAt,
      createdAtIso: new Date(entry.createdAt).toISOString(),
    }));
    return {
      stage: stageLine,
      stageDiagnostics,
      anchors: `anchors:[${visibleAnchors.map(({ anchor, point }) => `${anchor}@${formatBattleDebugPoint(point)}`).join(" | ")}]`,
      anchorPoints: visibleAnchors.map(({ anchor, point }) => ({ anchor, point })),
      probes: probeRows.map((row) => formatBattleProbeLine(row)),
      probeRows,
      snapshots: [
        `postPlayDraw:${groupedSnapshotRows.postPlayDraw?.join(" | ") ?? "-"}`,
        `handPlayDests:[${groupedSnapshotRows.handPlayDests?.join(" | ") ?? "-"}]`,
        `replacementOrigins:[${groupedSnapshotRows.replacementOrigins?.join(" | ") ?? "-"}]`,
        `mulliganReturns:[${groupedSnapshotRows.mulliganReturns?.join(" | ") ?? "-"}]`,
        `mulliganDraws:[${groupedSnapshotRows.mulliganDraws?.join(" | ") ?? "-"}]`,
        `attackImpacts:[${groupedSnapshotRows.attackImpacts?.join(" | ") ?? "-"}]`,
        `attackDests:[${groupedSnapshotRows.attackDests?.join(" | ") ?? "-"}]`,
        `openingOrigins:[${groupedSnapshotRows.openingOrigins?.join(" | ") ?? "-"}]`,
      ],
      snapshotRows,
      fallbacks: fallbackEntries.map(formatBattleDebugFallbackLine),
      fallbackEntries,
      counters: {
        anchors: visibleAnchors.length,
        probes: probeRows.length,
        snapshots: snapshotRows.length,
        fallbacks: fallbackEntries.length,
      },
    };
  }, [
    animations,
    animationFallbackHistoryRef,
    getReferenceScreenPointForAnimationAnchor,
    liveAnimationAnchorPoints,
    resolveBattleStageMetrics,
    serializeZoneAnchorSnapshot,
  ]);

  const buildBattleDevSnapshot = useCallback(() => {
    const stageMetrics = getBattleStageMetrics();
    const animationProbe = buildFreshAnimationProbeSnapshot();
    const stageRect = stageMetrics
      ? {
          left: Math.round(stageMetrics.rect.left),
          top: Math.round(stageMetrics.rect.top),
          width: Math.round(stageMetrics.rect.width),
          height: Math.round(stageMetrics.rect.height),
          scaleX: Number(stageMetrics.scaleX.toFixed(3)),
          scaleY: Number(stageMetrics.scaleY.toFixed(3)),
        }
      : null;

    return {
      capturedAt: new Date().toISOString(),
      location:
        typeof window === "undefined"
          ? null
          : {
              href: window.location.href,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
              visibility: document.visibilityState,
            },
      stageRect,
      stageRootDiagnostics: animationProbe.stageDiagnostics,
      openingIntroStep: game.openingIntroStep,
      turn: game.turn,
      localPlayerIndex,
      remotePlayerIndex,
      mode,
      roomTransportKind: roomTransportKind ?? "none",
      winner: game.winner,
      combatLocked: game.combatLocked,
      actedThisTurn: game.actedThisTurn,
      currentMessage: game.currentMessage,
      messageQueue: game.messageQueue.map((message) => ({
        kind: message.kind,
        title: message.title,
        detail: message.detail,
      })),
      selectedHandIndexes: [...game.selectedHandIndexes],
      selectedSyllables: game.selectedHandIndexes.map(
        (index) => stableHands[localPlayerIndex][index]?.syllable ?? `missing:${index}`,
      ),
      localHand: [...game.players[localPlayerIndex].hand],
      remoteHand: [...game.players[remotePlayerIndex].hand],
      stableLocalHand: stableHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.syllable,
        skipEntryAnimation: Boolean(card.skipEntryAnimation),
      })),
      stableRemoteHand: stableHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.syllable,
        skipEntryAnimation: Boolean(card.skipEntryAnimation),
      })),
      incomingLocalHand: incomingHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        finalIndex: card.finalIndex,
        finalTotal: card.finalTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        origin: card.origin,
      })),
      incomingRemoteHand: incomingHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        finalIndex: card.finalIndex,
        finalTotal: card.finalTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        origin: card.origin,
      })),
      outgoingLocalHand: outgoingHands[localPlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        destination: card.destination,
        initialIndex: card.initialIndex,
        initialTotal: card.initialTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        destinationMode: card.destinationMode ?? "card-origin",
      })),
      outgoingRemoteHand: outgoingHands[remotePlayerIndex].map((card) => ({
        id: card.id,
        syllable: card.card.syllable,
        destination: card.destination,
        initialIndex: card.initialIndex,
        initialTotal: card.initialTotal,
        delayMs: card.delayMs,
        durationMs: card.durationMs,
        destinationMode: card.destinationMode ?? "card-origin",
      })),
      pendingMulliganDrawCounts: { ...pendingMulliganDrawCountsRef.current },
      pendingMulliganDrawQueues: {
        player: pendingMulliganDrawQueuesRef.current[PLAYER].map((draw) => ({
          syllable: draw.syllable,
          finalIndex: draw.finalIndex,
          finalTotal: draw.finalTotal,
          originOverride: draw.originOverride,
        })),
        enemy: pendingMulliganDrawQueuesRef.current[ENEMY].map((draw) => ({
          syllable: draw.syllable,
          finalIndex: draw.finalIndex,
          finalTotal: draw.finalTotal,
          originOverride: draw.originOverride,
        })),
      },
      incomingTargets: {
        player: incomingTargets[PLAYER].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          origin: target.origin,
          delayMs: target.delayMs,
          durationMs: target.durationMs,
        })),
        enemy: incomingTargets[ENEMY].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          origin: target.origin,
          delayMs: target.delayMs,
          durationMs: target.durationMs,
        })),
      },
      outgoingTargets: {
        player: outgoingTargets[PLAYER].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          impactDestination: target.impactDestination,
          destination: target.destination,
          delayMs: target.delayMs,
          windupMs: target.windupMs,
          attackMs: target.attackMs,
          pauseMs: target.pauseMs,
          exitMs: target.exitMs,
        })),
        enemy: outgoingTargets[ENEMY].map((target) => ({
          id: target.id,
          slotIndex: target.slotIndex,
          name: target.entity.target.name,
          impactDestination: target.impactDestination,
          destination: target.destination,
          delayMs: target.delayMs,
          windupMs: target.windupMs,
          attackMs: target.attackMs,
          pauseMs: target.pauseMs,
          exitMs: target.exitMs,
        })),
      },
      lockedTargetSlots,
      pendingTargetPlacements,
      freshCardIds: [...freshCardIds],
      mulliganDebug,
      battleEvents: battleEventsRef.current.slice(-40),
      debugWatcher: {
        startedAt:
          battleDebugStartedAtRef.current != null
            ? new Date(battleDebugStartedAtRef.current).toISOString()
            : null,
        sampleCount: battleDebugSamplesRef.current.length,
        fallbackCount: animationFallbackHistoryRef.current.length,
        sampleCapacity: 800,
        captureIntervalMs: 300,
        lastSampleAt:
          battleDebugSamplesRef.current.length > 0
            ? new Date(
                battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.at ?? Date.now(),
              ).toISOString()
            : null,
        lastSampleId:
          battleDebugSamplesRef.current.length > 0
            ? battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.id ?? null
            : null,
        lastSampleReason:
          battleDebugSamplesRef.current.length > 0
            ? battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1]?.reason ?? null
            : null,
        lastSignatureLength: battleDebugLastSignatureRef.current.length,
      },
      animationProbe,
      timeDiagnostics: {
        nowIso: new Date().toISOString(),
        turnRemainingMs,
        coinChoiceRemainingMs,
      },
      timerDiagnostics: {
        actionTimerCount: actionTimersRef.current.length,
        visualTimerCount: visualTimersRef.current.length,
      },
      zoneSnapshots: {
        playerDeck: serializeZoneAnchorSnapshot(snapshotZone("playerDeck")),
        enemyDeck: serializeZoneAnchorSnapshot(snapshotZone("enemyDeck")),
        playerTargetDeck: serializeZoneAnchorSnapshot(snapshotZone("playerTargetDeck")),
        enemyTargetDeck: serializeZoneAnchorSnapshot(snapshotZone("enemyTargetDeck")),
        playerFieldSlots: Array.from({ length: CONFIG.targetsInPlay }, (_, index) => ({
          slot: index,
          snapshot: serializeZoneAnchorSnapshot(snapshotZoneSlot("playerField", `slot-${index}`)),
        })),
        enemyFieldSlots: Array.from({ length: CONFIG.targetsInPlay }, (_, index) => ({
          slot: index,
          snapshot: serializeZoneAnchorSnapshot(snapshotZoneSlot("enemyField", `slot-${index}`)),
        })),
      },
      handCardSnapshots: {
        player: stableHands[localPlayerIndex].map((card, index) => ({
          index,
          id: card.id,
          syllable: card.syllable,
          snapshot: serializeZoneAnchorSnapshot(snapshotHandCard(card.id)),
        })),
        enemy: stableHands[remotePlayerIndex].map((card, index) => ({
          index,
          id: card.id,
          syllable: card.syllable,
          snapshot: serializeZoneAnchorSnapshot(snapshotHandCard(card.id)),
        })),
      },
      domDiagnostics: {
        zoneNodeCount: Object.values(zoneNodesRef.current).filter(Boolean).length,
        handCardNodeCount: Object.values(handCardNodesRef.current).filter(Boolean).length,
      },
      laneDebug: {
        hands: { ...handLaneDebugRef.current },
        fields: { ...fieldLaneDebugRef.current },
      },
      rawAnimationAnchors: animations,
      authoritativeSnapshotState: authoritativeBattleSnapshot
        ? {
            turn: authoritativeBattleSnapshot.turn,
            intro: authoritativeBattleSnapshot.openingIntroStep as BattleIntroPhase,
            winner: authoritativeBattleSnapshot.winner,
          }
        : null,
      pendingExternalActionId: pendingExternalAction?.id ?? null,
    };
  }, [
    actionTimersRef,
    animations,
    authoritativeBattleSnapshot,
    battleDebugLastSignatureRef,
    battleDebugSamplesRef,
    battleDebugStartedAtRef,
    battleEventsRef,
    buildFreshAnimationProbeSnapshot,
    coinChoiceRemainingMs,
    fieldLaneDebugRef,
    freshCardIds,
    game,
    getBattleStageMetrics,
    handCardNodesRef,
    handLaneDebugRef,
    incomingHands,
    incomingTargets,
    localPlayerIndex,
    lockedTargetSlots,
    mode,
    mulliganDebug,
    outgoingHands,
    outgoingTargets,
    pendingExternalAction,
    pendingMulliganDrawCountsRef,
    pendingMulliganDrawQueuesRef,
    pendingTargetPlacements,
    remotePlayerIndex,
    roomTransportKind,
    serializeZoneAnchorSnapshot,
    snapshotHandCard,
    snapshotZone,
    snapshotZoneSlot,
    stableHands,
    turnRemainingMs,
    visualTimersRef,
    zoneNodesRef,
    animationFallbackHistoryRef,
  ]);

  const latestFallbackEvent = animationFallbackHistoryRef.current[0] ?? null;
  const battleDebugLatestSample = battleDebugSamplesRef.current[battleDebugSamplesRef.current.length - 1] ?? null;
  const battleDebugWatcherSummary = import.meta.env.DEV
    ? `watch:samples:${battleDebugSamplesRef.current.length} fallbacks:${animationFallbackHistoryRef.current.length} last:${battleDebugLatestSample ? new Date(battleDebugLatestSample.at).toLocaleTimeString("pt-BR", { hour12: false }) : "-"}`
    : "";

  return {
    liveAnimationDebugData,
    buildBattleDevSnapshot,
    latestFallbackEvent,
    battleDebugWatcherSummary,
  };
};
