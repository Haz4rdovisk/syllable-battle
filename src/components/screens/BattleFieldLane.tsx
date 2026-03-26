import React from "react";
import { motion } from "motion/react";
import { Syllable } from "../../types/game";
import { TargetCard, getTravelTargetCardSize, VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";

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
}

export const BattleFieldLane: React.FC<BattleFieldLaneProps> = ({
  presentation,
  containerRef = noopDivRef,
  sectionClassName = "w-full",
  slots,
}) => {
  const incomingRotate = presentation === "player" ? 12 : -12;
  const travelTargetSize = getTravelTargetCardSize();
  const clampMotionScale = (value: number) => Math.min(1.5, Math.max(0.55, value));

  return (
    <section
      data-battle-visual-root="true"
      className={`absolute inset-0 ${sectionClassName}`}
    >
      <div
        ref={containerRef}
        className="mx-auto grid h-full w-full max-w-[var(--battle-board-lane-max-width-mobile)] grid-cols-2 items-stretch justify-items-stretch gap-3 lg:max-w-[var(--battle-board-lane-max-width-desktop)] lg:gap-4"
      >
        {slots.map((slot) => {
          const startX =
            slot.incomingTarget && slot.slotRect
              ? slot.incomingTarget.origin.left + slot.incomingTarget.origin.width / 2 - slot.slotRect.left - travelTargetSize.width / 2
              : 0;
          const startY =
            slot.incomingTarget && slot.slotRect
              ? slot.incomingTarget.origin.top + slot.incomingTarget.origin.height / 2 - slot.slotRect.top - travelTargetSize.height / 2
              : 0;
          const outgoingEndX =
            slot.outgoingTarget && slot.slotRect
              ? slot.outgoingTarget.destination.left +
                slot.outgoingTarget.destination.width / 2 -
                slot.slotRect.left -
                slot.slotRect.width / 2
              : 0;
          const outgoingEndY =
            slot.outgoingTarget && slot.slotRect
              ? slot.outgoingTarget.destination.top +
                slot.outgoingTarget.destination.height / 2 -
                slot.slotRect.top -
                slot.slotRect.height / 2
              : 0;
          const outgoingEndScale =
            slot.outgoingTarget && slot.slotRect
              ? clampMotionScale(
                  Math.min(
                    slot.outgoingTarget.destination.width / Math.max(1, slot.slotRect.width),
                    slot.outgoingTarget.destination.height / Math.max(1, slot.slotRect.height),
                  ),
                )
              : 0.88;
          const outgoingImpactY = presentation === "player" ? -118 : 118;
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
                    x: [0, 0, 0, 0, outgoingEndX],
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
                  className="absolute inset-0 origin-center"
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
                  key={slot.displayedTarget.id}
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
