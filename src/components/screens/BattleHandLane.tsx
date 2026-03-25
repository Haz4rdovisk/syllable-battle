import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GameState, Syllable } from "../../types/game";
import { canPlace } from "../../logic/gameLogic";
import { CardBackCard, getTravelSyllableCardSize, SyllableCard } from "../game/GameComponents";
import { cn } from "../../lib/utils";
import { getEnemyHandLayout, getPlayerHandLayout } from "./battleFlow";

const HAND_LAYOUT_SLOT_COUNT = 5;

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

export interface BattleHandLaneProps {
  side?: 0 | 1;
  presentation: "local" | "remote";
  stableCards?: BattleHandLaneCard[];
  incomingCards?: BattleHandLaneIncomingCard[];
  scale: "desktop" | "mobile";
  pulse?: boolean;
  anchorRef?: React.Ref<HTMLDivElement>;
  onIncomingCardComplete?: (incomingCard: BattleHandLaneIncomingCard) => void;
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
  onIncomingCardComplete,
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
  const totalCards = Math.min(HAND_LAYOUT_SLOT_COUNT, stableCards.length + incomingCards.length);
  const getLayout = isLocalPresentation ? getPlayerHandLayout : getEnemyHandLayout;
  const sizePreset = isDesktop ? "hand-desktop" : "hand-mobile";
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
                className={cn("absolute bottom-0", isLocalPresentation && "cursor-pointer")}
                style={{
                  bottom: `${bottomOffset}px`,
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
            const cardSize = getTravelSyllableCardSize();
            const layout = getLayout(
              incomingCard.finalTotal,
              incomingCard.finalIndex,
              isDesktop,
              laneWidth,
            );
            const startX = incomingCard.origin.left + incomingCard.origin.width / 2 - hostRect.left - cardSize.width / 2;
            const startY = incomingCard.origin.top + incomingCard.origin.height / 2 - hostRect.top - cardSize.height / 2;
            const endX = hostRect.width / 2 - cardSize.width / 2 + layout.x;
            const endY = hostRect.height - bottomOffset - cardSize.height + layout.y;

            return (
              <motion.div
                key={incomingCard.id}
                initial={{ x: startX, y: startY, rotate: 0, scale: 0.94, opacity: 0 }}
                animate={{ x: endX, y: endY, rotate: layout.rotate, scale: 1, opacity: 1 }}
                transition={{
                  delay: incomingCard.delayMs / 1000,
                  duration: incomingCard.durationMs / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={() => onIncomingCardComplete?.(incomingCard)}
                className="pointer-events-none absolute left-0 top-0 z-[120]"
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
      </div>
    </motion.div>
  );
};
