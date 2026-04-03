import React from "react";
import { UITarget, Syllable, RARITY_DAMAGE, normalizeRarity } from "../../types/game";
import { cn } from "../../lib/utils";
import { Swords } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BattleCardBackPresetId,
  BattlePilePresetId,
  DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
  DEFAULT_BATTLE_PILE_PRESET_ID,
  getBattleCardBackVisualPreset,
  getBattlePileVisualPreset,
} from "./battleCardStackVisuals";

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

export interface VisualTargetEntity {
  id: string;
  side: "player" | "enemy";
  slotIndex: number;
  target: UITarget;
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

export const getTravelSyllableCardSize = (
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900,
) => ({
  width: Math.min(110, Math.max(80, viewportWidth * 0.12)),
  height: Math.min(150, Math.max(110, viewportHeight * 0.16)),
});

type BattleCardSizePreset = "default" | "hand-desktop" | "hand-mobile";

const battleCardSizePresetClass: Record<BattleCardSizePreset, string> = {
  default: "h-[clamp(110px,16vh,150px)] w-[clamp(80px,12vw,110px)]",
  "hand-desktop": "h-[150px] w-[110px]",
  "hand-mobile": "h-[120px] w-[86px]",
};

export const CardBackCard: React.FC<{
  floating?: boolean;
  sizePreset?: BattleCardSizePreset;
  visualPresetId?: BattleCardBackPresetId;
}> = ({
  floating = false,
  sizePreset = "default",
  visualPresetId = DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
}) => {
  const preset = getBattleCardBackVisualPreset(visualPresetId);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 shadow-[0_10px_20px_rgba(0,0,0,0.45)]",
        preset.frameClassName,
        battleCardSizePresetClass[sizePreset],
        floating && "shadow-[0_14px_28px_rgba(0,0,0,0.45)]",
      )}
    >
      <div className={cn("absolute inset-0", preset.textureClassName)} />
      <div className={cn("pointer-events-none absolute inset-1.5", preset.insetClassName)} />
      <div className={cn("pointer-events-none absolute", preset.coreClassName)} />
      <div
        className={cn(
          "absolute left-1/2 top-1/2",
          preset.emblemClassName,
        )}
      />
    </div>
  );
};

interface TargetCardProps {
  target: UITarget;
  selectedCard: Syllable | null;
  pendingCard?: Syllable | null;
  mulliganSelectionActive?: boolean;
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
  mulliganSelectionActive = false,
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
  const isCompleted = target.progress.length >= target.syllables.length && target.syllables.length > 0;
  const isValidTarget = !mulliganSelectionActive && isMatch && canClick;
  const hasAnyFutureProgress =
    isPlayerSide &&
    target.syllables.some((syllable, index) => canStillFillSlot(syllable, index));
  const isInvalidTargetNow =
    isPlayerSide &&
    (mulliganSelectionActive || (Boolean(selectedCard) && !isMatch));
  const isAvailableButNotPriority =
    !selectedCard &&
    !mulliganSelectionActive &&
    hasAnyFutureProgress &&
    !isCompleted;

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
        isCompleted && "ring-4 ring-amber-300/75 shadow-[0_0_28px_rgba(251,191,36,0.45)]",
        isValidTarget && "z-20 -translate-y-1 ring-4 ring-emerald-300/80 shadow-[0_0_32px_rgba(52,211,153,0.45)]",
        isAvailableButNotPriority && "ring-2 ring-amber-200/40 shadow-[0_0_18px_rgba(180,83,9,0.14)]",
        isInvalidTargetNow && "opacity-55 saturate-[0.72] brightness-95",
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
        {isValidTarget ? (
          <div className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-emerald-300/55 bg-emerald-200/8 shadow-[inset_0_0_26px_rgba(52,211,153,0.18)]" />
        ) : null}
        {isCompleted ? (
          <div className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-amber-200/55 bg-amber-100/10 shadow-[inset_0_0_30px_rgba(251,191,36,0.2)]" />
        ) : null}
        {isAvailableButNotPriority ? (
          <div className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-amber-200/34 bg-amber-100/6 shadow-[inset_0_0_20px_rgba(180,83,9,0.12)]" />
        ) : null}
        {isInvalidTargetNow ? (
          <div className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-slate-500/18 bg-slate-950/10 shadow-[inset_0_0_16px_rgba(15,23,42,0.12)]" />
        ) : null}
        <div
          className="drop-shadow-2xl"
          style={{ fontSize: "clamp(2.4rem, 5.2vw, 4rem)" }}
        >
          {target.emoji}
        </div>
      </div>

      <div className="shrink-0 bg-parchment/85 px-[clamp(0.55rem,0.9vw,1rem)] py-[clamp(0.35rem,0.7vw,0.5rem)]">
        <div
          className="truncate text-center font-serif font-black tracking-tight text-amber-950"
          style={{ fontSize: "clamp(0.65rem, 0.95vw, 1rem)" }}
        >
          {target.name}
        </div>

