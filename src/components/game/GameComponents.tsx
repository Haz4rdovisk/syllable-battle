import React from "react";
import { UITarget, Syllable, RARITY_DAMAGE, normalizeRarity } from "../../types/game";
import { cn } from "../../lib/utils";
import { Swords } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const BOARD_ZONE_IDS = [
  "playerDeck",
  "enemyDeck",
  "playerHand",
  "enemyHand",
  "playerField",
  "enemyField",
  "playerDiscard",
  "enemyDiscard",
  "playerTargetDeck",
  "enemyTargetDeck",
] as const;

export type BoardZoneId = (typeof BOARD_ZONE_IDS)[number];

export type TravelCardVisualKind = "syllable" | "card-back" | "target" | "target-back";

export interface ZoneAnchorSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BoardTravelMotion {
  id: string;
  entityId?: string;
  from: BoardZoneId;
  to: BoardZoneId;
  kind: TravelCardVisualKind;
  origin: ZoneAnchorSnapshot;
  destination: ZoneAnchorSnapshot;
  label?: string;
  emoji?: string;
  rarity?: string;
  delayMs?: number;
  durationMs?: number;
  arcHeight?: number;
  side?: "player" | "enemy";
  originOverride?: ZoneAnchorSnapshot;
  destinationOverride?: ZoneAnchorSnapshot;
  originRotate?: number;
  destinationRotate?: number;
  originScale?: number;
  destinationScale?: number;
  selectedVisual?: boolean;
  playableVisual?: boolean;
}

export interface VisualTargetEntity {
  id: string;
  side: "player" | "enemy";
  slotIndex: number;
  target: UITarget;
}

export interface TargetTransitMotion {
  id: string;
  type: "enter" | "attack-exit";
  side: "player" | "enemy";
  slotIndex: number;
  entity: VisualTargetEntity;
  origin: ZoneAnchorSnapshot;
  destination: ZoneAnchorSnapshot;
  delayMs?: number;
  durationMs?: number;
  windupMs?: number;
  attackMs?: number;
  pauseMs?: number;
  exitMs?: number;
}

interface BoardTravelLayerProps {
  motions: BoardTravelMotion[];
  onMotionComplete: (id: string) => void;
}

interface TargetMotionLayerProps {
  motions: TargetTransitMotion[];
  onMotionComplete: (id: string) => void;
}

const rarityColor = (rarity: string) => {
  const normalized = normalizeRarity(rarity)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized === "comum") return "bg-slate-500";
  if (normalized === "raro") return "bg-amber-600";
  if (normalized === "epico") return "bg-purple-700";
  return "bg-rose-800";
};

export const getTravelTargetCardSize = (
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900,
) => ({
  width: Math.min(148, Math.max(102, viewportWidth * 0.11)),
  height: Math.min(212, Math.max(156, viewportHeight * 0.19)),
});

const travelTargetCardSizeStyle = {
  width:
    "clamp(var(--battle-target-card-min-width,102px), 11vw, var(--battle-target-card-max-width,148px))",
  height:
    "clamp(var(--battle-target-card-min-height,156px), 19vh, var(--battle-target-card-max-height,212px))",
} as React.CSSProperties;

const clampTargetMotionScale = (value: number) => Math.min(1.5, Math.max(0.55, value));

export const getTravelSyllableCardSize = (
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900,
) => ({
  width: Math.min(110, Math.max(80, viewportWidth * 0.12)),
  height: Math.min(150, Math.max(110, viewportHeight * 0.16)),
});

const getTravelSize = (kind: TravelCardVisualKind) => {
  if (kind === "target" || kind === "target-back") {
    return getTravelTargetCardSize();
  }

  return getTravelSyllableCardSize();
};

type BattleCardSizePreset = "default" | "hand-desktop" | "hand-mobile";

const battleCardSizePresetClass: Record<BattleCardSizePreset, string> = {
  default: "h-[clamp(110px,16vh,150px)] w-[clamp(80px,12vw,110px)]",
  "hand-desktop": "h-[150px] w-[110px]",
  "hand-mobile": "h-[120px] w-[86px]",
};

