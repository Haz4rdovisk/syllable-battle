import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GameState, Syllable } from "../../types/game";
import { canPlace } from "../../logic/gameLogic";
import { CardBackCard, SyllableCard } from "../game/GameComponents";
import { cn } from "../../lib/utils";
import { getBattleHandLayout } from "./battleFlow";

const HAND_LAYOUT_SLOT_COUNT = 5;
const clampScale = (value: number, min = 0.72, max = 1.24) =>
  Math.min(max, Math.max(min, value));

export interface BattleHandLaneCard {
  id: string;
  syllable: Syllable;
  side: 0 | 1;
  hidden: boolean;
  skipEntryAnimation?: boolean;
}

export interface BattleHandLaneIncomingCard {
  id: string;
  side: 0 | 1;
  card: BattleHandLaneCard;
  origin: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  finalIndex: number;
  finalTotal: number;
  delayMs: number;
  durationMs: number;
}

export interface BattleHandLaneOutgoingCard {
  id: string;
  side: 0 | 1;
  card: BattleHandLaneCard;
  destination: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  initialIndex: number;
  initialTotal: number;
  delayMs: number;
  durationMs: number;
}

export interface BattleHandLaneProps {
  side?: 0 | 1;
  presentation: "local" | "remote";
  stableCards?: BattleHandLaneCard[];
  incomingCards?: BattleHandLaneIncomingCard[];
  outgoingCards?: BattleHandLaneOutgoingCard[];
  reservedSlots?: number;
  scale: "desktop" | "mobile";
  pulse?: boolean;
  anchorRef?: React.Ref<HTMLDivElement>;
  onIncomingCardComplete?: (incomingCard: BattleHandLaneIncomingCard) => void;
  onOutgoingCardComplete?: (outgoingCard: BattleHandLaneOutgoingCard) => void;
  hoveredCardIndex?: number | null;
  onHoverCard?: (index: number | null) => void;
  selectedIndexes?: number[];
  canInteract?: boolean;
  showTurnHighlights?: boolean;
  showPlayableHints?: boolean;
  targets?: GameState["players"][0]["targets"];
  onCardClick?: (index: number) => void;
  freshCardIds?: string[];
  bindCardRef?: (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => void;
}

export const BattleHandLane: React.FC<BattleHandLaneProps> = ({
  side = 0,
  presentation,
  stableCards = [],
  scale,
  pulse = false,
  anchorRef,
  incomingCards = [],
  outgoingCards = [],
  reservedSlots = 0,
  onIncomingCardComplete,
  onOutgoingCardComplete,
  hoveredCardIndex = null,
  onHoverCard,
  selectedIndexes = [],
  canInteract = false,
  showTurnHighlights = false,
  showPlayableHints = false,
  targets = [],
  onCardClick,
  freshCardIds = [],
  bindCardRef,
}) => {
  void side;
  const isLocalPresentation = presentation === "local";
  const isDesktop = scale === "desktop";
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [laneWidth, setLaneWidth] = useState<number | null>(null);
  const [laneHeight, setLaneHeight] = useState<number | null>(null);
  const totalCards = Math.min(
    HAND_LAYOUT_SLOT_COUNT,
    stableCards.length + incomingCards.length + Math.max(0, reservedSlots),
  );
  const getLayout = (total: number, index: number, desktop: boolean, width?: number | null) =>
    getBattleHandLayout(presentation, total, index, desktop, width);
  const sizePreset = isDesktop ? "hand-desktop" : "hand-mobile";
  const cardWidth = isDesktop ? 110 : 86;
  const cardBaseHeight = isDesktop ? 150 : 120;
  const resolvedLaneHeight = laneWidth
    ? Math.min(
        isDesktop ? 176 : 140,
        Math.max(
          isDesktop ? 132 : 106,
          laneWidth * (isDesktop ? 0.18 : 0.24),
        ),
      )
    : isDesktop
      ? 150
      : 120;
  const laneVars = {
    "--battle-hand-height": `${resolvedLaneHeight}px`,
    "--battle-hand-padding-x": `${isDesktop ? 12 : 8}px`,
  } as React.CSSProperties;

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const updateMetrics = () => {
      setLaneWidth(node.clientWidth);
      setLaneHeight(node.clientHeight);
    };

    updateMetrics();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layoutBounds =
    totalCards > 0
      ? Array.from({ length: totalCards }, (_, index) =>
          getLayout(totalCards, index, isDesktop, laneWidth),
        ).reduce(
          (acc, layout) => ({
            minY: Math.min(acc.minY, layout.y),
            maxY: Math.max(acc.maxY, layout.y),
          }),
          {
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
          },
        )
      : { minY: 0, maxY: 0 };

  const hostHeight = laneHeight ?? (isDesktop ? 192 : 160);
  const bottomOffset =
    totalCards > 0
      ? Math.max(
          0,
          hostHeight / 2 -
            cardBaseHeight / 2 +
            (layoutBounds.minY + layoutBounds.maxY) / 2,
        )
      : 0;

  return (
    <motion.div
      animate={pulse ? { y: [0, -6, 0], rotate: [0, 1, 0] } : {}}
      transition={{ duration: 0.62, ease: "easeOut" }}
      className="relative h-full w-full min-h-0 overflow-visible"
      style={{
        minHeight: `var(--battle-hand-height)`,
        ...laneVars,
      }}
    >
      <div
        ref={(node) => {
          hostRef.current = node;
          if (typeof anchorRef === "function") anchorRef(node);
        }}
        className="relative flex h-full w-full items-end justify-center overflow-visible"
        style={{
          paddingInline: `var(--battle-hand-padding-x)`,
        }}
      >
        <AnimatePresence>
          {stableCards.map((card, i) => {
            const layout = getLayout(totalCards, i, isDesktop, laneWidth);
            const selected = selectedIndexes.includes(i);
            const playable = isLocalPresentation ? targets.some((target) => canPlace(card.syllable, target)) : false;

            return (
              <motion.div
                key={card.id}
                initial={
                  card.skipEntryAnimation
                    ? false
                    : isLocalPresentation
                      ? { x: 600, y: 0, opacity: 0, rotate: 90, scale: 1 }
                      : { x: 0, y: -60, opacity: 0, rotate: layout.rotate, scale: 0.9 }
                }
                animate={{
                  x: layout.x,
                  y: isLocalPresentation && selected ? (isDesktop ? -28 : -18) : layout.y,
                  rotate: layout.rotate,
                  opacity: 1,
                  scale: isLocalPresentation && hoveredCardIndex === i ? 1.14 : 1,
                }}
                exit={{ opacity: 0, transition: { duration: 0.01 } }}
                transition={{ type: "spring", stiffness: 82, damping: 22 }}
                onMouseEnter={() => onHoverCard?.(i)}
                onMouseLeave={() => onHoverCard?.(null)}
                ref={bindCardRef?.(card.id, scale)}
                className={cn("absolute left-0 top-0", isLocalPresentation && "cursor-pointer")}
                style={{
                  left: `calc(50% - ${cardWidth / 2}px)`,
                  top: `calc(100% - ${bottomOffset + cardBaseHeight}px)`,
                  zIndex: isLocalPresentation && hoveredCardIndex === i ? 100 : i,
                }}
              >
                {isLocalPresentation ? (
                  <SyllableCard
                    syllable={card.syllable}
                    selected={selected}
                    playable={playable && showPlayableHints}
                    newlyDrawn={freshCardIds.includes(card.id) && showTurnHighlights}
                    attentionPulse={playable && showPlayableHints}
                    disabled={!canInteract}
                    onClick={() => onCardClick?.(i)}
                    sizePreset={sizePreset}
                  />
                ) : (
                  <CardBackCard sizePreset={sizePreset} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hostRef.current &&
          incomingCards.map((incomingCard) => {
            const hostRect = hostRef.current!.getBoundingClientRect();
            const cardSize = isDesktop
              ? { width: 110, height: 150 }
              : { width: 86, height: 120 };
            const layout = getLayout(
              incomingCard.finalTotal,
              incomingCard.finalIndex,
              isDesktop,
              laneWidth,
            );
            const deckExitX =
              incomingCard.origin.left +
              incomingCard.origin.width / 2 -
              hostRect.left -
              cardSize.width / 2;
            const deckExitY =
              incomingCard.origin.top +
              Math.max(8, incomingCard.origin.height * 0.14) -
              hostRect.top -
              cardSize.height * 0.18;
            const baseLeft = hostRect.width / 2 - cardSize.width / 2;
            const baseTop = hostRect.height - bottomOffset - cardSize.height;
            const startX = deckExitX - baseLeft;
            const startY = deckExitY - baseTop;
            const startScale =
              cardSize.width > 0 && cardSize.height > 0
                ? clampScale(
                    Math.min(
                      incomingCard.origin.width / cardSize.width,
                      incomingCard.origin.height / cardSize.height,
                    ),
                  )
                : 0.92;
            const startRotate = isLocalPresentation ? 3 : -3;
            return (
              <motion.div
                key={incomingCard.id}
                className="pointer-events-none absolute left-0 top-0 z-[120]"
                style={{
                  left: `calc(50% - ${cardSize.width / 2}px)`,
                  top: `calc(100% - ${bottomOffset + cardSize.height}px)`,
                }}
                initial={{
                  x: startX,
                  y: startY,
                  rotate: startRotate,
                  scale: startScale,
                  opacity: 0,
                }}
                animate={{
                  x: layout.x,
                  y: layout.y,
                  rotate: layout.rotate,
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: incomingCard.delayMs / 1000,
                  duration: incomingCard.durationMs / 1000,
                  ease: [0.18, 0.9, 0.22, 1],
                }}
                onAnimationComplete={() => onIncomingCardComplete?.(incomingCard)}
              >
                {isLocalPresentation ? (
                  <SyllableCard
                    syllable={incomingCard.card.syllable}
                    selected={false}
                    playable={showPlayableHints}
                    newlyDrawn={showTurnHighlights}
                    attentionPulse={false}
                    floating={true}
                    disabled={true}
                    onClick={() => {}}
                    sizePreset={sizePreset}
                  />
                ) : (
                  <CardBackCard floating={true} sizePreset={sizePreset} />
                )}
              </motion.div>
            );
          })}

        {hostRef.current &&
          outgoingCards.map((outgoingCard) => {
            const hostRect = hostRef.current!.getBoundingClientRect();
            const cardSize = isDesktop
              ? { width: 110, height: 150 }
              : { width: 86, height: 120 };
            const layout = getLayout(
              outgoingCard.initialTotal,
              outgoingCard.initialIndex,
              isDesktop,
              laneWidth,
            );
            const deckBottomX =
              outgoingCard.destination.left +
              outgoingCard.destination.width / 2 -
              hostRect.left -
              cardSize.width / 2;
            const deckBottomY =
              outgoingCard.destination.top +
              outgoingCard.destination.height -
              Math.max(10, outgoingCard.destination.height * 0.16) -
              hostRect.top -
              cardSize.height * 0.82;
            const baseLeft = hostRect.width / 2 - cardSize.width / 2;
            const baseTop = hostRect.height - bottomOffset - cardSize.height;
            const endX = deckBottomX - baseLeft;
            const endY = deckBottomY - baseTop;
            return (
              <motion.div
                key={outgoingCard.id}
                className="pointer-events-none absolute left-0 top-0 z-[118]"
                style={{
                  left: `calc(50% - ${cardSize.width / 2}px)`,
                  top: `calc(100% - ${bottomOffset + cardSize.height}px)`,
                }}
                initial={{
                  x: layout.x,
                  y: layout.y,
                  rotate: layout.rotate,
                  scale: 1,
                  opacity: 1,
                }}
                animate={{
                  x: endX,
                  y: endY,
                  rotate: isLocalPresentation ? 4 : -4,
                  scale: clampScale(
                    Math.min(
                      outgoingCard.destination.width / cardSize.width,
                      outgoingCard.destination.height / cardSize.height,
                    ),
                  ),
                  opacity: 1,
                }}
                transition={{
                  delay: outgoingCard.delayMs / 1000,
                  duration: outgoingCard.durationMs / 1000,
                  ease: [0.18, 0.9, 0.22, 1],
                }}
                onAnimationComplete={() => onOutgoingCardComplete?.(outgoingCard)}
              >
                {isLocalPresentation ? (
                  <SyllableCard
                    syllable={outgoingCard.card.syllable}
                    selected={false}
                    playable={false}
                    newlyDrawn={false}
                    attentionPulse={false}
                    floating={true}
                    disabled={true}
                    onClick={() => {}}
                    sizePreset={sizePreset}
                  />
                ) : (
                  <CardBackCard floating={true} sizePreset={sizePreset} />
                )}
              </motion.div>
            );
          })}
      </div>
    </motion.div>
  );
};
