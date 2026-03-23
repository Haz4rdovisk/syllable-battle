import React from "react";
import { motion } from "motion/react";
import { Syllable } from "../../types/game";
import { TargetCard, TRAVEL_TARGET_CARD_SIZE, VisualTargetEntity, ZoneAnchorSnapshot } from "../game/GameComponents";

export interface BattleFieldIncomingTarget {
  id: string;
  entity: VisualTargetEntity;
  origin: ZoneAnchorSnapshot;
  delayMs: number;
  durationMs: number;
}

export interface BattleFieldLaneSlot {
  key: string;
  slotRef: (node: HTMLDivElement | null) => void;
  displayedTarget: VisualTargetEntity | null;
  incomingTarget: BattleFieldIncomingTarget | null;
  slotRect: DOMRect | null;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  canClick: boolean;
  onClick: () => void;
  onIncomingTargetComplete?: (incomingTarget: BattleFieldIncomingTarget) => void;
  playerHand?: Syllable[];
}

interface BattleFieldLaneProps {
  presentation: "player" | "enemy";
  containerRef: (node: HTMLDivElement | null) => void;
  sectionClassName: string;
  slots: BattleFieldLaneSlot[];
}

export const BattleFieldLane: React.FC<BattleFieldLaneProps> = ({
  presentation,
  containerRef,
  sectionClassName,
  slots,
}) => {
  const incomingRotate = presentation === "player" ? 12 : -12;

  return (
    <section className={sectionClassName}>
      <div
        ref={containerRef}
        className="mx-auto grid w-full max-w-[300px] grid-cols-2 place-items-start justify-items-center gap-3 lg:max-w-[380px] lg:gap-5"
      >
        {slots.map((slot) => {
          const startX =
            slot.incomingTarget && slot.slotRect
              ? slot.incomingTarget.origin.left + slot.incomingTarget.origin.width / 2 - slot.slotRect.left - TRAVEL_TARGET_CARD_SIZE.width / 2
              : 0;
          const startY =
            slot.incomingTarget && slot.slotRect
              ? slot.incomingTarget.origin.top + slot.incomingTarget.origin.height / 2 - slot.slotRect.top - TRAVEL_TARGET_CARD_SIZE.height / 2
              : 0;

          return (
            <div
              key={slot.key}
              ref={slot.slotRef}
              className="relative flex min-h-[clamp(164px,20vh,220px)] w-[clamp(108px,13.5vw,156px)] items-start justify-center overflow-visible"
            >
              {slot.displayedTarget ? (
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
                  className="absolute left-0 top-0 origin-center"
                >
                  <TargetCard
                    target={slot.displayedTarget.target}
                    selectedCard={presentation === "player" ? slot.selectedCard : null}
                    pendingCard={presentation === "player" ? slot.pendingCard ?? null : null}
                    isPlayerSide={presentation === "player"}
                    canClick={slot.canClick}
                    onClick={slot.onClick}
                    playerHand={presentation === "player" ? slot.playerHand ?? [] : []}
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
