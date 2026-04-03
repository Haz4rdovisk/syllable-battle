import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { GameState, Syllable } from "../../types/game";
import { canPlace } from "../../logic/gameLogic";
import { CardBackCard, SyllableCard } from "../game/GameComponents";
import {
  BattleCardBackPresetId,
  DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
} from "../game/battleCardStackVisuals";
import { cn } from "../../lib/utils";
import { getBattleHandFrame, getBattleHandLayout } from "./battleFlow";
import { getBattleStageDomMetrics, toBattleStageLocalRect } from "./BattleSceneSpace";
import { BattleTravelLayerContext } from "./BattleTravelLayer";
import {
  getBattleHandIncomingTravelMotion,
  getBattleHandOutgoingTravelMotion,
} from "./battleHandTravelGeometry";

const HAND_LAYOUT_SLOT_COUNT = 5;
const clampHandSceneScale = (value: number) => Math.max(0.6, value);

export interface BattleHandLaneCard {
  id: string;
  syllable: Syllable;
  cardId?: string;
  runtimeCardId?: string;
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
  initialSnapshot?: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
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
  destinationMode?: "deck-bottom" | "zone-center";
  endRotate?: number;
  endScale?: number;
  targetSlotIndex?: number;
  pendingCardRevealDelayMs?: number;
}

export interface BattleHandLaneProps {
  side?: 0 | 1;
  presentation: "local" | "remote";
  stableCards?: BattleHandLaneCard[];
  incomingCards?: BattleHandLaneIncomingCard[];
  outgoingCards?: BattleHandLaneOutgoingCard[];
  reservedSlots?: number;
  scale: "desktop" | "mobile";
  cardBackPresetId?: BattleCardBackPresetId;
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
  onDebugSnapshot?: (snapshot: BattleHandLaneDebugSnapshot) => void;
}

export interface BattleHandLaneDebugSnapshot {
  presentation: "local" | "remote";
  scale: "desktop" | "mobile";
  totalCards: number;
  reservedSlots: number;
  laneWidth: number | null;
  laneHeight: number | null;
  hostHeight: number;
  bottomOffset: number;
  cardSize: {
    width: number;
    baseHeight: number;
  };
  layoutBounds: {
    minY: number;
    maxY: number;
  };
  hostRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  stableCards: Array<{
    index: number;
    id: string;
    syllable: Syllable;
    layout: ReturnType<typeof getBattleHandLayout>;
    selected: boolean;
    hovered: boolean;
    newlyDrawn: boolean;
  }>;
  incomingCards: Array<{
    id: string;
    syllable: Syllable;
    finalIndex: number;
    finalTotal: number;
    delayMs: number;
    durationMs: number;
    origin: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    layout: ReturnType<typeof getBattleHandLayout>;
    motion: {
      baseLeft: number;
      baseTop: number;
      portalBaseLeft: number;
      portalBaseTop: number;
      deckExitX: number;
      deckExitY: number;
      startX: number;
      startY: number;
      slotX: number;
      slotY: number;
      startScale: number;
      startRotate: number;
    } | null;
  }>;
  outgoingCards: Array<{
    id: string;
    syllable: Syllable;
    initialIndex: number;
    initialTotal: number;
    delayMs: number;
    durationMs: number;
    destinationMode: "deck-bottom" | "zone-center";
    destination: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    layout: ReturnType<typeof getBattleHandLayout>;
    motion: {
      baseLeft: number;
      baseTop: number;
      portalBaseLeft: number;
      portalBaseTop: number;
      destinationCenterX: number;
      destinationCenterY: number;
      deckBottomX: number;
      deckBottomY: number;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      slotX: number;
      slotY: number;
      initialScale: number;
      endScale: number;
    } | null;
  }>;
}

type BattleHandLayoutSnapshot = ReturnType<typeof getBattleHandLayout>;

interface BattleHandIncomingTravelDescriptor {
  incomingCard: BattleHandLaneIncomingCard;
  layout: BattleHandLayoutSnapshot;
  motion: ReturnType<typeof getBattleHandIncomingTravelMotion> | null;
}

interface BattleHandOutgoingTravelDescriptor {
  outgoingCard: BattleHandLaneOutgoingCard;
  layout: BattleHandLayoutSnapshot;
  destinationMode: "deck-bottom" | "zone-center";
  motion: ReturnType<typeof getBattleHandOutgoingTravelMotion> | null;
}