export const CardBackCard: React.FC<{
  floating?: boolean;
  sizePreset?: BattleCardSizePreset;
}> = ({ floating = false, sizePreset = "default" }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-xl border-2 border-amber-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800 shadow-[0_10px_20px_rgba(0,0,0,0.45)]",
      battleCardSizePresetClass[sizePreset],
      floating && "shadow-[0_14px_28px_rgba(0,0,0,0.45)]",
    )}
  >
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
    <div className="absolute inset-1.5 rounded-lg border border-amber-200/20" />
    <div className="absolute inset-4 rounded-full border border-amber-200/15" />
    <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-200/30" />
  </div>
);

const TravelCardVisual: React.FC<{ motion: BoardTravelMotion }> = ({ motion }) => {
  if (motion.kind === "card-back") {
    return <CardBackCard floating={true} />;
  }

  if (motion.kind === "target-back") {
    return (
      <div
        className="relative overflow-hidden rounded-[1.2rem] border-2 border-amber-300/40 bg-gradient-to-br from-amber-950 via-amber-900 to-stone-950 shadow-[0_18px_34px_rgba(0,0,0,0.45)]"
        style={travelTargetCardSizeStyle}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/exclusive-paper.png')] opacity-25" />
        <div className="absolute inset-2 rounded-[1rem] border border-amber-200/25" />
        <div className="absolute inset-x-4 top-4 h-7 rounded-full border border-amber-200/20" />
        <div className="absolute bottom-4 left-1/2 h-10 w-10 -translate-x-1/2 rotate-45 border border-amber-200/20" />
      </div>
    );
  }

  if (motion.kind === "target") {
    const damage = motion.rarity ? RARITY_DAMAGE[normalizeRarity(motion.rarity)] : 0;

    return (
      <div
        className="card-base relative flex flex-col overflow-hidden rounded-[1.2rem] shadow-[0_18px_34px_rgba(0,0,0,0.45)]"
        style={travelTargetCardSizeStyle}
      >
        <div
          className={cn(
            "flex h-9 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white",
            rarityColor(motion.rarity ?? "comum"),
          )}
        >
          <span>{normalizeRarity(motion.rarity ?? "comum")}</span>
          <div className="flex items-center gap-1.5">
            <Swords className="h-4 w-4" />
            <span>{damage}</span>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-2">
          <div className="text-5xl drop-shadow-2xl">{motion.emoji ?? "✨"}</div>
        </div>

        <div className="shrink-0 bg-parchment/85 px-3 py-2">
          <div className="truncate text-center font-serif text-sm font-black tracking-tight text-amber-950">
            {motion.label ?? "ALVO"}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
      </div>
    );
  }

  return (
    <SyllableCard
      syllable={motion.label ?? "?"}
      selected={Boolean(motion.selectedVisual)}
      playable={Boolean(motion.playableVisual)}
      disabled={true}
      floating={true}
      newlyDrawn={motion.to === "playerHand"}
      onClick={() => {}}
    />
  );
};

