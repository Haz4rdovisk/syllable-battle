import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Layers3,
  LibraryBig,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Tags,
} from "lucide-react";
import { Button } from "../ui/button";
import { SyllableCard } from "../game/GameComponents";
import { cn } from "../../lib/utils";
import { APP_RESOLVED_DECKS, resolveAppDeck, type AppResolvedDeck } from "../../app/appDeckResolver";
import { CONTENT_PIPELINE } from "../../data/content";
import { getCardsForDeckModel, type CatalogCardUsage } from "../../data/content/selectors";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import { normalizeRarity, RARITY_DAMAGE, type Rarity } from "../../types/game";

interface CollectionScreenProps {
  onBack: () => void;
}

type CollectionViewport = "mobile" | "tablet" | "desktop";
type CollectionMode = "targets" | "syllables";
type CollectionFilter = "all" | "raro" | "epico" | "lendario";

type AggregatedTargetCard = {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  copies: number;
  syllables: string[];
};

const viewportByWidth = (width: number): CollectionViewport => {
  if (width < 1080) return "mobile";
  if (width < 1520) return "tablet";
  return "desktop";
};

const targetPageSizeByViewport: Record<CollectionViewport, number> = {
  mobile: 4,
  tablet: 6,
  desktop: 8,
};

const syllablePageSizeByViewport: Record<CollectionViewport, number> = {
  mobile: 4,
  tablet: 6,
  desktop: 8,
};

const decksPerPageByViewport: Record<CollectionViewport, number> = {
  mobile: 3,
  tablet: 4,
  desktop: 5,
};

const targetGridClassByViewport: Record<CollectionViewport, string> = {
  mobile: "grid-cols-2 gap-x-2.5 gap-y-3",
  tablet: "grid-cols-3 gap-x-3 gap-y-3.5",
  desktop: "grid-cols-4 gap-x-3.5 gap-y-4",
};

const syllableGridClassByViewport: Record<CollectionViewport, string> = {
  mobile: "grid-cols-2 gap-x-2.5 gap-y-3",
  tablet: "grid-cols-3 gap-x-3 gap-y-3.5",
  desktop: "grid-cols-4 gap-x-3.5 gap-y-4",
};

const targetCardWidthClassByViewport: Record<CollectionViewport, string> = {
  mobile: "w-[8.65rem]",
  tablet: "w-[9.8rem]",
  desktop: "w-[10.75rem]",
};

const syllableScaleClassByViewport: Record<CollectionViewport, string> = {
  mobile: "scale-[0.68]",
  tablet: "scale-[0.76]",
  desktop: "scale-[0.84]",
};

const getRarityTier = (rarity: Rarity) => {
  const normalized = normalizeRarity(rarity);
  if (normalized === "lendário") return 3;
  if (normalized === "épico") return 2;
  if (normalized === "raro") return 1;
  return 0;
};

const getFilterFloor = (filter: CollectionFilter) => {
  if (filter === "lendario") return 3;
  if (filter === "epico") return 2;
  if (filter === "raro") return 1;
  return 0;
};

const getRarityToneClass = (rarity: Rarity) => {
  const normalized = normalizeRarity(rarity);
  if (normalized === "comum") return "bg-slate-500";
  if (normalized === "raro") return "bg-amber-600";
  if (normalized === "épico") return "bg-purple-700";
  return "bg-rose-800";
};

const getRarityLabel = (rarity: Rarity) => {
  const normalized = normalizeRarity(rarity);
  if (normalized === "épico") return "EPICO";
  if (normalized === "lendário") return "LENDARIO";
  return normalized.toUpperCase();
};