const areNumberArraysEqual = (left: number[], right: number[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

interface BattleHandStableCardVisualState {
  initial: false | { x: number; y: number; opacity: number; rotate: number; scale: number };
  animate: { x: number; y: number; rotate: number; opacity: number; scale: number };
  zIndex: number;
}

export function getBattleHandStableCardVisualState(params: {
  card: BattleHandLaneCard;
  layout: BattleHandLayoutSnapshot;
  isDesktop: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isLocalPresentation: boolean;
  baseZIndex: number;
}): BattleHandStableCardVisualState {
  const { card, layout, isDesktop, isSelected, isHovered, isLocalPresentation, baseZIndex } = params;
  const hoveredY = isLocalPresentation && isHovered ? (isDesktop ? -18 : -12) : layout.y;
  const stableY = isLocalPresentation && isSelected ? (isDesktop ? -28 : -18) : hoveredY;
  const stableScale = isSelected ? 1.14 : isHovered ? 1.04 : 1;
  return {
    initial:
      card.skipEntryAnimation
        ? false
        : { x: 0, y: -60, opacity: 0, rotate: layout.rotate, scale: 0.9 },
    animate: {
      x: layout.x,
      y: stableY,
      rotate: layout.rotate,
      opacity: 1,
      scale: stableScale,
    },
    zIndex: isSelected ? 110 : isHovered ? 100 : baseZIndex,
  };
}

const BattleHandLaneComponent: React.FC<BattleHandLaneProps> = ({
  side = 0,
  presentation,
  stableCards = [],
  scale,
  cardBackPresetId = DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
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
  onDebugSnapshot,
}) => {
  void side;
  const isLocalPresentation = presentation === "local";
  const isDesktop = scale === "desktop";
  const travelLayerNode = useContext(BattleTravelLayerContext);
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
  const baseHandFrame = getBattleHandFrame(presentation, totalCards, isDesktop);
  const sceneLayoutWidth = baseHandFrame.width;
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
  const handSceneScale = clampHandSceneScale(
    Math.min(
      laneWidth && baseHandFrame.width > 0 ? laneWidth / baseHandFrame.width : 1,
      (laneHeight ?? resolvedLaneHeight) && baseHandFrame.height > 0
        ? (laneHeight ?? resolvedLaneHeight) / baseHandFrame.height
        : 1,
    ),
  );
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
          getLayout(totalCards, index, isDesktop, sceneLayoutWidth),
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

  const hostHeight = baseHandFrame.height;
  const bottomOffset =
    totalCards > 0
      ? Math.max(
          0,
          hostHeight / 2 -
            cardBaseHeight / 2 +
            (layoutBounds.minY + layoutBounds.maxY) / 2,
        )
      : 0;
  const hostRectSnapshot = hostRef.current
    ? {
        left: Math.round(hostRef.current.getBoundingClientRect().left),
        top: Math.round(hostRef.current.getBoundingClientRect().top),
        width: Math.round(hostRef.current.getBoundingClientRect().width),
        height: Math.round(hostRef.current.getBoundingClientRect().height),
      }
    : null;
  const getStageLocalRect = <T extends { left: number; top: number; width: number; height: number }>(
    rect: T | null | undefined,
  ) => toBattleStageLocalRect(rect, getBattleStageDomMetrics(hostRef.current));
  const sceneVisualRect =
    hostRef.current && hostRectSnapshot
      ? (() => {
          const hostRect = getStageLocalRect(hostRef.current.getBoundingClientRect());
          if (!hostRect) return null;
          const sceneWidth = baseHandFrame.width * handSceneScale;
          const sceneHeight = baseHandFrame.height * handSceneScale;
          return {
            hostRect,
            sceneLeft: hostRect.left + (hostRect.width - sceneWidth) / 2,
            sceneTop: hostRect.top + (hostRect.height - sceneHeight) / 2,
            sceneWidth,
            sceneHeight,
          };
        })()
      : null;
  const incomingTravelDescriptors = React.useMemo<BattleHandIncomingTravelDescriptor[]>(
    () =>
      incomingCards.map((incomingCard) => {
        const layout = getLayout(
          incomingCard.finalTotal,
          incomingCard.finalIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        if (!sceneVisualRect) {
          return {
            incomingCard,
            layout,
            motion: null,
          };
        }

        const originRect = getStageLocalRect(incomingCard.origin);
        if (!originRect) {
          return {
            incomingCard,
            layout,
            motion: null,
          };
        }

        return {
          incomingCard,
          layout,
          motion: getBattleHandIncomingTravelMotion({
            originRect,
            layout,
            baseHandFrame,
            bottomOffset,
            cardWidth,
            cardHeight: cardBaseHeight,
            handSceneScale,
            sceneRect: sceneVisualRect,
          }),
        };
      }),
    [
      baseHandFrame,
      bottomOffset,
      cardBaseHeight,
      cardWidth,
      getLayout,
      handSceneScale,
      incomingCards,
      isDesktop,
      sceneLayoutWidth,
      sceneVisualRect,
    ],
  );
  const outgoingTravelDescriptors = React.useMemo<BattleHandOutgoingTravelDescriptor[]>(
    () =>
      outgoingCards.map((outgoingCard) => {
        const layout = getLayout(
          outgoingCard.initialTotal,
          outgoingCard.initialIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        const destinationMode = outgoingCard.destinationMode ?? "deck-bottom";
        if (!sceneVisualRect) {
          return {
            outgoingCard,
            layout,
            destinationMode,
            motion: null,
          };
        }

        const destinationRect = getStageLocalRect(outgoingCard.destination);
        if (!destinationRect) {
          return {
            outgoingCard,
            layout,
            destinationMode,
            motion: null,
          };
        }
        const initialRect = getStageLocalRect(outgoingCard.initialSnapshot);

        return {
          outgoingCard,
          layout,
          destinationMode,
          motion: getBattleHandOutgoingTravelMotion({
            destinationRect,
            destinationMode,
            endScale: outgoingCard.endScale,
            initialRect,
            layout,
            baseHandFrame,
            bottomOffset,
            cardWidth,
            cardHeight: cardBaseHeight,
            handSceneScale,
            sceneRect: sceneVisualRect,
          }),
        };
      }),
    [
      baseHandFrame,
      bottomOffset,
      cardBaseHeight,
      cardWidth,
      getLayout,
      handSceneScale,
      isDesktop,
      outgoingCards,
      sceneLayoutWidth,
      sceneVisualRect,
    ],
  );
  const handLaneDebugSnapshot = React.useMemo<BattleHandLaneDebugSnapshot>(
    () => ({
      presentation,
      scale,
      totalCards,
      reservedSlots,
      laneWidth,
      laneHeight,
      hostHeight: Math.round(baseHandFrame.height * handSceneScale),
      bottomOffset,
      cardSize: {
        width: Math.round(cardWidth * handSceneScale),
        baseHeight: Math.round(cardBaseHeight * handSceneScale),
      },
      layoutBounds: {
        minY: Number.isFinite(layoutBounds.minY) ? Math.round(layoutBounds.minY * handSceneScale) : 0,
        maxY: Number.isFinite(layoutBounds.maxY) ? Math.round(layoutBounds.maxY * handSceneScale) : 0,
      },
      hostRect: hostRectSnapshot,
      stableCards: stableCards.map((card, index) => ({
        index,
        id: card.id,
        syllable: card.syllable,
        layout: getLayout(totalCards, index, isDesktop, sceneLayoutWidth),
        selected: selectedIndexes.includes(index),
        hovered: hoveredCardIndex === index,
        newlyDrawn: freshCardIds.includes(card.runtimeCardId ?? card.id),
      })),
      incomingCards: incomingTravelDescriptors.map(({ incomingCard, layout, motion: travelMotionData }) => {
        return {
          id: incomingCard.id,
          syllable: incomingCard.card.syllable,
          finalIndex: incomingCard.finalIndex,
          finalTotal: incomingCard.finalTotal,
          delayMs: incomingCard.delayMs,
          durationMs: incomingCard.durationMs,
          origin: incomingCard.origin,
          layout,
          motion:
            travelMotionData == null
              ? null
              : {
                  ...travelMotionData,
                  startRotate: isLocalPresentation ? 3 : -3,
                },
        };
      }),
      outgoingCards: outgoingTravelDescriptors.map(({ outgoingCard, layout, destinationMode, motion: travelMotionData }) => {
        return {
          id: outgoingCard.id,
          syllable: outgoingCard.card.syllable,
          initialIndex: outgoingCard.initialIndex,
          initialTotal: outgoingCard.initialTotal,
          delayMs: outgoingCard.delayMs,
          durationMs: outgoingCard.durationMs,
          destinationMode,
          destination: outgoingCard.destination,
          layout,
          motion: travelMotionData,
        };
      }),
    }),
    [
      bottomOffset,
      cardBaseHeight,
      cardWidth,
      freshCardIds,
      hostHeight,
      hostRectSnapshot,
      hoveredCardIndex,
      incomingTravelDescriptors,
      isDesktop,
      isLocalPresentation,
      handSceneScale,
      laneHeight,
      laneWidth,
      layoutBounds.maxY,
      layoutBounds.minY,
      baseHandFrame.height,
      outgoingTravelDescriptors,
      presentation,
      reservedSlots,
      scale,
      selectedIndexes,
      stableCards,
      totalCards,
    ],
  );

  useEffect(() => {
    onDebugSnapshot?.(handLaneDebugSnapshot);
  }, [handLaneDebugSnapshot, onDebugSnapshot]);

  const incomingTravelCards = hostRef.current
    ? incomingTravelDescriptors.map(({ incomingCard, layout, motion: travelMotionData }) => {
        if (!travelMotionData) return null;
        const startRotate = isLocalPresentation ? 3 : -3;
        return (
          <motion.div
            key={incomingCard.id}
            className="pointer-events-none absolute left-0 top-0 z-[120]"
            style={{
              left: `${travelMotionData.portalBaseLeft}px`,
              top: `${travelMotionData.portalBaseTop}px`,
            }}
            initial={{
              x: travelMotionData.startX,
              y: travelMotionData.startY,
              rotate: startRotate,
              scale: 1,
              opacity: 0,
            }}
            animate={{
              x: travelMotionData.slotX,
              y: travelMotionData.slotY,
              rotate: layout.rotate,
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: incomingCard.delayMs / 1000,
              duration: incomingCard.durationMs / 1000,
              ease: [0.18, 0.9, 0.22, 1],
              opacity: {
                duration: Math.min(0.16, incomingCard.durationMs / 1000 * 0.24),
                ease: "easeOut",
              },
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
              <CardBackCard
                floating={true}
                sizePreset={sizePreset}
                visualPresetId={cardBackPresetId}
              />
            )}
          </motion.div>
        );
      })
    : [];

  const outgoingTravelCards = hostRef.current
    ? outgoingTravelDescriptors.map(({ outgoingCard, layout, motion: travelMotionData }) => {
        if (!travelMotionData) return null;
        return (
          <motion.div
            key={outgoingCard.id}
            className="pointer-events-none absolute left-0 top-0 z-[118]"
            style={{
              left: `${travelMotionData.portalBaseLeft}px`,
              top: `${travelMotionData.portalBaseTop}px`,
            }}
            initial={{
              x: travelMotionData.startX,
              y: travelMotionData.startY,
              rotate: layout.rotate,
              scale: travelMotionData.initialScale,
              opacity: 1,
            }}
            animate={{
              x: travelMotionData.endX,
              y: travelMotionData.endY,
              rotate:
                outgoingCard.endRotate ?? (isLocalPresentation ? 4 : -4),
              scale: travelMotionData.endScale,
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
              <CardBackCard
                floating={true}
                sizePreset={sizePreset}
                visualPresetId={cardBackPresetId}
              />
            )}
          </motion.div>
        );
      })
    : [];

  const travelCards = (
    <>
      {incomingTravelCards}
      {outgoingTravelCards}
    </>
  );

  return (
    <div
      data-battle-visual-root="true"
      className="pointer-events-none relative h-full w-full min-h-0 overflow-visible"
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
        className="pointer-events-none relative flex h-full w-full items-end justify-center overflow-visible"
        style={{
          paddingInline: `var(--battle-hand-padding-x)`,
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
          style={{
            width: `${baseHandFrame.width}px`,
            height: `${baseHandFrame.height}px`,
            transform: `translate(-50%, -50%) scale(${handSceneScale})`,
            transformOrigin: "center center",
          }}
        >
        <AnimatePresence>
          {stableCards.map((card, i) => {
            const layout = getLayout(totalCards, i, isDesktop, sceneLayoutWidth);
            const selected = selectedIndexes.includes(i);
            const playable = isLocalPresentation ? targets.some((target) => canPlace(card.syllable, target)) : false;
            const isHovered = isLocalPresentation && hoveredCardIndex === i;
            const shouldPassThroughSelectedCard =
              isLocalPresentation && selected && playable && canInteract;
            const visualState = getBattleHandStableCardVisualState({
              card,
              layout,
              isDesktop,
              isSelected: selected,
              isHovered,
              isLocalPresentation,
              baseZIndex: i,
            });

            return (
              <React.Fragment key={card.id}>
                {shouldPassThroughSelectedCard ? (
                  <button
                    type="button"
                    aria-label={`Deselecionar ${card.syllable}`}
                    onClick={() => onCardClick?.(i)}
                    onMouseEnter={isLocalPresentation ? () => onHoverCard?.(i) : undefined}
                    onMouseLeave={isLocalPresentation ? () => onHoverCard?.(null) : undefined}
                    className="absolute left-0 top-0 pointer-events-auto cursor-pointer rounded-xl bg-transparent p-0"
                    style={{
                      left: `calc(50% - ${cardWidth / 2}px + ${layout.x}px)`,
                      top: `calc(100% - ${bottomOffset + cardBaseHeight}px + ${layout.y}px)`,
                      width: `${cardWidth}px`,
                      height: `${cardBaseHeight}px`,
                      zIndex: visualState.zIndex,
                    }}
                  />
                ) : null}
                <motion.div
                  initial={visualState.initial}
                  animate={visualState.animate}
                  exit={{ opacity: 0, transition: { duration: 0.01 } }}
                  transition={{ type: "spring", stiffness: 82, damping: 22 }}
                  onMouseEnter={isLocalPresentation ? () => onHoverCard?.(i) : undefined}
                  onMouseLeave={isLocalPresentation ? () => onHoverCard?.(null) : undefined}
                  ref={bindCardRef?.(card.id, scale)}
                  className={cn(
                    "absolute left-0 top-0",
                    isLocalPresentation && !shouldPassThroughSelectedCard
                      ? "pointer-events-auto cursor-pointer"
                      : "pointer-events-none",
                  )}
                  style={{
                    left: `calc(50% - ${cardWidth / 2}px)`,
                    top: `calc(100% - ${bottomOffset + cardBaseHeight}px)`,
                    zIndex: visualState.zIndex,
                  }}
                >
                  {isLocalPresentation ? (
                    <SyllableCard
                      syllable={card.syllable}
                      selected={selected}
                      playable={playable && showPlayableHints}
                      newlyDrawn={freshCardIds.includes(card.runtimeCardId ?? card.id) && showTurnHighlights}
                      attentionPulse={playable && showPlayableHints}
                      disabled={!canInteract}
                      onClick={() => onCardClick?.(i)}
                      sizePreset={sizePreset}
                    />
                  ) : (
                    <CardBackCard
                      sizePreset={sizePreset}
                      visualPresetId={cardBackPresetId}
                    />
                  )}
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        </div>
      </div>
      {travelLayerNode ? createPortal(travelCards, travelLayerNode) : travelCards}
    </div>
  );
};

export const BattleHandLane = React.memo(
  BattleHandLaneComponent,
  (prev, next) =>
    prev.side === next.side &&
    prev.presentation === next.presentation &&
    prev.scale === next.scale &&
    prev.cardBackPresetId === next.cardBackPresetId &&
    prev.stableCards === next.stableCards &&
    prev.incomingCards === next.incomingCards &&
    prev.outgoingCards === next.outgoingCards &&
    prev.reservedSlots === next.reservedSlots &&
    prev.onIncomingCardComplete === next.onIncomingCardComplete &&
    prev.onOutgoingCardComplete === next.onOutgoingCardComplete &&
    prev.hoveredCardIndex === next.hoveredCardIndex &&
    prev.onHoverCard === next.onHoverCard &&
    areNumberArraysEqual(prev.selectedIndexes ?? [], next.selectedIndexes ?? []) &&
    prev.canInteract === next.canInteract &&
    prev.showTurnHighlights === next.showTurnHighlights &&
    prev.showPlayableHints === next.showPlayableHints &&
    prev.targets === next.targets &&
    prev.onCardClick === next.onCardClick &&
    areStringArraysEqual(prev.freshCardIds ?? [], next.freshCardIds ?? []) &&
    prev.bindCardRef === next.bindCardRef,
);