export const BoardTravelLayer: React.FC<BoardTravelLayerProps> = ({
  motions,
  onMotionComplete,
}) => {
  // GameComponents só recebe origem/destino já resolvidos e cuida da leitura visual da trajetória.
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <AnimatePresence initial={false}>
        {motions.map((travelMotion) => {
          const { width, height } = getTravelSize(travelMotion.kind);
          const startX = travelMotion.origin.left + travelMotion.origin.width / 2 - width / 2;
          const startY = travelMotion.origin.top + travelMotion.origin.height / 2 - height / 2;
          const endX = travelMotion.destination.left + travelMotion.destination.width / 2 - width / 2;
          const endY = travelMotion.destination.top + travelMotion.destination.height / 2 - height / 2;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          const arcHeight =
            travelMotion.arcHeight ??
            Math.max(72, Math.min(180, Math.abs(deltaX) * 0.18 + Math.abs(deltaY) * 0.12 + 56));
          const enemyTravel = travelMotion.side === "enemy";
          const handToFieldTravel =
            (travelMotion.from === "playerHand" || travelMotion.from === "enemyHand") &&
            (travelMotion.to === "playerField" || travelMotion.to === "enemyField");
          const startTilt =
            travelMotion.originRotate ??
            (travelMotion.kind === "card-back" || travelMotion.kind === "target-back"
              ? enemyTravel
                ? 12
                : -12
              : enemyTravel
                ? -6
                : 6);
          const endTilt = travelMotion.destinationRotate ?? (enemyTravel ? -2 : 2);
          const startScale = travelMotion.originScale ?? 0.86;
          const endScale = travelMotion.destinationScale ?? 0.94;

          return (
            <motion.div
              key={travelMotion.id}
              data-card-entity-id={travelMotion.entityId}
              initial={{ opacity: handToFieldTravel ? 1 : 0, x: startX, y: startY, rotate: startTilt, scale: startScale }}
              animate={{
                opacity: handToFieldTravel ? [1, 1, 1, 0.98] : [0, 1, 1, 0.98],
                x: [startX, startX + deltaX * 0.45, endX],
                y: [startY, startY - arcHeight, endY],
                rotate: [startTilt, (startTilt + endTilt) / 2, endTilt],
                scale: [startScale, Math.max(startScale, endScale) + 0.1, endScale],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: (travelMotion.durationMs ?? 780) / 1000,
                delay: (travelMotion.delayMs ?? 0) / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => onMotionComplete(travelMotion.id)}
              className="absolute left-0 top-0 will-change-transform"
            >
              <TravelCardVisual motion={travelMotion} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface TargetCardProps {
  target: UITarget;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  isPlayerSide: boolean;
  canClick: boolean;
  onClick: () => void;
  playerHand?: Syllable[];
  fitParent?: boolean;
}

export const TargetCard: React.FC<TargetCardProps> = ({
  target,
  selectedCard,
  pendingCard = null,
  isPlayerSide,
  canClick,
  onClick,
  playerHand = [],
  fitParent = false,
}) => {
  const normalizeSyllable = (value: Syllable) => value.trim().toUpperCase();
  const countOccurrences = (values: Syllable[]) => {
    const counts = new Map<string, number>();
    values.forEach((value) => {
      const key = normalizeSyllable(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  };

  const placedCounts = countOccurrences(target.progress);
  const handCounts = countOccurrences(playerHand);
  const selectedCounts = selectedCard ? countOccurrences([selectedCard]) : new Map<string, number>();
  const pendingCounts = pendingCard ? countOccurrences([pendingCard]) : new Map<string, number>();

  const isSlotFilled = (syllable: Syllable, index: number) => {
    const key = normalizeSyllable(syllable);
    const occurrencesBefore = target.syllables
      .slice(0, index + 1)
      .filter((item) => normalizeSyllable(item) === key).length;
    return (placedCounts.get(key) ?? 0) >= occurrencesBefore;
  };

  const canStillFillSlot = (syllable: Syllable, index: number) => {
    if (isSlotFilled(syllable, index)) return false;
    const key = normalizeSyllable(syllable);
    const occurrencesBefore = target.syllables
      .slice(0, index + 1)
      .filter((item) => normalizeSyllable(item) === key).length;
    const placed = placedCounts.get(key) ?? 0;
    const inHand = handCounts.get(key) ?? 0;
    return placed < occurrencesBefore && placed + inHand >= occurrencesBefore;
  };

  const isMatch =
    Boolean(selectedCard) &&
    isPlayerSide &&
    (placedCounts.get(normalizeSyllable(selectedCard as Syllable)) ?? 0) <
      target.syllables.filter((item) => normalizeSyllable(item) === normalizeSyllable(selectedCard as Syllable)).length;

  const damage = RARITY_DAMAGE[normalizeRarity(target.rarity)];

  return (
    <motion.button
      onClick={onClick}
      disabled={!canClick}
      whileHover={canClick ? { y: -4, scale: 1.02 } : {}}
      whileTap={canClick ? { scale: 0.98 } : {}}
      className={cn(
        "card-base group relative flex flex-col p-0 text-left shadow-xl transition-all",
        fitParent
          ? "h-full w-full"
          : "h-[clamp(var(--battle-target-card-min-height,156px),19vh,var(--battle-target-card-max-height,212px))] w-[clamp(var(--battle-target-card-min-width,102px),11vw,var(--battle-target-card-max-width,148px))]",
        target.entering && "animate-[cardEnter_.9s_ease-out]",
        target.attacking && "animate-[cardAttack_1.3s_ease-out]",
        target.leaving && "animate-[cardLeave_1.0s_ease-in_forwards]",
        isMatch && "ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]",
        selectedCard && isPlayerSide && !isMatch && "opacity-40 grayscale-[0.8]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b-2 border-[#d4af37] px-[clamp(0.55rem,0.8vw,0.75rem)] text-[clamp(0.5rem,0.7vw,0.68rem)] font-black uppercase text-white",
          rarityColor(target.rarity),
        )}
        style={{ minHeight: "clamp(2rem, 3.4vh, 2.5rem)" }}
      >
        <span>{normalizeRarity(target.rarity)}</span>
        <div className="flex items-center gap-1.5">
          <Swords className="h-[clamp(0.8rem,1.1vw,1.2rem)] w-[clamp(0.8rem,1.1vw,1.2rem)]" />
          <span>{damage}</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-[clamp(0.35rem,0.8vw,0.5rem)]">
        <div
          className="drop-shadow-2xl"
          style={{ fontSize: "clamp(2.2rem, 4.8vw, 3.75rem)" }}
        >
          {target.emoji}
        </div>
        <div
          className="absolute bottom-2 right-3 font-bold text-amber-900/40"
          style={{ fontSize: "clamp(0.55rem, 0.8vw, 0.75rem)" }}
        >
          {target.progress.length}/{target.syllables.length}
        </div>
      </div>

      <div className="shrink-0 bg-parchment/85 px-[clamp(0.55rem,0.9vw,1rem)] py-[clamp(0.35rem,0.7vw,0.5rem)]">
        <div
          className="truncate text-center font-serif font-black tracking-tight text-amber-950"
          style={{ fontSize: "clamp(0.65rem, 0.95vw, 1rem)" }}
        >
          {target.name}
        </div>

        <div className="mt-1 flex flex-wrap justify-center gap-1 pb-1 sm:mt-1.5 sm:gap-1.5">
          {target.syllables.map((syllable, i) => {
            const isDone = isSlotFilled(syllable, i);
            const isAvailableInHand = isPlayerSide && canStillFillSlot(syllable, i);
            const isSelectedMatch =
              isPlayerSide &&
              Boolean(selectedCard) &&
              !isDone &&
              (selectedCounts.get(normalizeSyllable(syllable)) ?? 0) > 0;
            const isPendingMatch =
              isPlayerSide &&
              Boolean(pendingCard) &&
              !isDone &&
              (pendingCounts.get(normalizeSyllable(syllable)) ?? 0) > 0;

            return (
              <div
                key={`${syllable}-${i}`}
                className={cn(
                  "rounded-md border-2 px-[clamp(0.28rem,0.4vw,0.38rem)] py-0.5 font-black leading-none transition-all",
                  isDone
                    ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                    : isSelectedMatch || isPendingMatch
                      ? "animate-pulse border-amber-500 bg-amber-200 text-amber-900"
                      : isAvailableInHand
                        ? "border-amber-500 bg-amber-200 text-amber-900"
                        : "border-amber-900/20 bg-amber-900/5 text-amber-900/40",
                )}
                style={{ fontSize: "clamp(0.48rem, 0.7vw, 0.68rem)" }}
              >
                {syllable}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
    </motion.button>
  );
};

export const TargetMotionLayer: React.FC<TargetMotionLayerProps> = ({
  motions,
  onMotionComplete,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[115] overflow-hidden">
      {motions.map((targetMotion) => {
          const { width, height } = getTravelTargetCardSize();
          const startX = targetMotion.origin.left + targetMotion.origin.width / 2 - width / 2;
          const startY = targetMotion.origin.top + targetMotion.origin.height / 2 - height / 2;
          const endX = targetMotion.destination.left + targetMotion.destination.width / 2 - width / 2;
          const endY = targetMotion.destination.top + targetMotion.destination.height / 2 - height / 2;
          const startScale = clampTargetMotionScale(
            Math.min(targetMotion.origin.width / width, targetMotion.origin.height / height),
          );
          const endScale = clampTargetMotionScale(
            Math.min(targetMotion.destination.width / width, targetMotion.destination.height / height),
          );

          if (targetMotion.type === "enter") {
            const startRotate = targetMotion.side === "player" ? 12 : -12;
            return (
              <motion.div
                key={targetMotion.id}
                data-target-entity-id={targetMotion.entity.id}
                initial={{ opacity: 1, x: startX, y: startY, rotate: startRotate, scale: startScale }}
                animate={{
                  opacity: [1, 1, 1, 1],
                  x: [startX, startX, endX, endX],
                  y: [startY, startY, endY, endY],
                  rotate: [startRotate, startRotate, 0, 0],
                  scale: [startScale, startScale, Math.max(startScale, endScale) + 0.02, endScale],
                }}
                transition={{
                  duration: (targetMotion.durationMs ?? 920) / 1000,
                  delay: (targetMotion.delayMs ?? 0) / 1000,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.18, 0.72, 1],
                }}
                onAnimationComplete={() => onMotionComplete(targetMotion.id)}
                className="absolute left-0 top-0 will-change-transform"
              >
                <TargetCard
                  target={targetMotion.entity.target}
                  selectedCard={null}
                  isPlayerSide={targetMotion.side === "player"}
                  canClick={false}
                  onClick={() => {}}
                />
              </motion.div>
            );
          }

          const windupMs = targetMotion.windupMs ?? 310;
          const attackMs = targetMotion.attackMs ?? 760;
          const pauseMs = targetMotion.pauseMs ?? 180;
          const exitMs = targetMotion.exitMs ?? 780;
          const totalMs = windupMs + attackMs + pauseMs + exitMs;
          const originWidth = Math.max(1, targetMotion.origin.width);
          const originHeight = Math.max(1, targetMotion.origin.height);
          const destinationWidth = Math.max(1, targetMotion.destination.width);
          const destinationHeight = Math.max(1, targetMotion.destination.height);
          const motionStartX = targetMotion.origin.left;
          const motionStartY = targetMotion.origin.top;
          const motionEndX = targetMotion.destination.left;
          const motionEndY = targetMotion.destination.top;
          const impactX = motionStartX;
          const impactY = motionStartY + (targetMotion.side === "player" ? -118 : 118);
          const impactRotate = targetMotion.side === "player" ? -8 : 8;
          const endRotate = targetMotion.side === "player" ? 10 : -10;

          return (
            <motion.div
              key={targetMotion.id}
              data-target-entity-id={targetMotion.entity.id}
              style={{
                width: originWidth,
                height: originHeight,
                transformOrigin: "center center",
              }}
              initial={{
                opacity: 1,
                x: motionStartX,
                y: motionStartY,
                width: originWidth,
                height: originHeight,
                rotate: 0,
              }}
              animate={{
                opacity: [1, 1, 1, 1, 1],
                x: [motionStartX, motionStartX, impactX, impactX, motionEndX],
                y: [motionStartY, motionStartY, impactY, impactY, motionEndY],
                width: [originWidth, originWidth, originWidth, originWidth, destinationWidth],
                height: [originHeight, originHeight, originHeight, originHeight, destinationHeight],
                rotate: [
                  0,
                  0,
                  impactRotate,
                  impactRotate,
                  endRotate,
                ],
              }}
              transition={{
                duration: totalMs / 1000,
                delay: (targetMotion.delayMs ?? 0) / 1000,
                ease: [0.22, 1, 0.36, 1],
                times: [
                  0,
                  windupMs / totalMs,
                  (windupMs + attackMs) / totalMs,
                  (windupMs + attackMs + pauseMs) / totalMs,
                  1,
                ],
              }}
              onAnimationComplete={() => onMotionComplete(targetMotion.id)}
              className="absolute left-0 top-0 will-change-transform"
            >
              <TargetCard
                target={targetMotion.entity.target}
                selectedCard={null}
                isPlayerSide={targetMotion.side === "player"}
                canClick={false}
                onClick={() => {}}
                fitParent
              />
            </motion.div>
          );
        })}
    </div>
  );
};

export const CardPile: React.FC<{
  label: string;
  count: number;
  color: string;
  variant?: "deck" | "target";
  anchorRef?: React.Ref<HTMLDivElement>;
  fitParent?: boolean;
  className?: string;
}> = ({
  label,
  count,
  color,
  variant = "deck",
  anchorRef,
  fitParent = false,
  className,
}) => {
  const [prevCount, setPrevCount] = React.useState(count);
  const [isChanging, setIsChanging] = React.useState(false);

  React.useEffect(() => {
    if (count !== prevCount) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 300);
      setPrevCount(count);
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  const layers = Math.min(Math.ceil(count / 2), 8);
  const isDeckVariant = variant === "deck";
  const visibleBackLayers = Math.max(0, layers - 1);

  return (
    <div
      data-battle-visual-root="true"
      className={cn(
        "group cursor-help perspective-1000",
        fitParent
          ? "flex h-full w-full min-w-0 flex-col items-center justify-between gap-2"
          : "flex h-[190px] w-[120px] flex-col items-center justify-between gap-2",
        className,
      )}
    >
      <div
        ref={anchorRef}
        className={cn(
          "relative w-full min-w-0 flex-1 overflow-visible transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-visible">
          <div className="relative h-full aspect-[11/15]">
            {[...Array(visibleBackLayers)].map((_, i) => {
              const depth = visibleBackLayers - i;

              return (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 rounded-xl shadow-sm",
                    isDeckVariant
                      ? "border border-amber-300/18 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800"
                      : "border border-amber-300/22 bg-gradient-to-br from-rose-950 via-red-950 to-stone-950",
                  )}
                  style={{
                    transform: `translateY(${-depth * 2.5}px) translateX(${depth * 0.8}px)`,
                    zIndex: i,
                  }}
                />
              );
            })}

            <motion.div
              animate={isChanging ? { scale: [1, 1.05, 1], y: [0, -12, 0], rotate: [0, -1.5, 0] } : {}}
              className={cn(
                "absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-xl border-2 shadow-2xl transition-all",
                isDeckVariant
                  ? "border-amber-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-800"
                  : cn("border-amber-300/30", color),
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-25",
                  isDeckVariant
                    ? "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"
                    : "bg-[url('https://www.transparenttextures.com/patterns/exclusive-paper.png')]",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-1.5",
                  isDeckVariant
                    ? "rounded-lg border border-amber-200/20"
                    : "rounded-lg border border-amber-200/18",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute",
                  isDeckVariant
                    ? "inset-4 rounded-full border border-amber-200/15"
                    : "inset-4 rounded-xl border border-amber-200/12",
                )}
              />

              {isDeckVariant ? (
                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-200/30" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/15 bg-white/5 backdrop-blur-sm">
                  <div className="h-4 w-4 rotate-45 border border-white/30" />
                </div>
              )}

              {isChanging && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.7, 2.2], y: -48 }}
                  className="pointer-events-none absolute z-30 text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  {count > prevCount ? `+${count - prevCount}` : `-${prevCount - count}`}
                </motion.div>
              )}
            </motion.div>

            {count === 0 && (
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/10 bg-black/20" />
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center">
        <div
          className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/40"
        >
          {label}
        </div>
        <div
          className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-black text-amber-200 shadow-xl backdrop-blur-md"
        >
          {count}
        </div>
      </div>
    </div>
  );
};

interface SyllableCardProps {
  syllable: Syllable;
  selected: boolean;
  playable: boolean;
  disabled: boolean;
  newlyDrawn?: boolean;
  floating?: boolean;
  attentionPulse?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  sizePreset?: BattleCardSizePreset;
}

export const SyllableCard: React.FC<SyllableCardProps> = ({
  syllable,
  selected,
  playable,
  disabled,
  newlyDrawn = false,
  floating = false,
  attentionPulse = false,
  onClick,
  style,
  sizePreset = "default",
}) => {
  const disabledVisual = disabled && !floating && !newlyDrawn;

  return (
    <motion.button
      animate={
        attentionPulse && !selected && !disabled && !floating
          ? {
              y: [0, -3, 0],
            }
          : {}
      }
      transition={
        attentionPulse && !selected && !disabled && !floating
          ? {
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        !disabled
          ? {
              y: -28,
              scale: 1.12,
              rotate: 0,
              zIndex: 50,
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }
          : {}
      }
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 font-serif font-black shadow-2xl transition-all",
        battleCardSizePresetClass[sizePreset],
        selected
          ? "z-40 border-amber-400 bg-amber-100 text-amber-950 ring-4 ring-amber-400/50"
          : playable
            ? "border-emerald-700 bg-emerald-100 text-emerald-900"
            : "border-amber-900/40 bg-amber-50 text-amber-900/60",
        newlyDrawn && "border-sky-300 bg-sky-50 text-sky-950 shadow-[0_0_30px_rgba(125,211,252,0.55)] ring-4 ring-sky-300/45",
        disabledVisual && "cursor-not-allowed grayscale-[0.78] saturate-50 brightness-90",
      )}
    >
      <div className="z-10 text-2xl sm:text-4xl md:text-5xl">{syllable}</div>
      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-25" />
      <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-amber-900/15" />
    </motion.button>
  );
};

interface PlayerPortraitProps {
  label: string;
  life: number;
  active: boolean;
  flashDamage?: number;
  avatar?: string;
  isLocal?: boolean;
  className?: string;
  showDamagePopup?: boolean;
}

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  label,
  life,
  active,
  flashDamage = 0,
  avatar,
  isLocal = false,
  className,
  showDamagePopup = true,
}) => {
  const displayLabel = label;
  const portraitAvatar = avatar ?? (isLocal ? "\u{1F9D9}\u200D\u2642\uFE0F" : "\u{1F479}");
  const heart = "\u2764\uFE0F";

  return (
    <motion.div
      data-battle-visual-root="true"
      animate={
        flashDamage > 0
          ? {
              x: [0, -10, 10, -10, 10, 0],
              transition: { duration: 0.4 },
            }
          : {}
      }
      className={cn(
        "relative z-20 flex h-full w-full min-w-0 items-center gap-3 overflow-hidden rounded-full border-4 px-3 py-2 transition-all duration-500",
        active
          ? "border-amber-400 bg-amber-900/60 shadow-[0_0_40px_rgba(251,191,36,0.4)]"
          : "border-[#3e2723] bg-black/60",
        flashDamage > 0 && "z-[130] border-rose-500 bg-rose-900/60",
        className,
      )}
    >
      <AnimatePresence>
        {showDamagePopup && flashDamage > 0 && (
          <motion.div
            key="damage-popup"
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={
              isLocal
                ? {
                    opacity: [0, 1, 1, 0],
                    y: [0, -22, -44, -66],
                    scale: [0.5, 1.8, 1.35, 1],
                  }
                : {
                    opacity: [0, 1, 1, 0],
                    y: [0, 22, 44, 66],
                    scale: [0.5, 1.8, 1.35, 1],
                  }
            }
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 text-3xl font-black text-rose-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-5xl",
              isLocal ? "-top-12" : "bottom-0 translate-y-1/3",
            )}
          >
            -{flashDamage}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full border-4 bg-gradient-to-b from-slate-700 to-slate-900 text-[1.6rem] shadow-2xl transition-all",
          active ? "border-amber-400" : "border-[#3e2723]",
          flashDamage > 0 && "scale-110 border-rose-500",
        )}
        style={{
          height: "100%",
          aspectRatio: "1 / 1",
          maxHeight: "64px",
        }}
      >
        {portraitAvatar}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center leading-none">
        <div className="flex items-center justify-center">
          <div className="w-full truncate px-1 text-center font-serif text-[10px] font-black uppercase leading-tight tracking-[0.16em] text-amber-100/60">
            {displayLabel}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span
            className={cn(
              "text-[2rem] font-black leading-none transition-colors",
              flashDamage > 0 ? "scale-125 text-white" : "text-rose-500",
            )}
          >
            {heart} {life}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
