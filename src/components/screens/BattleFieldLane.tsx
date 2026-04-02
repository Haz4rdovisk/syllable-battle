import React from "react";
import { motion } from "motion/react";
import { Syllable } from "../../types/game";
import { TargetCard, getTravelTargetCardSize, VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";
import { getBattleStageDomMetrics, toBattleStageLocalRect } from "./BattleSceneSpace";
import type { BattleTargetScenePhase } from "./BattleTargetField";

const noopDivRef = () => {};

export interface BattleFieldIncomingTarget {
  id: string;
  entity: VisualTargetEntity;
  origin: ZoneAnchorSnapshot;
  delayMs: number;
  durationMs: number;
}

export interface BattleFieldOutgoingTarget {
  id: string;
  side: 0 | 1;
  entity: VisualTargetEntity;
  impactDestination?: ZoneAnchorSnapshot | null;
  destination: ZoneAnchorSnapshot;
  delayMs: number;
  windupMs: number;
  attackMs: number;
  pauseMs: number;
  exitMs: number;
}

export interface BattleFieldLaneSlot {
  key: string;
  slotRef: (node: HTMLDivElement | null) => void;
  displayedTarget: VisualTargetEntity | null;
  incomingTarget: BattleFieldIncomingTarget | null;
  outgoingTarget?: BattleFieldOutgoingTarget | null;
  renderNodes?: BattleFieldLaneRenderNode[];
  slotRect: DOMRect | null;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  canClick: boolean;
  onClick: () => void;
  onIncomingTargetComplete?: (incomingTarget: BattleFieldIncomingTarget) => void;
  onOutgoingTargetComplete?: (outgoingTarget: BattleFieldOutgoingTarget) => void;
  playerHand?: Syllable[];
}

export interface BattleFieldLaneRenderNode {
  key: string;
  phase: BattleTargetScenePhase;
  entity: VisualTargetEntity;
  incomingTarget: BattleFieldIncomingTarget | null;
  outgoingTarget: BattleFieldOutgoingTarget | null;
  zIndex: number;
  canClick: boolean;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  playerHand?: Syllable[];
}

interface BattleFieldLaneProps {
  presentation: "player" | "enemy";
  containerRef?: (node: HTMLDivElement | null) => void;
  sectionClassName?: string;
  slots: BattleFieldLaneSlot[];
  onDebugSnapshot?: (snapshot: BattleFieldLaneDebugSnapshot) => void;
}

export interface BattleFieldLaneDebugSnapshot {
  presentation: "player" | "enemy";
  containerRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  travelTargetSize: {
    width: number;
    height: number;
  };
    slots: Array<{
      key: string;
      displayedTargetName: string | null;
      renderNodePhases: BattleTargetScenePhase[];
      slotRect: {
        left: number;
        top: number;
      width: number;
      height: number;
    } | null;
    selectedCard: Syllable | null;
    pendingCard: Syllable | null | undefined;
    incoming: {
      id: string;
      origin: ZoneAnchorSnapshot;
      delayMs: number;
      durationMs: number;
      startX: number;
      startY: number;
      rotate: number;
    } | null;
    outgoing: {
      id: string;
      destination: ZoneAnchorSnapshot;
      impactDestination: ZoneAnchorSnapshot | null | undefined;
      delayMs: number;
      windupMs: number;
      attackMs: number;
      pauseMs: number;
      exitMs: number;
      impactX: number;
      impactY: number;
      endX: number;
      endY: number;
      endScale: number;
    } | null;
  }>;
}

export const BattleFieldLane: React.FC<BattleFieldLaneProps> = ({
  presentation,
  containerRef = noopDivRef,
  sectionClassName = "w-full",
  slots,
  onDebugSnapshot,
}) => {
  const incomingRotate = presentation === "player" ? 12 : -12;
  const travelTargetSize = getTravelTargetCardSize();
  const clampMotionScale = (value: number) => Math.min(1.5, Math.max(0.55, value));
  const containerNodeRef = React.useRef<HTMLDivElement | null>(null);
  const getStageLocalRect = <T extends { left: number; top: number; width: number; height: number }>(
    rect: T | null | undefined,
  ) => toBattleStageLocalRect(rect, getBattleStageDomMetrics(containerNodeRef.current));
  const fieldLaneDebugSnapshot = React.useMemo<BattleFieldLaneDebugSnapshot>(
    () => ({
      presentation,
      containerRect: containerNodeRef.current
        ? {
            left: Math.round(containerNodeRef.current.getBoundingClientRect().left),
            top: Math.round(containerNodeRef.current.getBoundingClientRect().top),
            width: Math.round(containerNodeRef.current.getBoundingClientRect().width),
            height: Math.round(containerNodeRef.current.getBoundingClientRect().height),
          }
        : null,
      travelTargetSize,
      slots: slots.map((slot) => {
        const slotRect = getStageLocalRect(slot.slotRect);
        const incomingOrigin = getStageLocalRect(slot.incomingTarget?.origin);
        const outgoingDestination = getStageLocalRect(slot.outgoingTarget?.destination);
        const outgoingImpact = getStageLocalRect(slot.outgoingTarget?.impactDestination);
        const renderNodePhases = slot.renderNodes?.map((node) => node.phase) ?? [];
        const startX =
          incomingOrigin && slotRect
            ? incomingOrigin.left +
              incomingOrigin.width / 2 -
              slotRect.left -
              travelTargetSize.width / 2
            : 0;
        const startY =
          incomingOrigin && slotRect
            ? incomingOrigin.top +
              incomingOrigin.height / 2 -
              slotRect.top -
              travelTargetSize.height / 2
            : 0;
        const endX =
          outgoingDestination && slotRect
            ? outgoingDestination.left +
              outgoingDestination.width / 2 -
              slotRect.left -
              slotRect.width / 2
            : 0;
        const endY =
          outgoingDestination && slotRect
            ? outgoingDestination.top +
              outgoingDestination.height / 2 -
              slotRect.top -
              slotRect.height / 2
            : 0;
        const endScale =
          outgoingDestination && slotRect
            ? clampMotionScale(
                Math.min(
                  outgoingDestination.width / Math.max(1, slotRect.width),
                  outgoingDestination.height / Math.max(1, slotRect.height),
                ),
              )
            : 0.88;
        const impactX =
          outgoingImpact && slotRect
            ? outgoingImpact.left +
              outgoingImpact.width / 2 -
              slotRect.left -
              slotRect.width / 2
            : 0;
        const impactY =
          outgoingImpact && slotRect
            ? outgoingImpact.top +
              outgoingImpact.height / 2 -
              slotRect.top -
              slotRect.height / 2
            : presentation === "player"
              ? -118
              : 118;
        return {
          key: slot.key,
          displayedTargetName: slot.displayedTarget?.target.name ?? null,
          renderNodePhases,
          slotRect: slot.slotRect
            ? {
                left: Math.round(slot.slotRect.left),
                top: Math.round(slot.slotRect.top),
                width: Math.round(slot.slotRect.width),
                height: Math.round(slot.slotRect.height),
              }
            : null,
          selectedCard: slot.selectedCard,
          pendingCard: slot.pendingCard,
          incoming: slot.incomingTarget
            ? {
                id: slot.incomingTarget.id,
                origin: slot.incomingTarget.origin,
                delayMs: slot.incomingTarget.delayMs,
                durationMs: slot.incomingTarget.durationMs,
                startX,
                startY,
                rotate: incomingRotate,
              }
            : null,
          outgoing: slot.outgoingTarget
            ? {
                id: slot.outgoingTarget.id,
                destination: slot.outgoingTarget.destination,
                impactDestination: slot.outgoingTarget.impactDestination,
                delayMs: slot.outgoingTarget.delayMs,
                windupMs: slot.outgoingTarget.windupMs,
                attackMs: slot.outgoingTarget.attackMs,
                pauseMs: slot.outgoingTarget.pauseMs,
                exitMs: slot.outgoingTarget.exitMs,
                impactX,
                impactY,
                endX,
                endY,
                endScale,
              }
            : null,
        };
      }),
    }),
    [incomingRotate, presentation, slots, travelTargetSize],
  );

  React.useEffect(() => {
    onDebugSnapshot?.(fieldLaneDebugSnapshot);
  }, [fieldLaneDebugSnapshot, onDebugSnapshot]);

  return (
    <section
      data-battle-visual-root="true"
      className={`absolute inset-0 ${sectionClassName}`}
    >
      <div
        ref={(node) => {
          containerNodeRef.current = node;
          containerRef(node);
        }}
        className="mx-auto grid h-full w-full max-w-[var(--battle-board-lane-max-width-mobile)] grid-cols-2 items-stretch justify-items-stretch gap-3 lg:max-w-[var(--battle-board-lane-max-width-desktop)] lg:gap-4"
      >
        {slots.map((slot) => {
          const slotRect = getStageLocalRect(slot.slotRect);
          const renderNodes = slot.renderNodes ?? (slot.displayedTarget
            ? [{
                key: slot.outgoingTarget
                  ? `${slot.outgoingTarget.id}-outgoing`
                  : slot.incomingTarget
                    ? `${slot.displayedTarget.id}-${slot.incomingTarget.id}`
                    : slot.displayedTarget.id,
                phase: slot.outgoingTarget
                  ? (slot.outgoingTarget.impactDestination ? "attack" : "exit")
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
                playerHand: slot.playerHand ?? [],
              }]
            : []);

          return (
            <div
              key={slot.key}
              ref={slot.slotRef}
              className="relative flex h-full w-full items-start justify-center overflow-visible"
            >
              {renderNodes.map((node) => {
                const incomingOrigin = getStageLocalRect(node.incomingTarget?.origin);
                const outgoingDestination = getStageLocalRect(node.outgoingTarget?.destination);
                const outgoingImpact = getStageLocalRect(node.outgoingTarget?.impactDestination);
                const startX =
                  incomingOrigin && slotRect
                    ? incomingOrigin.left + incomingOrigin.width / 2 - slotRect.left - travelTargetSize.width / 2
                    : 0;
                const startY =
                  incomingOrigin && slotRect
                    ? incomingOrigin.top + incomingOrigin.height / 2 - slotRect.top - travelTargetSize.height / 2
                    : 0;
                const outgoingEndX =
                  outgoingDestination && slotRect
                    ? outgoingDestination.left +
                      outgoingDestination.width / 2 -
                      slotRect.left -
                      slotRect.width / 2
                    : 0;
                const outgoingEndY =
                  outgoingDestination && slotRect
                    ? outgoingDestination.top +
                      outgoingDestination.height / 2 -
                      slotRect.top -
                      slotRect.height / 2
                    : 0;
                const outgoingEndScale =
                  outgoingDestination && slotRect
                    ? clampMotionScale(
                        Math.min(
                          outgoingDestination.width / Math.max(1, slotRect.width),
                          outgoingDestination.height / Math.max(1, slotRect.height),
                        ),
                      )
                    : 0.88;
                const outgoingImpactX =
                  outgoingImpact && slotRect
                    ? outgoingImpact.left +
                      outgoingImpact.width / 2 -
                      slotRect.left -
                      slotRect.width / 2
                    : 0;
                const outgoingImpactY =
                  outgoingImpact && slotRect
                    ? outgoingImpact.top +
                      outgoingImpact.height / 2 -
                      slotRect.top -
                      slotRect.height / 2
                    : presentation === "player"
                      ? -118
                      : 118;
                const outgoingImpactRotate = presentation === "player" ? -8 : 8;
                const outgoingEndRotate = presentation === "player" ? 10 : -10;
                const outgoingTotalMs = node.outgoingTarget
                  ? node.outgoingTarget.windupMs +
                    node.outgoingTarget.attackMs +
                    node.outgoingTarget.pauseMs +
                    node.outgoingTarget.exitMs
                  : 0;

                if (node.outgoingTarget && slotRect) {
                  return (
                    <motion.div
                      key={node.key}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                      animate={{
                        opacity: [1, 1, 1, 1, 1],
                        x: [0, 0, outgoingImpactX, outgoingImpactX, outgoingEndX],
                        y: [0, 0, outgoingImpactY, outgoingImpactY, outgoingEndY],
                        rotate: [0, 0, outgoingImpactRotate, outgoingImpactRotate, outgoingEndRotate],
                        scale: [1, 1, 1.02, 1.02, outgoingEndScale],
                      }}
                      transition={{
                        duration: outgoingTotalMs / 1000,
                        delay: node.outgoingTarget.delayMs / 1000,
                        ease: [0.22, 1, 0.36, 1],
                        times: [
                          0,
                          node.outgoingTarget.windupMs / outgoingTotalMs,
                          (node.outgoingTarget.windupMs + node.outgoingTarget.attackMs) / outgoingTotalMs,
                          (node.outgoingTarget.windupMs + node.outgoingTarget.attackMs + node.outgoingTarget.pauseMs) / outgoingTotalMs,
                          1,
                        ],
                      }}
                      onAnimationComplete={() => slot.onOutgoingTargetComplete?.(node.outgoingTarget!)}
                      className="absolute inset-0 origin-center"
                      style={{ zIndex: node.zIndex }}
                    >
                      <TargetCard
                        target={node.entity.target}
                        selectedCard={presentation === "player" ? node.selectedCard : null}
                        pendingCard={presentation === "player" ? node.pendingCard ?? null : null}
                        isPlayerSide={presentation === "player"}
                        canClick={false}
                        onClick={() => {}}
                        playerHand={presentation === "player" ? node.playerHand ?? [] : []}
                        fitParent
                      />
                    </motion.div>
                  );
                }

                const initialIncoming =
                  node.incomingTarget && slotRect
                    ? { opacity: 1, x: startX, y: startY, rotate: incomingRotate, scale: 0.88 }
                    : false;
                const transition =
                  node.incomingTarget
                    ? {
                        duration: node.incomingTarget.durationMs / 1000,
                        delay: node.incomingTarget.delayMs / 1000,
                        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                      }
                    : { type: "spring" as const, stiffness: 80, damping: 18 };

                return (
                  <motion.div
                    key={node.key}
                    initial={initialIncoming}
                    animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                    transition={transition}
                    onAnimationComplete={() =>
                      node.incomingTarget
                        ? slot.onIncomingTargetComplete?.(node.incomingTarget)
                        : undefined
                    }
                    className="absolute inset-0 origin-center"
                    style={{ zIndex: node.zIndex }}
                  >
                    <TargetCard
                      target={node.entity.target}
                      selectedCard={presentation === "player" ? node.selectedCard : null}
                      pendingCard={presentation === "player" ? node.pendingCard ?? null : null}
                      isPlayerSide={presentation === "player"}
                      canClick={node.canClick}
                      onClick={node.canClick ? slot.onClick : () => {}}
                      playerHand={presentation === "player" ? node.playerHand ?? [] : []}
                      fitParent
                    />
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
};