        <div className="mt-1 flex translate-y-0.5 flex-wrap justify-center gap-1.25 pb-1 sm:mt-1.5 sm:translate-y-1 sm:gap-1.5">
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
                  "min-w-[clamp(1.74rem,2.36vw,2.18rem)] rounded-md border-2 px-[clamp(0.26rem,0.42vw,0.4rem)] py-[clamp(0.29rem,0.48vw,0.4rem)] text-center font-black leading-none transition-all",
                  isDone
                    ? "border-emerald-700 bg-emerald-100 text-emerald-900 shadow-[0_2px_8px_rgba(5,46,22,0.16)]"
                    : isSelectedMatch || isPendingMatch
                      ? "animate-pulse border-emerald-500 bg-emerald-100 text-emerald-950 shadow-[0_2px_12px_rgba(5,46,22,0.18)] ring-2 ring-emerald-300/40"
                      : isAvailableInHand
                        ? "border-amber-300/70 bg-amber-50 text-amber-950 shadow-[0_2px_10px_rgba(120,53,15,0.12)]"
                        : "border-amber-900/20 bg-amber-900/5 text-amber-900/50 shadow-[0_2px_8px_rgba(120,53,15,0.08)]",
                )}
                style={{ fontSize: "clamp(0.54rem, 0.78vw, 0.74rem)" }}
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

export const CardPile: React.FC<{
  label: string;
  count: number;
  color: string;
  variant?: "deck" | "target";
  anchorRef?: React.Ref<HTMLDivElement>;
  fitParent?: boolean;
  className?: string;
  visualPresetId?: BattlePilePresetId;
}> = ({
  label,
  count,
  color,
  variant = "deck",
  anchorRef,
  fitParent = false,
  className,
  visualPresetId = DEFAULT_BATTLE_PILE_PRESET_ID,
}) => {
  void color;
  const [prevCount, setPrevCount] = React.useState(count);
  const [isChanging, setIsChanging] = React.useState(false);
  const preset = getBattlePileVisualPreset(visualPresetId);

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
  const surfacePreset = preset.pile[variant];

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
                    surfacePreset.layerClassName,
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
                surfacePreset.frameClassName,
              )}
            >
              <div className={cn("absolute inset-0", surfacePreset.textureClassName)} />
              <div
                className={cn(
                  "pointer-events-none absolute inset-1.5",
                  surfacePreset.insetClassName,
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute",
                  surfacePreset.coreClassName,
                )}
              />

              {isDeckVariant ? (
                <div
                  className={cn(
                    "absolute left-1/2 top-1/2",
                    surfacePreset.emblemClassName,
                  )}
                />
              ) : (
                <div className={surfacePreset.emblemClassName}>
                  <div className={surfacePreset.emblemInnerClassName} />
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
              <div className={cn("absolute inset-0", preset.emptyStateClassName)} />
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center">
        <div
          className={cn(
            "mb-1 text-[10px] font-black uppercase tracking-widest",
            preset.labelClassName,
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-black shadow-xl",
            preset.countBadgeClassName,
          )}
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
  staticDisplay?: boolean;
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
  staticDisplay = false,
  onClick,
  style,
  sizePreset = "default",
}) => {
  const disabledVisual = disabled && !floating && !newlyDrawn && !staticDisplay;

  return (
    <motion.button
      animate={
        attentionPulse && !selected && !disabled && !floating && !staticDisplay
          ? {
              y: [0, -3, 0],
            }
          : {}
      }
      transition={
        attentionPulse && !selected && !disabled && !floating && !staticDisplay
          ? {
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={
        !disabled
          ? staticDisplay
            ? selected
              ? {}
              : {
                  y: -4,
                  transition: { type: "spring", stiffness: 260, damping: 22 },
                }
            : selected
              ? {}
            : {
                scale: 1.06,
                rotate: 0,
                zIndex: 50,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }
          : {}
      }
      whileTap={!disabled ? (staticDisplay ? (selected ? {} : { scale: 0.98 }) : { scale: 0.95 }) : {}}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-amber-50 font-serif font-black shadow-2xl transition-[transform,box-shadow,border-color,color,filter] duration-200",
        battleCardSizePresetClass[sizePreset],
        selected
          ? staticDisplay
            ? "border-amber-300 text-amber-950 ring-4 ring-amber-300/60 shadow-[0_12px_22px_rgba(120,53,15,0.14)]"
            : "border-amber-300 text-amber-950 ring-4 ring-amber-300/60 shadow-[0_24px_44px_rgba(120,53,15,0.26)]"
          : playable
            ? "border-emerald-700 text-emerald-900 shadow-[0_0_20px_rgba(52,211,153,0.2)] ring-2 ring-emerald-300/30"
            : "border-amber-900/40 text-amber-900/60",
        newlyDrawn && "border-sky-300 bg-sky-50 text-sky-950 shadow-[0_0_30px_rgba(125,211,252,0.55)] ring-4 ring-sky-300/45",
        disabledVisual && "cursor-not-allowed grayscale-[0.78] saturate-50 brightness-90",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-150",
          selected
            ? "opacity-100 bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(254,243,199,0.98))]"
            : "opacity-0 bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(254,243,199,0.98))]",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-150",
          playable && !selected ? "bg-emerald-100 opacity-100" : "bg-emerald-100 opacity-0",
        )}
      />
      {playable && !selected && !disabled ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-2 z-20 h-3 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.34)_0%,rgba(16,185,129,0)_72%)] blur-md" />
      ) : null}
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
