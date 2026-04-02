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

const HAND_LAYOUT_SLOT_COUNT = 5;
const clampScale = (value: number, min = 0.72, max = 1.24) =>
  Math.min(max, Math.max(min, value));
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
  pulse?: boolean;
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
  suppressZoneCenterTravel?: boolean;
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
      deckExitX: number;
      deckExitY: number;
      startX: number;
      startY: number;
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
      destinationCenterX: number;
      destinationCenterY: number;
      deckBottomX: number;
      deckBottomY: number;
      endX: number;
      endY: number;
      endScale: number;
    } | null;
  }>;
}

export const BattleHandLane: React.FC<BattleHandLaneProps> = ({
  side = 0,
  presentation,
  stableCards = [],
  scale,
  pulse = false,
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
  suppressZoneCenterTravel = false,
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
      incomingCards: incomingCards.map((incomingCard) => {
        const layout = getLayout(
          incomingCard.finalTotal,
          incomingCard.finalIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        if (!sceneVisualRect) {
          return {
            id: incomingCard.id,
            syllable: incomingCard.card.syllable,
            finalIndex: incomingCard.finalIndex,
            finalTotal: incomingCard.finalTotal,
            delayMs: incomingCard.delayMs,
            durationMs: incomingCard.durationMs,
            origin: incomingCard.origin,
            layout,
            motion: null,
          };
        }
        const originRect = getStageLocalRect(incomingCard.origin);
        if (!originRect) {
          return {
            id: incomingCard.id,
            syllable: incomingCard.card.syllable,
            finalIndex: incomingCard.finalIndex,
            finalTotal: incomingCard.finalTotal,
            delayMs: incomingCard.delayMs,
            durationMs: incomingCard.durationMs,
            origin: incomingCard.origin,
            layout,
            motion: null,
          };
        }
        const cardSize = { width: cardWidth, height: cardBaseHeight };
        const deckExitX =
          originRect.left +
          originRect.width / 2 -
          sceneVisualRect.sceneLeft -
          (cardSize.width * handSceneScale) / 2;
        const deckExitY =
          originRect.top +
          Math.max(8, originRect.height * 0.14) -
          sceneVisualRect.sceneTop -
          cardSize.height * handSceneScale * 0.18;
        const baseLeft = baseHandFrame.width / 2 - cardSize.width / 2;
        const baseTop = baseHandFrame.height - bottomOffset - cardSize.height;
        const startX = deckExitX / handSceneScale - baseLeft;
        const startY = deckExitY / handSceneScale - baseTop;
        const startScale =
          cardSize.width > 0 && cardSize.height > 0
            ? clampScale(
                Math.min(
                  originRect.width / (cardSize.width * handSceneScale),
                  originRect.height / (cardSize.height * handSceneScale),
                ),
              )
            : 0.92;
        return {
          id: incomingCard.id,
          syllable: incomingCard.card.syllable,
          finalIndex: incomingCard.finalIndex,
          finalTotal: incomingCard.finalTotal,
          delayMs: incomingCard.delayMs,
          durationMs: incomingCard.durationMs,
          origin: incomingCard.origin,
          layout,
          motion: {
            baseLeft,
            baseTop,
            deckExitX,
            deckExitY,
            startX,
            startY,
            startScale,
            startRotate: isLocalPresentation ? 3 : -3,
          },
        };
      }),
      outgoingCards: outgoingCards.map((outgoingCard) => {
        const layout = getLayout(
          outgoingCard.initialTotal,
          outgoingCard.initialIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        if (!sceneVisualRect) {
          return {
            id: outgoingCard.id,
            syllable: outgoingCard.card.syllable,
            initialIndex: outgoingCard.initialIndex,
            initialTotal: outgoingCard.initialTotal,
            delayMs: outgoingCard.delayMs,
            durationMs: outgoingCard.durationMs,
            destinationMode: outgoingCard.destinationMode ?? "deck-bottom",
            destination: outgoingCard.destination,
            layout,
            motion: null,
          };
        }
        const destinationRect = getStageLocalRect(outgoingCard.destination);
        if (!destinationRect) {
          return {
            id: outgoingCard.id,
            syllable: outgoingCard.card.syllable,
            initialIndex: outgoingCard.initialIndex,
            initialTotal: outgoingCard.initialTotal,
            delayMs: outgoingCard.delayMs,
            durationMs: outgoingCard.durationMs,
            destinationMode: outgoingCard.destinationMode ?? "deck-bottom",
            destination: outgoingCard.destination,
            layout,
            motion: null,
          };
        }
        const cardSize = { width: cardWidth, height: cardBaseHeight };
        const baseLeft = baseHandFrame.width / 2 - cardSize.width / 2;
        const baseTop = baseHandFrame.height - bottomOffset - cardSize.height;
        const destinationCenterX =
          destinationRect.left +
          destinationRect.width / 2 -
          sceneVisualRect.sceneLeft -
          (cardSize.width * handSceneScale) / 2;
        const destinationCenterY =
          destinationRect.top +
          destinationRect.height / 2 -
          sceneVisualRect.sceneTop -
          (cardSize.height * handSceneScale) / 2;
        const deckBottomX = destinationCenterX;
        const deckBottomY =
          destinationRect.top +
          destinationRect.height -
          Math.max(10, destinationRect.height * 0.16) -
          sceneVisualRect.sceneTop -
          cardSize.height * handSceneScale * 0.82;
        const destinationMode = outgoingCard.destinationMode ?? "deck-bottom";
        const endX =
          (destinationMode === "zone-center" ? destinationCenterX : deckBottomX) / handSceneScale - baseLeft;
        const endY =
          (destinationMode === "zone-center" ? destinationCenterY : deckBottomY) / handSceneScale - baseTop;
        const endScale =
          outgoingCard.endScale ??
          (destinationMode === "zone-center"
            ? 1
            : clampScale(
                Math.min(
                  destinationRect.width / (cardSize.width * handSceneScale),
                  destinationRect.height / (cardSize.height * handSceneScale),
                ),
              ));
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
          motion: {
            baseLeft,
            baseTop,
            destinationCenterX,
            destinationCenterY,
            deckBottomX,
            deckBottomY,
            endX,
            endY,
            endScale,
          },
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
      incomingCards,
      isDesktop,
      isLocalPresentation,
      handSceneScale,
      laneHeight,
      laneWidth,
      layoutBounds.maxY,
      layoutBounds.minY,
      sceneLayoutWidth,
      baseHandFrame.height,
      outgoingCards,
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
    ? incomingCards.map((incomingCard) => {
        const originRect = getStageLocalRect(incomingCard.origin);
        if (!sceneVisualRect || !originRect) return null;
        const cardSize = { width: cardWidth, height: cardBaseHeight };
        const layout = getLayout(
          incomingCard.finalTotal,
          incomingCard.finalIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        const deckExitX =
          originRect.left +
          originRect.width / 2 -
          sceneVisualRect.sceneLeft -
          (cardSize.width * handSceneScale) / 2;
        const deckExitY =
          originRect.top +
          Math.max(8, originRect.height * 0.14) -
          sceneVisualRect.sceneTop -
          cardSize.height * handSceneScale * 0.18;
        const baseLeft = baseHandFrame.width / 2 - cardSize.width / 2;
        const baseTop = baseHandFrame.height - bottomOffset - cardSize.height;
        const startX = deckExitX / handSceneScale - baseLeft;
        const startY = deckExitY / handSceneScale - baseTop;
        const startScale =
          cardSize.width > 0 && cardSize.height > 0
            ? clampScale(
                Math.min(
                  originRect.width / (cardSize.width * handSceneScale),
                  originRect.height / (cardSize.height * handSceneScale),
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
    ? outgoingCards.map((outgoingCard) => {
        if (
          suppressZoneCenterTravel &&
          (outgoingCard.destinationMode ?? "deck-bottom") === "zone-center"
        ) {
          return null;
        }
        const destinationRect = getStageLocalRect(outgoingCard.destination);
        if (!sceneVisualRect || !destinationRect) return null;
        const cardSize = { width: cardWidth, height: cardBaseHeight };
        const layout = getLayout(
          outgoingCard.initialTotal,
          outgoingCard.initialIndex,
          isDesktop,
          sceneLayoutWidth,
        );
        const baseLeft = baseHandFrame.width / 2 - cardSize.width / 2;
        const baseTop = baseHandFrame.height - bottomOffset - cardSize.height;
        const destinationCenterX =
          destinationRect.left +
          destinationRect.width / 2 -
          sceneVisualRect.sceneLeft -
          (cardSize.width * handSceneScale) / 2;
        const destinationCenterY =
          destinationRect.top +
          destinationRect.height / 2 -
          sceneVisualRect.sceneTop -
          (cardSize.height * handSceneScale) / 2;
        const deckBottomX = destinationCenterX;
        const deckBottomY =
          destinationRect.top +
          destinationRect.height -
          Math.max(10, destinationRect.height * 0.16) -
          sceneVisualRect.sceneTop -
          cardSize.height * handSceneScale * 0.82;
        const endX =
          (outgoingCard.destinationMode === "zone-center"
            ? destinationCenterX
            : deckBottomX) /
            handSceneScale -
          baseLeft;
        const endY =
          (outgoingCard.destinationMode === "zone-center"
            ? destinationCenterY
            : deckBottomY) /
            handSceneScale -
          baseTop;
        const endScale =
          outgoingCard.endScale ??
          (outgoingCard.destinationMode === "zone-center"
            ? 1
            : clampScale(
                Math.min(
                  destinationRect.width / (cardSize.width * handSceneScale),
                  destinationRect.height / (cardSize.height * handSceneScale),
                ),
              ));
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
              rotate:
                outgoingCard.endRotate ?? (isLocalPresentation ? 4 : -4),
              scale: endScale,
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
    <motion.div
      data-battle-visual-root="true"
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
        <div
          className="absolute left-1/2 top-1/2 overflow-visible"
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

            return (
              <motion.div
                key={card.id}
                initial={
                  card.skipEntryAnimation
                    ? false
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
            );
          })}
        </AnimatePresence>
        </div>
      </div>
      {travelLayerNode ? createPortal(travelCards, travelLayerNode) : travelCards}
    </motion.div>
  );
};