const aggregateTargetsForDeck = (deck: AppResolvedDeck | null): AggregatedTargetCard[] => {
  if (!deck) return [];

  const byId = new Map<string, AggregatedTargetCard>();

  deck.deckModel.targetInstances.forEach((entry) => {
    const current = byId.get(entry.target.id);
    if (current) {
      current.copies += 1;
      return;
    }

    byId.set(entry.target.id, {
      id: entry.target.id,
      name: entry.target.name,
      emoji: entry.target.emoji,
      rarity: normalizeRarity(entry.target.rarity),
      copies: 1,
      syllables: entry.target.cardIds
        .map((cardId) => CONTENT_PIPELINE.catalog.cardsById[cardId]?.syllable ?? cardId)
        .slice(0, 4),
    });
  });

  return [...byId.values()].sort((left, right) => {
    const rarityDelta = getRarityTier(right.rarity) - getRarityTier(left.rarity);
    if (rarityDelta !== 0) return rarityDelta;
    if (right.copies !== left.copies) return right.copies - left.copies;
    return left.name.localeCompare(right.name);
  });
};

const FilterPill: React.FC<{
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ active = false, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex min-h-[2.2rem] items-center justify-center rounded-full border px-3.5 py-1 text-[0.54rem] font-black uppercase tracking-[0.16em] transition-all duration-150",
      "[@media(pointer:coarse)]:min-h-[1.85rem] [@media(pointer:coarse)]:px-2.4 [@media(pointer:coarse)]:text-[0.42rem]",
      active
        ? "border-[#c7a561] bg-[#fff3d6] text-[#7c5821] shadow-[0_8px_16px_rgba(0,0,0,0.05)]"
        : "border-[#d7ccb8] bg-white/78 text-[#7f6a52] hover:border-[#c7a561]/65 hover:text-[#6e4b1f]",
    )}
  >
    {children}
  </button>
);

const CountPill: React.FC<{
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ccb8] bg-white/82 px-3 py-1 text-[0.52rem] font-black uppercase tracking-[0.16em] text-[#7f6a52] [@media(pointer:coarse)]:gap-1 [@media(pointer:coarse)]:px-2.2 [@media(pointer:coarse)]:text-[0.38rem]">
    {icon}
    {children}
  </span>
);

const EditorDeckRailCard: React.FC<{
  deck: AppResolvedDeck;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}> = ({ deck, active, compact, onClick }) => {
  const totalTargets = new Set(deck.deckModel.targetInstances.map((entry) => entry.targetId)).size;
  const totalSyllables = deck.deckModel.cards.reduce((sum, entry) => sum + entry.copiesInDeck, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-[1.4rem] border text-left shadow-[0_14px_26px_rgba(0,0,0,0.12)] transition-all duration-300",
        compact
          ? "rounded-[1rem]"
          : "hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(0,0,0,0.16)]",
        active
          ? "border-amber-300/60 bg-[#fffaf0]/96 ring-2 ring-amber-300/35"
          : "border-amber-900/12 bg-[#fffaf0]/90 hover:border-amber-900/18 hover:bg-[#fffdf7]",
      )}
    >
      <div
        className={cn(
          "relative border-b border-white/10 bg-gradient-to-br px-3 py-3",
          compact && "px-2.5 py-2.5",
          DECK_VISUAL_THEME_CLASSES[deck.visualTheme],
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_45%)]" />
        <div className="relative flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-amber-100/20 bg-black/15 text-[1.65rem] shadow-[0_10px_20px_rgba(0,0,0,0.2)]",
                compact && "h-9 w-9 rounded-[0.8rem] text-[1.25rem]",
              )}
            >
              {deck.emoji}
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "truncate font-serif text-[1.1rem] font-black text-amber-50",
                  compact && "text-[0.86rem]",
                )}
              >
                {deck.name}
              </div>
              <div
                className={cn(
                  "mt-1 truncate text-[0.46rem] font-black uppercase tracking-[0.18em] text-amber-100/72",
                  compact && "text-[0.38rem] tracking-[0.14em]",
                )}
              >
                {deck.definition.superclass.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2.5 bg-[rgba(255,248,235,0.94)] px-3 py-2.5 text-sm",
          compact && "gap-2 px-2.5 py-2",
        )}
      >
        <div>
          <div className="text-[0.42rem] font-black uppercase tracking-[0.18em] text-amber-900/45">
            Targets
          </div>
          <div className={cn("mt-0.5 font-serif text-[0.96rem] font-black text-amber-950", compact && "text-[0.74rem]")}>
            {totalTargets}
          </div>
        </div>
        <div>
          <div className="text-[0.42rem] font-black uppercase tracking-[0.18em] text-amber-900/45">
            Silabas
          </div>
          <div className={cn("mt-0.5 font-serif text-[0.96rem] font-black text-amber-950", compact && "text-[0.74rem]")}>
            {totalSyllables}
          </div>
        </div>
      </div>
    </button>
  );
};

