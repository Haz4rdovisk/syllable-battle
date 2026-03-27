import React from "react";
import { motion } from "motion/react";
import { Syllable } from "../../types/game";
import { TargetCard, getTravelTargetCardSize, VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";
import { getBattleStageDomMetrics, toBattleStageLocalRect } from "./BattleSceneSpace";

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
  slotRect: DOMRect | null;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  canClick: boolean;
  onClick: () => void;
  onIncomingTargetComplete?: (incomingTarget: BattleFieldIncomingTarget) => void;
  onOutgoingTargetComplete?: (outgoingTarget: BattleFieldOutgoingTarget) => void;
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
          const incomingOrigin = getStageLocalRect(slot.incomingTarget?.origin);
          const outgoingDestination = getStageLocalRect(slot.outgoingTarget?.destination);
          const outgoingImpact = getStageLocalRect(slot.outgoingTarget?.impactDestination);
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
          const outgoingTotalMs = slot.outgoingTarget
            ? slot.outgoingTarget.windupMs +
              slot.outgoingTarget.attackMs +
              slot.outgoingTarget.pauseMs +
              slot.outgoingTarget.exitMs
            : 0;

          return (
            <div
              key={slot.key}
              ref={slot.slotRef}
              className="relative flex h-full w-full items-start justify-center overflow-visible"
            >
              {slot.displayedTarget && slot.outgoingTarget && slot.slotRect ? (
                <motion.div
                  key={`${slot.outgoingTarget.id}-outgoing`}
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
                    delay: slot.outgoingTarget.delayMs / 1000,
                    ease: [0.22, 1, 0.36, 1],
                    times: [
                      0,
                      slot.outgoingTarget.windupMs / outgoingTotalMs,
                      (slot.outgoingTarget.windupMs + slot.outgoingTarget.attackMs) / outgoingTotalMs,
                      (slot.outgoingTarget.windupMs + slot.outgoingTarget.attackMs + slot.outgoingTarget.pauseMs) / outgoingTotalMs,
                      1,
                    ],
                  }}
                  onAnimationComplete={() => slot.onOutgoingTargetComplete?.(slot.outgoingTarget!)}
                  className="absolute inset-0 z-30 origin-center"
                >
                  <TargetCard
                    target={slot.displayedTarget.target}
                    selectedCard={presentation === "player" ? slot.selectedCard : null}
                    pendingCard={presentation === "player" ? slot.pendingCard ?? null : null}
                    isPlayerSide={presentation === "player"}
                    canClick={false}
                    onClick={() => {}}
                    playerHand={presentation === "player" ? slot.playerHand ?? [] : []}
                    fitParent
                  />
                </motion.div>
              ) : slot.displayedTarget ? (
                <motion.div
                  key={slot.incomingTarget ? `${slot.displayedTarget.id}-${slot.incomingTarget.id}` : slot.displayedTarget.id}
                  initial={slot.incomingTarget && slot.slotRect ? { opacity: 1, x: startX, y: startY, rotate: incomingRotate, scale: 0.88 } : false}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                  transition={
                    slot.incomingTarget
                      ? { duration: slot.incomingTarget.durationMs / 1000, delay: slot.incomingTarget.delayMs / 1000, ease: [0.22, 1, 0.36, 1] }
                      : { type: "spring", stiffness: 80, damping: 18 }
                  }
                  onAnimationComplete={() => slot.incomingTarget ? slot.onIncomingTargetComplete?.(slot.incomingTarget) : undefined}
                  className="absolute inset-0 origin-center"
                >
                  <TargetCard
                    target={slot.displayedTarget.target}
                    selectedCard={presentation === "player" ? slot.selectedCard : null}
                    pendingCard={presentation === "player" ? slot.pendingCard ?? null : null}
                    isPlayerSide={presentation === "player"}
                    canClick={slot.canClick}
                    onClick={slot.onClick}
                    playerHand={presentation === "player" ? slot.playerHand ?? [] : []}
                    fitParent
                  />
                </motion.div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