const EditorTargetCollectionCard: React.FC<{
  entry: AggregatedTargetCard;
  viewport: CollectionViewport;
}> = ({ entry, viewport }) => {
  const damage = RARITY_DAMAGE[normalizeRarity(entry.rarity)];

  return (
    <div className="relative flex w-full items-start justify-center text-center">
      <div className={cn("relative flex w-full items-start justify-center pb-9", targetCardWidthClassByViewport[viewport])}>
        <div className="card-base relative flex aspect-[126/176] w-full flex-col overflow-hidden rounded-[1.1rem] border border-amber-900/20 shadow-[0_14px_26px_rgba(0,0,0,0.15)]">
          <div
            className={cn(
              "flex h-10 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white",
              getRarityToneClass(entry.rarity),
              viewport === "mobile" && "h-8 px-2.5 text-[8px]",
            )}
          >
            <span className="truncate">{getRarityLabel(entry.rarity)}</span>
            <div className="flex items-center gap-1.5">
              <Swords className={cn("h-4 w-4", viewport === "mobile" && "h-3 w-3")} />
              <span>{damage}</span>
            </div>
          </div>

          <div
            className={cn(
              "relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-1.5",
              viewport === "mobile" && "p-1",
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_42%)]" />
            <div
              className={cn(
                "relative translate-y-3 text-[4.8rem] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]",
                viewport === "mobile" && "translate-y-2 text-[3.9rem]",
              )}
            >
              {entry.emoji || "?"}
            </div>
          </div>

          <div className={cn("mt-auto shrink-0 bg-parchment/90 px-2.5 pb-2.5 pt-4", viewport === "mobile" && "px-2 pb-2 pt-3")}>
            <div
              className={cn(
                "font-serif text-[0.82rem] font-black leading-tight tracking-tight text-amber-950",
                viewport === "mobile" && "text-[0.72rem]",
              )}
            >
              {entry.name}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1">
              {entry.syllables.length > 0 ? (
                entry.syllables.map((syllable, index) => (
                  <div
                    key={`${entry.id}-${syllable}-${index}`}
                    className={cn(
                      "rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950 shadow-sm",
                      viewport === "mobile" && "px-1.5 text-[8px]",
                    )}
                  >
                    {syllable}
                  </div>
                ))
              ) : (
                <div className="rounded-full border border-amber-900/12 bg-white/70 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-900/40 shadow-sm">
                  SEM SILABAS
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
        </div>

        <span
          className={cn(
            "absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm",
            viewport === "mobile" && "bottom-[5px] px-2 text-[10px]",
          )}
        >
          x{entry.copies}
        </span>
      </div>
    </div>
  );
};

const EditorSyllableCollectionCard: React.FC<{
  entry: CatalogCardUsage;
  viewport: CollectionViewport;
}> = ({ entry, viewport }) => (
  <div className={cn("relative flex min-h-[10.6rem] w-full items-start justify-center pb-3 text-center", viewport === "mobile" && "min-h-[9.4rem]")}>
    <div className={cn("origin-top", syllableScaleClassByViewport[viewport])}>
      <SyllableCard
        syllable={entry.card.syllable}
        selected={false}
        playable={false}
        disabled={false}
        staticDisplay
        sizePreset="hand-desktop"
        onClick={() => {}}
      />
    </div>
    <span className="absolute bottom-[9px] left-1/2 -translate-x-1/2 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm [@media(pointer:coarse)]:text-[10px]">
      x{entry.copiesInDeck}
    </span>
  </div>
);

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ onBack }) => {
  const deckEntries = useMemo(() => APP_RESOLVED_DECKS, []);
  const [viewport, setViewport] = useState<CollectionViewport>(() =>
    typeof window === "undefined" ? "desktop" : viewportByWidth(window.innerWidth),
  );
  const [activeDeckId, setActiveDeckId] = useState<string>(() => deckEntries[0]?.deckId ?? "");
  const [mode, setMode] = useState<CollectionMode>("targets");
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const [collectionPage, setCollectionPage] = useState(0);
  const [deckPage, setDeckPage] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [deckPageDirection, setDeckPageDirection] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setViewport(viewportByWidth(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!activeDeckId && deckEntries[0]) {
      setActiveDeckId(deckEntries[0].deckId);
    }
  }, [activeDeckId, deckEntries]);

  const activeDeck = useMemo(() => resolveAppDeck(activeDeckId) ?? deckEntries[0] ?? null, [activeDeckId, deckEntries]);
  const aggregatedTargets = useMemo(() => aggregateTargetsForDeck(activeDeck), [activeDeck]);
  const syllableCards = useMemo(() => (activeDeck ? getCardsForDeckModel(activeDeck.deckModel) : []), [activeDeck]);

  const filteredTargets = useMemo(() => {
    if (filter === "all") return aggregatedTargets;
    const filterFloor = getFilterFloor(filter);
    return aggregatedTargets.filter((entry) => getRarityTier(entry.rarity) >= filterFloor);
  }, [aggregatedTargets, filter]);

  const visibleEntries = mode === "targets" ? filteredTargets : syllableCards;
  const cardsPerPage = mode === "targets" ? targetPageSizeByViewport[viewport] : syllablePageSizeByViewport[viewport];
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / cardsPerPage));
  const currentPage = Math.min(collectionPage, totalPages - 1);
  const currentPageEntries = visibleEntries.slice(currentPage * cardsPerPage, currentPage * cardsPerPage + cardsPerPage);

  const railPageSize = decksPerPageByViewport[viewport];
  const totalDeckPages = Math.max(1, Math.ceil(deckEntries.length / railPageSize));
  const currentDeckPage = Math.min(deckPage, totalDeckPages - 1);
  const visibleDecks = deckEntries.slice(currentDeckPage * railPageSize, currentDeckPage * railPageSize + railPageSize);

  useEffect(() => {
    setCollectionPage(0);
  }, [activeDeckId, filter, mode, viewport]);

  useEffect(() => {
    setDeckPage(0);
  }, [viewport]);

  const handleCollectionPageChange = (nextPage: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, nextPage));
    if (clamped === currentPage) return;
    setPageDirection(clamped > currentPage ? 1 : -1);
    setCollectionPage(clamped);
  };

  const handleDeckPageChange = (nextPage: number) => {
    const clamped = Math.max(0, Math.min(totalDeckPages - 1, nextPage));
    if (clamped === currentDeckPage) return;
    setDeckPageDirection(clamped > currentDeckPage ? 1 : -1);
    setDeckPage(clamped);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ece3d3] p-1.5 text-[#31271e] sm:p-3"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#fff8ee_0%,#efe4d1_58%,#e2d2bb_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(120,92,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,92,64,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-45" />

      <div className="paper-panel relative z-10 h-[min(96vh,52rem)] w-[min(98vw,112rem)] overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-3 py-3 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)]:h-[calc(100dvh-8px)] [@media(pointer:coarse)]:w-[calc(100vw-8px)] [@media(pointer:coarse)]:rounded-[1.1rem] [@media(pointer:coarse)]:px-1.5 [@media(pointer:coarse)]:py-1.5 sm:px-5 sm:py-5">
        <div className="absolute inset-y-[12px] left-[12px] right-[12px] rounded-[1.45rem] border border-[#d9c8a9] [@media(pointer:coarse)]:inset-y-[7px] [@media(pointer:coarse)]:left-[7px] [@media(pointer:coarse)]:right-[7px] [@media(pointer:coarse)]:rounded-[0.85rem]" />
        <div className="pointer-events-none absolute bottom-[14px] left-[8px] right-[8px] top-[14px] rounded-[1.2rem] border border-white/32 [@media(pointer:coarse)]:bottom-[9px] [@media(pointer:coarse)]:left-[4px] [@media(pointer:coarse)]:right-[4px] [@media(pointer:coarse)]:top-[9px] [@media(pointer:coarse)]:rounded-[0.72rem]" />

        <div className="relative flex h-full min-h-0 flex-col gap-3 [@media(pointer:coarse)]:gap-1.5">
          <header className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 [@media(pointer:coarse)]:gap-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="group relative flex h-[3rem] w-[8rem] shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[1.1rem] border-[2px] border-[#8f5f12] bg-[#f0dfc4] px-3 font-serif text-[0.7rem] font-black uppercase tracking-[0.08em] text-[#6b4723] shadow-[0_5px_0_#8f5f12,0_12px_22px_rgba(88,52,8,0.16)] transition-all duration-150 [@media(pointer:coarse)]:h-[2.25rem] [@media(pointer:coarse)]:w-[5.4rem] [@media(pointer:coarse)]:rounded-[0.8rem] [@media(pointer:coarse)]:gap-1 [@media(pointer:coarse)]:px-2 [@media(pointer:coarse)]:text-[0.42rem]"
            >
              <span className="pointer-events-none absolute inset-[4px] rounded-[0.9rem] border border-white/24 [@media(pointer:coarse)]:inset-[2px] [@media(pointer:coarse)]:rounded-[0.55rem]" />
              <ChevronLeft className="relative z-10 h-4 w-4 [@media(pointer:coarse)]:h-[0.8rem] [@media(pointer:coarse)]:w-[0.8rem]" />
              <span className="relative z-10">Voltar</span>
            </Button>

            <div className="min-w-0 text-center">
              <div className="font-serif text-[2.3rem] font-black uppercase leading-none text-[#5b2408] [@media(pointer:coarse)]:text-[1.42rem]">
                Minha Colecao
              </div>
              <div className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.24em] text-[#8b7357] [@media(pointer:coarse)]:text-[0.4rem] [@media(pointer:coarse)]:tracking-[0.16em]">
                Biblioteca de decks e cartas do projeto
              </div>
            </div>

            <div className="flex justify-end">
              <CountPill icon={<LibraryBig className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                {deckEntries.length} decks
              </CountPill>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-[1.15rem] border border-[#d8ccb8] bg-[#fffaf3]/92 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:gap-1.5 [@media(pointer:coarse)]:rounded-[0.78rem] [@media(pointer:coarse)]:px-1.75 [@media(pointer:coarse)]:py-1.25">
            <div className="flex min-w-0 flex-wrap items-center gap-2 [@media(pointer:coarse)]:gap-1.25">
              <div
                className={cn(
                  "inline-flex min-w-[15rem] max-w-[22rem] items-center gap-2.5 rounded-[1rem] border border-amber-200/10 bg-gradient-to-br px-3 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.14)]",
                  "[@media(pointer:coarse)]:min-w-[9.7rem] [@media(pointer:coarse)]:max-w-[12rem] [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:gap-1.5 [@media(pointer:coarse)]:px-2 [@media(pointer:coarse)]:py-1.5",
                  activeDeck ? DECK_VISUAL_THEME_CLASSES[activeDeck.visualTheme] : "",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] border border-white/15 bg-black/15 text-[1.3rem] shadow-[0_8px_18px_rgba(0,0,0,0.18)] [@media(pointer:coarse)]:h-7 [@media(pointer:coarse)]:w-7 [@media(pointer:coarse)]:rounded-[0.6rem] [@media(pointer:coarse)]:text-[0.92rem]">
                  {activeDeck?.emoji || "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-[0.42rem] font-black uppercase tracking-[0.18em] text-amber-50/70 [@media(pointer:coarse)]:text-[0.32rem]">
                    Deck em foco
                  </div>
                  <div className="truncate font-serif text-[1.18rem] font-black leading-none tracking-tight text-amber-50 [@media(pointer:coarse)]:text-[0.78rem]">
                    {activeDeck?.name || "Sem deck"}
                  </div>
                </div>
              </div>

              <CountPill icon={<LibraryBig className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                {activeDeck?.definition.superclass || "animal"}
              </CountPill>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5 [@media(pointer:coarse)]:gap-1">
              <FilterPill active={mode === "targets"} onClick={() => setMode("targets")}>
                Alvos
              </FilterPill>
              <FilterPill active={mode === "syllables"} onClick={() => setMode("syllables")}>
                Silabas
              </FilterPill>
              {mode === "targets" ? (
                <>
                  <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                    Todas
                  </FilterPill>
                  <FilterPill active={filter === "raro"} onClick={() => setFilter("raro")}>
                    Raro+
                  </FilterPill>
                  <FilterPill active={filter === "epico"} onClick={() => setFilter("epico")}>
                    Epico+
                  </FilterPill>
                </>
              ) : (
                <CountPill icon={<Sparkles className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                  Pool do deck
                </CountPill>
              )}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_14.5rem] gap-3 [@media(pointer:coarse)]:grid-cols-[minmax(0,1fr)_9rem] [@media(pointer:coarse)]:gap-1.5 xl:grid-cols-[minmax(0,1fr)_16.5rem]">
            <section className="min-h-0 rounded-[1.45rem] border border-[#d8ccb8] bg-[#fffaf3]/94 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:rounded-[0.86rem] [@media(pointer:coarse)]:px-1.75 [@media(pointer:coarse)]:py-1.6">
              <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 [@media(pointer:coarse)]:gap-1.6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[0.48rem] font-black uppercase tracking-[0.2em] text-[#9a7f5c] [@media(pointer:coarse)]:text-[0.36rem]">
                      {mode === "targets" ? "Colecao paginada de cartas" : "Colecao paginada de silabas"}
                    </div>
                    <div className="truncate font-serif text-[1.18rem] font-black text-[#5b2408] [@media(pointer:coarse)]:text-[0.82rem]">
                      {mode === "targets" ? "Cartas do Deck" : "Silabas do Deck"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <CountPill icon={<Tags className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                      {mode === "targets" ? `${filteredTargets.length} cartas` : `${syllableCards.length} silabas`}
                    </CountPill>
                    <CountPill icon={<SlidersHorizontal className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                      Pagina {currentPage + 1}
                    </CountPill>
                  </div>
                </div>

                <div className="min-h-0 overflow-hidden rounded-[1.1rem] border border-amber-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,248,235,0.82))] px-2.5 py-3 [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:px-1 [@media(pointer:coarse)]:py-1.1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${activeDeck?.deckId ?? "none"}-${mode}-${filter}-${currentPage}`}
                      initial={{ opacity: 0, x: pageDirection > 0 ? 56 : -56, rotateY: pageDirection > 0 ? -8 : 8 }}
                      animate={{ opacity: 1, x: 0, rotateY: 0 }}
                      exit={{ opacity: 0, x: pageDirection > 0 ? -56 : 56, rotateY: pageDirection > 0 ? 8 : -8 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className={cn(
                        "grid h-full justify-items-center content-start overflow-hidden",
                        mode === "targets" ? targetGridClassByViewport[viewport] : syllableGridClassByViewport[viewport],
                      )}
                    >
                      {currentPageEntries.map((entry) =>
                        mode === "targets" ? (
                          <EditorTargetCollectionCard
                            key={`target-${(entry as AggregatedTargetCard).id}`}
                            entry={entry as AggregatedTargetCard}
                            viewport={viewport}
                          />
                        ) : (
                          <EditorSyllableCollectionCard
                            key={`syllable-${(entry as CatalogCardUsage).card.id}`}
                            entry={entry as CatalogCardUsage}
                            viewport={viewport}
                          />
                        ),
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <aside className="min-h-0 rounded-[1.45rem] border border-[#d8ccb8] bg-[#fffaf3]/94 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:rounded-[0.86rem] [@media(pointer:coarse)]:px-1.25 [@media(pointer:coarse)]:py-1.25">
              <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 [@media(pointer:coarse)]:gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[0.46rem] font-black uppercase tracking-[0.18em] text-[#9a7f5c] [@media(pointer:coarse)]:text-[0.34rem]">
                      Trilho de decks
                    </div>
                    <div className="truncate font-serif text-[1rem] font-black text-[#5b2408] [@media(pointer:coarse)]:text-[0.7rem]">
                      Meus Decks
                    </div>
                  </div>
                  {totalDeckPages > 1 ? (
                    <div className="text-[0.44rem] font-black uppercase tracking-[0.14em] text-[#8b7357] [@media(pointer:coarse)]:text-[0.34rem]">
                      {currentDeckPage + 1}/{totalDeckPages}
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`rail-${currentDeckPage}`}
                      initial={{ opacity: 0, x: deckPageDirection > 0 ? 26 : -26 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: deckPageDirection > 0 ? -26 : 26 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="flex h-full min-h-0 flex-col gap-2 [@media(pointer:coarse)]:gap-1.5"
                    >
                      {visibleDecks.map((deck) => (
                        <EditorDeckRailCard
                          key={deck.deckId}
                          deck={deck}
                          active={deck.deckId === activeDeck?.deckId}
                          compact={viewport !== "desktop"}
                          onClick={() => setActiveDeckId(deck.deckId)}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <CountPill icon={<LibraryBig className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                    {deckEntries.length}
                  </CountPill>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentDeckPage === 0}
                      onClick={() => handleDeckPageChange(currentDeckPage - 1)}
                      className="h-8 w-8 rounded-full border border-[#d0b98a] bg-[#fff5dd] text-[#8a6428] disabled:opacity-40 [@media(pointer:coarse)]:h-7 [@media(pointer:coarse)]:w-7"
                    >
                      <ChevronLeft className="h-4 w-4 [@media(pointer:coarse)]:h-3.5 [@media(pointer:coarse)]:w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentDeckPage >= totalDeckPages - 1}
                      onClick={() => handleDeckPageChange(currentDeckPage + 1)}
                      className="h-8 w-8 rounded-full border border-[#d0b98a] bg-[#fff5dd] text-[#8a6428] disabled:opacity-40 [@media(pointer:coarse)]:h-7 [@media(pointer:coarse)]:w-7"
                    >
                      <ChevronRight className="h-4 w-4 [@media(pointer:coarse)]:h-3.5 [@media(pointer:coarse)]:w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1.2rem] border border-[#d8ccb8] bg-[#fff9ef]/92 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:rounded-[0.8rem] [@media(pointer:coarse)]:gap-2 [@media(pointer:coarse)]:px-2 [@media(pointer:coarse)]:py-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 [@media(pointer:coarse)]:gap-1">
              <CountPill icon={<BookOpenText className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                Pagina {currentPage + 1} de {totalPages}
              </CountPill>
              <CountPill icon={<Layers3 className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                {aggregatedTargets.length} alvos
              </CountPill>
              <CountPill icon={<Sparkles className="h-3 w-3 [@media(pointer:coarse)]:h-2.5 [@media(pointer:coarse)]:w-2.5" />}>
                {syllableCards.length} silabas
              </CountPill>
            </div>

            <div className="flex items-center gap-2 [@media(pointer:coarse)]:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPage === 0}
                onClick={() => handleCollectionPageChange(currentPage - 1)}
                className="h-11 w-11 rounded-full border border-[#d0b98a] bg-[#fff5dd] text-[#8a6428] shadow-[0_8px_14px_rgba(0,0,0,0.06)] disabled:opacity-40 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8"
              >
                <ChevronLeft className="h-5 w-5 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPage >= totalPages - 1}
                onClick={() => handleCollectionPageChange(currentPage + 1)}
                className="h-11 w-11 rounded-full border border-[#d0b98a] bg-[#fff5dd] text-[#8a6428] shadow-[0_8px_14px_rgba(0,0,0,0.06)] disabled:opacity-40 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8"
              >
                <ChevronRight className="h-5 w-5 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </motion.div>
  );
};
