import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FilePlus2, Layers3, Minus, Pencil, Plus, RotateCcw, Save, Search, Sparkles, Swords, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { SyllableCard } from "../game/GameComponents";
import { ContentSyllableChips, ContentTargetRarityHeader } from "../content/ContentMicroBlocks";
import { APP_RESOLVED_DECKS } from "../../app/appDeckResolver";
import {
  CONTENT_PIPELINE,
  CONTENT_RARITY_DESCENDING,
  createContentCatalogFiltersView,
  createContentCatalogSyllableViews,
  createContentCatalogTargetViews,
  createContentDeckSummaryView,
  createDeckModel,
  filterAndSortContentTargetViews,
  getContentRarityLabel,
  getContentRaritySoftToneClass,
  getContentRarityToneClass,
  type ContentSyllableView,
  type ContentTargetView,
} from "../../data/content";
import {
  addCardToDeckBuilderDraft,
  addTargetToDeckBuilderDraft,
  createDeckBuilderDraftFromDeckModel,
  createDeckDefinitionFromBuilderDraft,
  createEmptyDeckBuilderDraft,
  getDeckBuilderCardCopies,
  getDeckBuilderTargetCopies,
  removeCardFromDeckBuilderDraft,
  removeTargetFromDeckBuilderDraft,
  type DeckBuilderDraft,
} from "../../data/content/deckBuilder";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import type { DeckDefinition, DeckModel } from "../../data/content/types";

interface CollectionScreenProps { onBack: () => void }

interface CollectionDeckEntry {
  deckId: string;
  deckModel: DeckModel;
  definition: DeckDefinition;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckDefinition["visualTheme"];
}

type DeckRailViewMode = "list" | "cards";

// ─── Card grid sizes (portrait aspect ratio ~200:275 ≈ 0.73:1) ───────────────
const CARD_W_D = 200;
const CARD_H_D = 275;
const CARD_W_C = 105;
const CARD_H_C = 158;
const SYL_W_D = 128;
const SYL_H_D = 179;
const SYL_W_C = 96;
const SYL_H_C = 134;

// ─── Pill ─────────────────────────────────────────────────────────────────────
const Pill: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode; sm?: boolean }> = ({ active, onClick, children, sm }) => (
  <button type="button" onClick={onClick} className={cn(
    "inline-flex shrink-0 touch-manipulation select-none items-center justify-center rounded-full border font-black uppercase transition-all duration-100 px-3",
    sm ? "h-7 text-[0.6rem] tracking-[0.06em]" : "h-9 text-[0.72rem] tracking-[0.1em]",
    active ? "border-[#c7a561] bg-[#fff3d6] text-[#7c5821]" : "border-[#d7ccb8] bg-white/72 text-[#7f6a52] [@media(hover:hover)]:hover:border-amber-400/50",
  )}>{children}</button>
);

// ─── DeckRailTargetRow ───────────────────────────────────────────────────────
const DeckRailTargetRow: React.FC<{ target: ContentTargetView; editable?: boolean; onRemove?: () => void }> = ({ target, editable, onRemove }) => {
  return (
    <div className="group flex items-center gap-1.5 overflow-hidden rounded-lg border border-amber-900/10 bg-white/70 px-2 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.07)] transition-all [@media(hover:hover)]:hover:bg-amber-50/90 [@media(hover:hover)]:hover:shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
      <div className={cn("h-5 w-1.5 shrink-0 rounded-full", target.rarityView.toneClass)} />
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#fffaf3] text-[1rem] shadow-sm">{target.emoji}</div>
      <span className="min-w-0 flex-1 truncate font-serif text-[0.56rem] font-black leading-tight text-[#31271e]">{target.name}</span>
      <span className="shrink-0 rounded-full border border-amber-200/70 bg-amber-50 px-1.5 py-0.5 text-[0.44rem] font-black text-amber-800">×{target.copies}</span>
      {editable && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-6 w-6 shrink-0 touch-manipulation items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition [@media(hover:hover)]:hover:bg-rose-100"
          aria-label={`Remover ${target.name} do deck`}
        >
          <Minus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

// ─── DeckBanner ───────────────────────────────────────────────────────────────
const DeckBanner: React.FC<{ deck: CollectionDeckEntry; isSelected: boolean; isDirty?: boolean; onClick: () => void }> = ({ deck, isSelected, isDirty, onClick }) => {
  const deckSummary = useMemo(() => createContentDeckSummaryView(deck.deckModel), [deck]);
  const count = deckSummary.metrics.uniqueTargets;
  const sylCount = deckSummary.metrics.totalSyllables;

  return (
    <div role="button" onClick={onClick} className={cn("relative flex w-full shrink-0 cursor-pointer select-none items-center gap-3 overflow-hidden rounded-xl border-2 px-3 py-3 text-left transition-all duration-200 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2 [@media(pointer:coarse)_and_(max-height:480px)]:px-2 [@media(pointer:coarse)_and_(max-height:480px)]:py-2", isSelected ? cn("border-white/30 ring-2 ring-white/15 shadow-md bg-gradient-to-r", DECK_VISUAL_THEME_CLASSES[deck.visualTheme]) : cn("border-[#d9c8a9] bg-gradient-to-r opacity-72 [@media(hover:hover)]:hover:opacity-95 [@media(hover:hover)]:hover:shadow-sm", DECK_VISUAL_THEME_CLASSES[deck.visualTheme]))}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.12),transparent_55%)]" />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/15 text-[1.7rem] shadow [@media(pointer:coarse)_and_(max-height:480px)]:h-10 [@media(pointer:coarse)_and_(max-height:480px)]:w-10 [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.4rem]">{deck.emoji}</div>
      <div className="relative min-w-0 flex-1 flex flex-col justify-center py-0.5">
        <div className="truncate font-serif text-[1.05rem] font-black leading-tight text-amber-50 drop-shadow-sm [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.95rem]">{deck.name}</div>
        <div className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-amber-100/65 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.55rem]">{isDirty ? "RASCUNHO LOCAL" : deck.definition.superclass || "SEM CLASSE"}</div>
        <div className="mt-2 flex items-center gap-1.5 overflow-hidden [@media(pointer:coarse)_and_(max-height:480px)]:mt-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1">
          <div className="shrink-0 rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.12em] text-amber-950 shadow-sm [@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-[1px] [@media(pointer:coarse)_and_(max-height:480px)]:text-[7.5px] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.08em]">{count} alvo{count !== 1 ? 's' : ''}</div>
          <div className="shrink-0 rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.12em] text-amber-950 shadow-sm [@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-[1px] [@media(pointer:coarse)_and_(max-height:480px)]:text-[7.5px] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.08em]">{sylCount} sílaba{sylCount !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
};

// ─── DeckRailPanel ────────────────────────────────────────────────────────────
const DeckRailPanel: React.FC<{
  decks: CollectionDeckEntry[];
  compact: boolean;
  selectedDeckId: string;
  view: DeckRailViewMode;
  isEditing: boolean;
  isDirty: boolean;
  onSelectDeck: (deckId: string) => void;
  onViewChange: (view: DeckRailViewMode) => void;
  onCreateDeck: () => void;
  onStartEdit: () => void;
  onSaveDraft: () => void;
  onCancelDraft: () => void;
  onRemoveTarget: (targetId: string) => void;
  onRemoveCard: (cardId: string) => void;
}> = ({
  decks,
  compact,
  selectedDeckId,
  view,
  isEditing,
  isDirty,
  onSelectDeck,
  onViewChange,
  onCreateDeck,
  onStartEdit,
  onSaveDraft,
  onCancelDraft,
  onRemoveTarget,
  onRemoveCard,
}) => {
  const deck = useMemo(() => decks.find((entry) => entry.deckId === selectedDeckId) ?? decks[0] ?? null, [selectedDeckId, decks]);
  const deckSummary = useMemo(() => (deck ? createContentDeckSummaryView(deck.deckModel) : null), [deck]);
  const deckTargetViews = deckSummary?.targets ?? [];
  const deckSyllableViews = deckSummary?.syllables ?? [];
  const deckTargetsByRarity = useMemo(() => { const g = {} as Record<string, typeof deckTargetViews>; CONTENT_RARITY_DESCENDING.forEach((r) => { g[r] = []; }); deckTargetViews.forEach((target) => { (g[target.rarity] ??= []).push(target); }); return g; }, [deckTargetViews]);
  const deckTargetTotal = deckSummary?.metrics.totalTargets ?? 0;
  const deckSyllableTotal = deckSummary?.metrics.totalSyllables ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1rem] border border-[#d8ccb8] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <AnimatePresence mode="wait" initial={false}>
        {view === "list" ? (
          <motion.div key="list" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.18 }} className="flex h-full flex-col">
            <div className="shrink-0 border-b border-[#d9c8a9] bg-[#fffaf3]/90 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-serif text-[1rem] font-black uppercase text-[#5b2408]">Meus Decks</div>
                  <div className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#9a7f5c]">{decks.length} decks disponíveis</div>
                </div>
                <button
                  type="button"
                  onClick={onCreateDeck}
                  className="flex h-8 shrink-0 touch-manipulation items-center gap-1 rounded-lg border border-emerald-700/20 bg-emerald-50 px-2 text-[0.58rem] font-black uppercase tracking-[0.06em] text-emerald-800 shadow-sm transition [@media(hover:hover)]:hover:bg-emerald-100"
                >
                  <FilePlus2 className="h-3.5 w-3.5" /> Novo
                </button>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#fffaf3]/94 p-3">
              {decks.map((d) => <DeckBanner key={d.deckId} deck={d} isSelected={d.deckId === selectedDeckId} isDirty={isDirty && d.deckId === selectedDeckId} onClick={() => { onSelectDeck(d.deckId); onViewChange("cards"); }} />)}
            </div>
          </motion.div>
        ) : (
          <motion.div key="cards" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.18 }} className="flex h-full flex-col">
            {deck && (
              <div className={cn("relative shrink-0 overflow-hidden px-3 py-2.5", cn("bg-gradient-to-br", DECK_VISUAL_THEME_CLASSES[deck.visualTheme]))}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_55%)]" />
                <div className="relative flex items-center gap-2">
                  <button type="button" onClick={() => onViewChange("list")} className="flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/25 bg-black/20 text-amber-50 transition-all [@media(hover:hover)]:hover:bg-black/30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/15 text-[1.4rem] shadow">{deck.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-[1rem] font-black leading-none text-amber-50">{deck.name}</div>
                    <div className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-amber-100/65">{isEditing ? "Editando deck" : deck.definition.superclass}</div>
                  </div>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={onStartEdit}
                      className="flex h-7 shrink-0 touch-manipulation items-center gap-1 rounded-lg border border-white/25 bg-black/20 px-2 text-[0.55rem] font-black uppercase tracking-[0.06em] text-amber-50 transition [@media(hover:hover)]:hover:bg-black/30"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={onCancelDraft}
                        className="flex h-7 touch-manipulation items-center gap-1 rounded-lg border border-white/20 bg-black/20 px-2 text-[0.52rem] font-black uppercase tracking-[0.05em] text-amber-50 transition [@media(hover:hover)]:hover:bg-black/30"
                      >
                        <X className="h-3 w-3" /> Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={!isDirty}
                        className="flex h-7 touch-manipulation items-center gap-1 rounded-lg border border-emerald-200/55 bg-emerald-50 px-2 text-[0.52rem] font-black uppercase tracking-[0.05em] text-emerald-800 transition disabled:opacity-45 [@media(hover:hover)]:hover:bg-emerald-100"
                      >
                        <Save className="h-3 w-3" /> Salvar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto px-2.5 py-2">
              {CONTENT_RARITY_DESCENDING.map((rk) => {
                const grp = deckTargetsByRarity[rk]; if (!grp?.length) return null;
                return (
                  <div key={rk} className="mb-2">
                    <div className={cn("mb-1.5 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6rem] font-black uppercase", getContentRaritySoftToneClass(rk))}>
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", getContentRarityToneClass(rk))} />{getContentRarityLabel(rk)}
                    </div>
                    <div className="flex flex-col gap-1">
                      {grp.map((t) => <DeckRailTargetRow key={t.id} target={t} editable={isEditing} onRemove={() => onRemoveTarget(t.id)} />)}
                    </div>
                  </div>
                );
              })}
              {deckSyllableViews.length > 0 && (
                <div className="mb-1">
                  <div className="mb-1.5 flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50/82 px-2 py-0.5 text-[0.6rem] font-black uppercase text-slate-600">
                    <Sparkles className="h-2.5 w-2.5" />Sílabas
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {deckSyllableViews.map((s, i) => (
                      <span key={`${s.syllable}-${i}`} className="inline-flex items-center gap-0.5 rounded-full border border-amber-200/60 bg-amber-50/80 px-2 py-0.5 text-[0.58rem] font-black text-amber-800">
                        {s.syllable}<span className="rounded-full bg-amber-200/55 px-1 text-[0.48rem]">×{s.copies ?? 0}</span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => onRemoveCard(s.cardId)}
                            className="-mr-1 ml-0.5 flex h-4 w-4 touch-manipulation items-center justify-center rounded-full bg-rose-100 text-rose-700"
                            aria-label={`Remover carta ${s.syllable} do deck`}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-[#d9c8a9] bg-[#fffaf3]/96 px-3 py-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="font-serif text-[1.3rem] font-black text-[#5b2408]">{deckTargetTotal}</div>
                    <div className="text-[0.54rem] font-black uppercase tracking-[0.1em] text-[#9a7f5c]">Alvos</div>
                  </div>
                  <div className="h-5 w-px bg-[#d9c8a9]" />
                  <div className="text-center">
                    <div className="font-serif text-[1.3rem] font-black text-[#5b2408]">{deckSyllableTotal}</div>
                    <div className="text-[0.54rem] font-black uppercase tracking-[0.1em] text-[#9a7f5c]">Sílabas</div>
                  </div>
                </div>
                <div className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.06em]", deckTargetTotal >= 2 ? "border-emerald-300/70 bg-emerald-50 text-emerald-700" : "border-amber-300/70 bg-amber-50 text-amber-700")}>
                  <Swords className="h-3 w-3" />{isEditing ? (isDirty ? "Alterado" : "Sem mudanças") : deckTargetTotal >= 2 ? "Pronto" : "Montar"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CollectionTargetCard: React.FC<{ target: ContentTargetView }> = ({ target }) => {
  return (
    <div className="relative flex h-full w-full items-start justify-center pb-2 text-center [@media(pointer:coarse)_and_(max-height:480px)]:pb-1">
      <div className="card-base relative flex w-full aspect-[126/176] h-full flex-col overflow-hidden rounded-[1.1rem] border border-amber-900/20 shadow-[0_14px_26px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(0,0,0,0.18)] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.85rem]">

        <ContentTargetRarityHeader rarityView={target.rarityView} damage={target.damage} />

        <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-1.5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_42%)]" />
          <div className="relative translate-y-3 text-[4.9rem] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] [@media(pointer:coarse)_and_(max-height:480px)]:translate-y-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:text-[3.2rem]">
            {target.emoji || "?"}
          </div>
        </div>

        <div className="mt-auto shrink-0 bg-[#fffdf5]/95 px-2.5 pb-2.5 pt-4 [@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:pb-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:pt-2.5">
          <div className="truncate text-center font-serif text-[0.82rem] font-black tracking-tight text-amber-950 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.65rem]">
            {target.name || "NOVO ALVO"}
          </div>

          <ContentSyllableChips
            syllables={target.syllables}
            idPrefix={target.id}
            className="mt-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:mt-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-0.5"
            chipClassName="[@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:text-[7.5px] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.1em]"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
      </div>
    </div>
  );
};

// ─── Card Preview Overlay (hold-to-reveal) ────────────────────────────────────
const CardPreviewOverlay: React.FC<{
  target: ContentTargetView;
  originX: number;
  isDesktop?: boolean;
  copies?: number;
  onClose: () => void;
}> = ({ target, originX, isDesktop = false, copies, onClose }) => {
  const damage = target.damage;
  const syllables = target.syllables;
  const toneClass = target.rarityView.toneClass;

  // Determine layout side: if press was on right half, show infopanel LEFT of card
  const cardW = isDesktop ? 300 : 240;
  const cardH = isDesktop ? 420 : 336;
  const infoW = isDesktop ? "w-[300px]" : "w-[240px]";

  const pressedLeft = typeof window !== "undefined" ? originX <= window.innerWidth / 2 : true;
  // pressedLeft => card LEFT, info RIGHT; pressedRight => info LEFT, card RIGHT

  const cardEl = (
    <motion.div
      initial={{ scale: 0.72, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.72, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative flex-shrink-0"
      style={{ width: cardW, height: cardH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="card-base relative flex h-full w-full flex-col overflow-hidden rounded-[1.4rem] border-2 border-amber-300/60 shadow-[0_32px_64px_rgba(0,0,0,0.45)] ring-4 ring-amber-300/25">
        <div className={cn("flex h-12 items-center justify-between border-b-2 border-[#d4af37] px-4 text-[11px] font-black uppercase text-white", toneClass)}>
          <span>{getContentRarityLabel(target.rarity, { uppercase: true })}</span>
          <div className="flex items-center gap-1.5"><Swords className="h-4 w-4" /><span>{damage}</span></div>
        </div>
        <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_42%)]" />
          <div className="relative translate-y-4 text-[7rem] leading-none drop-shadow-[0_14px_22px_rgba(0,0,0,0.28)]">{target.emoji || "?"}</div>
        </div>
        <div className="mt-auto shrink-0 bg-[#fffdf5]/95 px-3 pb-3 pt-5">
          <div className="text-center font-serif text-[1rem] font-black tracking-tight text-amber-950">{target.name || "ALVO"}</div>
          <ContentSyllableChips syllables={syllables} idPrefix={`${target.id}-preview-card`} className="mt-2" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-b-full bg-white/20" />
      </div>
    </motion.div>
  );

  const infoEl = (
    <motion.div
      initial={{ opacity: 0, x: pressedLeft ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: pressedLeft ? 24 : -24 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
      className={cn("paper-panel flex flex-shrink-0 flex-col gap-4 rounded-[1.5rem] border-2 border-[#8d6e63]/30 p-5 shadow-[0_24px_56px_rgba(0,0,0,0.35)]", infoW)}
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-sm", toneClass)}>
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          {getContentRarityLabel(target.rarity, { uppercase: true })}
        </div>
        <div className="mt-3 font-serif text-2xl font-black leading-tight tracking-tight text-amber-950">{target.name}</div>
        {target.description && (
          <p className="mt-2 text-[12px] leading-relaxed text-amber-900/70">{target.description}</p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">Dano</div>
          <div className="flex items-center gap-2">
            {Array.from({ length: damage }).map((_, i) => (
              <Swords key={i} className="h-4 w-4 text-amber-700" />
            ))}
            <span className="font-serif text-lg font-black text-amber-950">{damage}</span>
          </div>
        </div>

        <div>
          {/* TODO: exibir aqui o número de cópias que o player tem no inventário pessoal dele,
              em vez do total do pool compartilhado do catálogo */}
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">Cópias</div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-black text-amber-950">{copies ?? 0}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-900/50">no pool</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">S\u00edlabas ({syllables.length})</div>
          <ContentSyllableChips
            syllables={syllables}
            idPrefix={`${target.id}-preview-info`}
            className="justify-start gap-1.5"
            chipClassName="border-amber-900/15 bg-amber-50 px-3 py-1 text-[11px] tracking-[0.1em]"
          />
        </div>

        {(target.superclass || target.classKey) && (
          <div>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">Taxonomia</div>
            <div className="flex flex-wrap gap-1.5">
              {target.superclass && <span className="rounded-full border border-amber-900/12 bg-white/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-900">{target.superclass}</span>}
              {target.classKey && <span className="rounded-full border border-amber-900/12 bg-white/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-900">{target.classKey}</span>}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="overlay-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className={cn("flex items-center gap-6", !pressedLeft && "flex-row-reverse")}>
          {cardEl}
          {infoEl}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ onBack }) => {
  const catalog = CONTENT_PIPELINE.catalog;
  const baseDeckEntries = useMemo<CollectionDeckEntry[]>(
    () =>
      APP_RESOLVED_DECKS.map((deck) => ({
        deckId: deck.deckId,
        deckModel: deck.deckModel,
        definition: deck.definition,
        name: deck.name,
        description: deck.description,
        emoji: deck.emoji,
        visualTheme: deck.visualTheme,
      })),
    [],
  );
  const [localDeckDefinitions, setLocalDeckDefinitions] = useState<DeckDefinition[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState(() => baseDeckEntries[0]?.deckId ?? "");
  const [deckRailView, setDeckRailView] = useState<DeckRailViewMode>("list");
  const [deckDraft, setDeckDraft] = useState<DeckBuilderDraft | null>(null);
  const [sidebar, setSidebar] = useState<"decks" | "filters">("decks");
  const [mode, setMode] = useState<"targets" | "syllables">("targets");
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [search, setSearch] = useState("");
  const [superF, setSuperF] = useState("all");
  const [classF, setClassF] = useState("all");
  const [rarF, setRarF] = useState("all");
  const [sortMode, setSortMode] = useState<"default" | "rarity" | "damage">("default");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const dSearch = useDeferredValue(search.trim().toLowerCase());

  // ─── Hold-to-reveal preview state ───────────────────────────────────────────
  const [preview, setPreview] = useState<ContentTargetView | null>(null);
  const [previewOriginX, setPreviewOriginX] = useState(0);
  const [previewIsDesktop, setPreviewIsDesktop] = useState(false);
  const [previewCopies, setPreviewCopies] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  const [isBackPressed, setIsBackPressed] = useState(false);
  const backTouchActivatedRef = useRef(false);

  const collectionDecks = useMemo<CollectionDeckEntry[]>(() => {
    const overridesById = new Map(localDeckDefinitions.map((definition) => [definition.id, definition]));
    const baseDeckIds = new Set(baseDeckEntries.map((entry) => entry.deckId));
    const resolvedBaseEntries = baseDeckEntries.map((entry) => {
      const override = overridesById.get(entry.deckId);
      if (!override) return entry;
      const deckModel = createDeckModel(override, catalog);

      return {
        deckId: override.id,
        deckModel,
        definition: override,
        name: override.name,
        description: override.description,
        emoji: override.emoji,
        visualTheme: override.visualTheme,
      };
    });
    const localOnlyEntries = localDeckDefinitions
      .filter((definition) => !baseDeckIds.has(definition.id))
      .map((definition) => {
        const deckModel = createDeckModel(definition, catalog);

        return {
          deckId: definition.id,
          deckModel,
          definition,
          name: definition.name,
          description: definition.description,
          emoji: definition.emoji,
          visualTheme: definition.visualTheme,
        };
      });

    return [...resolvedBaseEntries, ...localOnlyEntries];
  }, [baseDeckEntries, catalog, localDeckDefinitions]);

  const draftDeckDefinition = useMemo(
    () => (deckDraft ? createDeckDefinitionFromBuilderDraft(deckDraft, catalog) : null),
    [catalog, deckDraft],
  );
  const draftDeckModel = useMemo(
    () => (draftDeckDefinition ? createDeckModel(draftDeckDefinition, catalog) : null),
    [catalog, draftDeckDefinition],
  );
  const visibleDecks = useMemo<CollectionDeckEntry[]>(() => {
    if (!draftDeckDefinition || !draftDeckModel) return collectionDecks;

    const draftEntry: CollectionDeckEntry = {
      deckId: draftDeckDefinition.id,
      deckModel: draftDeckModel,
      definition: draftDeckDefinition,
      name: draftDeckDefinition.name,
      description: draftDeckDefinition.description,
      emoji: draftDeckDefinition.emoji,
      visualTheme: draftDeckDefinition.visualTheme,
    };
    let replaced = false;
    const entries = collectionDecks.map((entry) => {
      if (entry.deckId !== draftEntry.deckId) return entry;
      replaced = true;
      return draftEntry;
    });

    return replaced ? entries : [...entries, draftEntry];
  }, [collectionDecks, draftDeckDefinition, draftDeckModel]);
  const selectedDeck = useMemo(
    () => visibleDecks.find((entry) => entry.deckId === selectedDeckId) ?? visibleDecks[0] ?? null,
    [selectedDeckId, visibleDecks],
  );
  const persistedDraftBaseline = useMemo(() => {
    if (!deckDraft) return null;
    const persistedDeck = collectionDecks.find((entry) => entry.deckId === deckDraft.id);
    return persistedDeck ? createDeckBuilderDraftFromDeckModel(persistedDeck.deckModel) : null;
  }, [collectionDecks, deckDraft]);
  const isDeckDraftDirty = Boolean(
    deckDraft && (!persistedDraftBaseline || JSON.stringify(deckDraft) !== JSON.stringify(persistedDraftBaseline)),
  );
  const draftTargetCopies = useMemo(() => (deckDraft ? getDeckBuilderTargetCopies(deckDraft) : {}), [deckDraft]);
  const draftCardCopies = useMemo(() => (deckDraft ? getDeckBuilderCardCopies(deckDraft) : {}), [deckDraft]);

  useEffect(() => {
    if (visibleDecks.some((entry) => entry.deckId === selectedDeckId)) return;
    setSelectedDeckId(visibleDecks[0]?.deckId ?? "");
  }, [selectedDeckId, visibleDecks]);

  const handleSelectDeck = (deckId: string) => {
    if (deckDraft && deckId !== deckDraft.id) {
      setDeckDraft(null);
    }
    setSelectedDeckId(deckId);
  };

  const handleCreateDeck = () => {
    const draft = createEmptyDeckBuilderDraft(catalog, visibleDecks.map((entry) => entry.deckId));
    setDeckDraft(draft);
    setSelectedDeckId(draft.id);
    setDeckRailView("cards");
    setSidebar("decks");
    setMode("targets");
  };

  const handleStartEditDeck = () => {
    if (!selectedDeck) return;
    setDeckDraft(createDeckBuilderDraftFromDeckModel(selectedDeck.deckModel));
    setDeckRailView("cards");
    setSidebar("decks");
  };

  const handleSaveDeckDraft = () => {
    if (!deckDraft || !draftDeckDefinition) return;
    setLocalDeckDefinitions((current) => {
      const next = current.filter((definition) => definition.id !== draftDeckDefinition.id);
      return [...next, draftDeckDefinition];
    });
    setSelectedDeckId(draftDeckDefinition.id);
    setDeckDraft(null);
    setDeckRailView("cards");
  };

  const handleCancelDeckDraft = () => {
    const fallbackDeckId = collectionDecks.some((entry) => entry.deckId === selectedDeckId)
      ? selectedDeckId
      : collectionDecks[0]?.deckId ?? "";
    setDeckDraft(null);
    setSelectedDeckId(fallbackDeckId);
    setDeckRailView(fallbackDeckId ? "cards" : "list");
  };

  const handleAddTargetToDraft = (target: ContentTargetView) => {
    const targetDefinition = target.definition ?? catalog.targetsById[target.id];
    if (!targetDefinition) return;
    setDeckDraft((current) => (current ? addTargetToDeckBuilderDraft(current, targetDefinition) : current));
  };

  const handleRemoveTargetFromDraft = (targetId: string) => {
    const targetDefinition = catalog.targetsById[targetId];
    if (!targetDefinition) return;
    setDeckDraft((current) => (current ? removeTargetFromDeckBuilderDraft(current, targetDefinition) : current));
  };

  const handleAddCardToDraft = (cardId: string) => {
    const card = catalog.cardsById[cardId];
    if (!card) return;
    setDeckDraft((current) => (current ? addCardToDeckBuilderDraft(current, card) : current));
  };

  const handleRemoveCardFromDraft = (cardId: string) => {
    const card = catalog.cardsById[cardId];
    if (!card) return;
    setDeckDraft((current) => (current ? removeCardFromDeckBuilderDraft(current, card) : current));
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressStart.current = null;
  };

  const makeLongPressProps = (target: ContentTargetView) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const ox = e.clientX;
      // Desktop (mouse): open immediately on click
      if (e.pointerType === "mouse") {
        setPreviewOriginX(ox);
        setPreviewIsDesktop(true);
        setPreviewCopies(deckDraft ? draftTargetCopies[target.id] ?? 0 : target.copies);
        setPreview(target);
        return;
      }
      // Touch / pen: require hold of 450ms
      longPressStart.current = { x: e.clientX, y: e.clientY };
      longPressTimer.current = setTimeout(() => {
        setPreviewOriginX(ox);
        setPreviewIsDesktop(false);
        setPreviewCopies(deckDraft ? draftTargetCopies[target.id] ?? 0 : target.copies);
        setPreview(target);
        longPressStart.current = null;
      }, 450);
    },
    onPointerUp: (e: React.PointerEvent) => { if (e.pointerType !== "mouse") cancelLongPress(); },
    onPointerCancel: cancelLongPress,
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" || !longPressStart.current) return;
      const dx = e.clientX - longPressStart.current.x;
      const dy = e.clientY - longPressStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 9) cancelLongPress();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const handleBackPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    backTouchActivatedRef.current = false;
    setIsBackPressed(true);
  };
  const handleBackPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if (isBackPressed) {
      backTouchActivatedRef.current = true;
      onBack();
    }
    setIsBackPressed(false);
  };
  const handleBackPointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    setIsBackPressed(false);
  };
  const handleBackClick = (e: React.MouseEvent) => {
    if (backTouchActivatedRef.current) {
      backTouchActivatedRef.current = false;
      e.preventDefault();
      return;
    }
    setIsBackPressed(false);
    onBack();
  };

  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-height: 480px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (max-height: 480px)");
    setCompact(mq.matches);
    const h = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
  }, []);

  const targetViews = useMemo(
    () => createContentCatalogTargetViews(CONTENT_PIPELINE.catalog, { deckModels: CONTENT_PIPELINE.deckModels }),
    [],
  );
  const syllableViews = useMemo(() => createContentCatalogSyllableViews(CONTENT_PIPELINE.catalog), []);
  const filterOptionsView = useMemo(
    () => createContentCatalogFiltersView(targetViews, { superclassFilter: superF }),
    [targetViews, superF],
  );
  const superclassOptions = filterOptionsView.superclassOptions;
  const classOptions = filterOptionsView.classOptions;

  const filteredTargetViews = useMemo(() => {
    return filterAndSortContentTargetViews(targetViews, {
      search: dSearch,
      superclass: superF,
      classKey: classF,
      rarity: rarF,
      sortMode,
      sortDirection: sortDir,
    });
  }, [targetViews, superF, classF, rarF, dSearch, sortMode, sortDir]);

  const filteredSyllableViews = useMemo(() => !dSearch ? syllableViews : syllableViews.filter((c) => c.syllable.toLowerCase().includes(dSearch)), [syllableViews, dSearch]);

  // Cards per page based on grid dimensions:
  // Desktop and Compact targets: 4 cols × 2 rows = 8
  // Desktop syllables: 6 cols × 3 rows = 18 | Compact syllables: 4 cols × 2 rows = 8
  const perPage = compact
    ? (mode === "targets" ? 8 : 8)
    : (mode === "targets" ? 8 : 18);

  const pageSourceItems = mode === "targets" ? filteredTargetViews : filteredSyllableViews;
  const totalPages = Math.max(1, Math.ceil(pageSourceItems.length / perPage));
  const curPage = Math.min(page, totalPages - 1);
  const pageItems = pageSourceItems.slice(curPage * perPage, curPage * perPage + perPage);

  useEffect(() => { setPage(0); }, [mode, superF, classF, rarF, dSearch, sortMode, sortDir]);
  const goPage = (n: number) => { const c = Math.max(0, Math.min(totalPages - 1, n)); if (c === curPage) return; setDir(c > curPage ? 1 : -1); setPage(c); };

  // Card and grid dimensions
  const cardW = compact ? CARD_W_C : CARD_W_D;
  const cardH = compact ? CARD_H_C : CARD_H_D;
  const sylW = compact ? SYL_W_C : SYL_W_D;
  const sylH = compact ? SYL_H_C : SYL_H_D;

  const targetCols = 4;
  const sylCols = compact ? 4 : 6;
  const targetRows = 2;
  const sylRows = compact ? 2 : 3;
  const gap = compact ? 8 : 16;

  const gridStyle = mode === "targets"
    ? { gridTemplateColumns: `repeat(${targetCols}, minmax(0, ${cardW}px))`, gridTemplateRows: `repeat(${targetRows}, minmax(0, 1fr))`, height: "100%", gap }
    : { gridTemplateColumns: `repeat(${sylCols}, minmax(0, ${sylW}px))`, gridTemplateRows: `repeat(${sylRows}, minmax(0, 1fr))`, height: "100%", gap };

  const panelW = compact ? "w-[min(40%,220px)]" : "w-[300px] xl:w-[340px]";

  return (
    <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.26, ease: "easeOut" }} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ece3d3] p-1.5 text-[#31271e] sm:p-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#fff8ee_0%,#efe4d1_58%,#e2d2bb_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-55" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(120,92,64,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,92,64,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

      <div className="paper-panel relative z-10 h-[min(96vh,54rem)] w-[min(98vw,120rem)] overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-3 py-3 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[calc(100dvh-6px)] [@media(pointer:coarse)_and_(max-height:480px)]:w-[calc(100vw-6px)] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.1rem] [@media(pointer:coarse)_and_(max-height:480px)]:p-[11px] [@media(pointer:coarse)]:h-[calc(100dvh-8px)] [@media(pointer:coarse)]:w-[calc(100vw-8px)] sm:px-5 sm:py-5">
        <div className="absolute inset-y-[12px] left-[12px] right-[12px] rounded-[1.45rem] border border-[#d9c8a9] [@media(pointer:coarse)_and_(max-height:480px)]:inset-y-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.95rem]" />
        <div className="pointer-events-none absolute bottom-[14px] left-[8px] right-[8px] top-[14px] rounded-[1.2rem] border border-white/30 [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[3px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[3px] [@media(pointer:coarse)_and_(max-height:480px)]:top-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.8rem]" />

        <div className="relative flex h-full min-h-0 flex-row gap-2 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.5">
          {/* ── Left Content (Toolbar + Grid) ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.5">

            {/* ── Toolbar ── */}
            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden rounded-[1rem] border border-[#d8ccb8] bg-[#fffaf3]/92 px-2 py-[0.85rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)_and_(max-height:480px)]:gap-1 [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.7rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-[0.55rem] no-scrollbar">
              {/* Voltar */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackClick}
                onPointerDown={handleBackPointerDown}
                onPointerUp={handleBackPointerUp}
                onPointerCancel={handleBackPointerCancel}
                onPointerLeave={handleBackPointerCancel}
                className={cn(
                  "relative flex shrink-0 touch-manipulation select-none items-center gap-1.5 overflow-hidden rounded-[0.85rem] border-[2px] border-[#8f5f12] bg-[#f0dfc4] font-serif font-black uppercase text-[#6b4723] shadow-[0_5px_0_#8f5f12,0_12px_22px_rgba(88,52,8,0.16)] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[0_7px_0_#8f5f12,0_16px_26px_rgba(88,52,8,0.2)] [@media(hover:hover)]:active:translate-y-[3px] [@media(hover:hover)]:active:shadow-[0_2px_0_#8f5f12,0_8px_12px_rgba(88,52,8,0.12)]",
                  isBackPressed ? "translate-y-[3px] shadow-[0_2px_0_#8f5f12,0_8px_12px_rgba(88,52,8,0.12)]" : "",
                  compact ? "h-7 px-2 text-[0.55rem] tracking-[0.05em]" : "h-9 px-3 text-[0.65rem] tracking-[0.07em]"
                )}
              >
                <span className="pointer-events-none absolute inset-[2px] rounded-[0.65rem] border border-white/22" />
                <ChevronLeft className="relative z-10 h-3.5 w-3.5 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                <span className="relative z-10 hidden sm:inline">Voltar</span>
              </Button>

              <div className="h-5 w-px shrink-0 bg-amber-900/12" />

              {/* Mode toggle */}
              <div className={cn("flex shrink-0 items-center justify-center", compact ? "gap-1" : "gap-1.5")}>
                <Pill sm={compact} active={mode === "targets"} onClick={() => setMode("targets")}>Alvos</Pill>
                <Pill sm={compact} active={mode === "syllables"} onClick={() => setMode("syllables")}>Sílabas</Pill>
              </div>

              <div className="flex-1" />

              {deckDraft && (
                <div className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-700/20 bg-emerald-50 px-3 font-black uppercase tracking-[0.08em] text-emerald-800 shadow-sm",
                  compact ? "h-7 text-[0.52rem]" : "h-9 text-[0.6rem]",
                )}>
                  <Pencil className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                  Editando
                </div>
              )}

              {/* Sorting — Toolbar */}
              {mode === "targets" && (
                <div className={cn("flex shrink-0 items-center", compact ? "gap-1" : "gap-1.5")}>
                  {!compact && <div className="mr-1 flex h-5 w-px bg-amber-900/12" />}
                  <Pill sm={compact} active={sortMode === "rarity"} onClick={() => { if (sortMode === "rarity") setSortMode("default"); else setSortMode("rarity"); }}>
                    <Layers3 className={cn("mr-1", compact ? "h-3 w-3" : "h-3.5 w-3.5")} /> Raridade
                  </Pill>
                  <Pill sm={compact} active={sortMode === "damage"} onClick={() => { if (sortMode === "damage") setSortMode("default"); else setSortMode("damage"); }}>
                    <Swords className={cn("mr-1", compact ? "h-3 w-3" : "h-3.5 w-3.5")} /> Dano
                  </Pill>
                  <button
                    type="button"
                    disabled={sortMode === "default"}
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-full border border-[#d7ccb8] bg-white text-[#7f6a52] transition-all disabled:opacity-30",
                      compact ? "h-7 w-7" : "h-9 w-9",
                      sortMode !== "default" && "border-amber-400 bg-amber-50 text-amber-800"
                    )}
                  >
                    {sortDir === "desc" ? <ArrowDown className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} /> : <ArrowUp className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />}
                  </button>
                </div>
              )}

              {/* Page Indicator — moved from grid to toolbar */}
              {totalPages > 1 && (
                <span className={cn(
                  "shrink-0 flex items-center justify-center rounded-full border border-[#d9c8a9]/70 bg-[#fffdfa]/90 font-black tracking-widest text-[#8b7357] shadow-sm",
                  compact ? "h-7 px-3 text-[0.5rem]" : "h-9 px-4 text-[0.6rem]",
                )}>
                  {curPage + 1} / {totalPages}
                </span>
              )}

              {/* FILTERS TOGGLE */}
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSidebar((s) => (s === "decks" ? "filters" : "decks"))}
                  className={cn(
                    "relative flex shrink-0 touch-manipulation select-none items-center gap-1.5 overflow-hidden rounded-[0.85rem] border-[2px] font-serif font-black uppercase transition-all [@media(hover:hover)]:hover:-translate-y-px",
                    sidebar === "filters"
                      ? "border-[#8f5f12] bg-[#f0dfc4] text-[#6b4723] shadow-[0_4px_0_#8f5f12]"
                      : "border-[#d7ccb8] bg-white/72 text-[#7f6a52] [@media(hover:hover)]:hover:border-amber-400/50",
                    compact ? "h-7 px-2 text-[0.55rem] tracking-[0.05em]" : "h-9 px-3 text-[0.65rem] tracking-[0.07em]"
                  )}
                >
                  {sidebar === "filters" && <span className="pointer-events-none absolute inset-[2px] rounded-[0.65rem] border border-white/22" />}
                  <Sparkles className="relative z-10 h-3.5 w-3.5 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                  <span className="relative z-10">Filtros</span>
                </Button>
              </div>
            </div>

            {/* Card pool panel */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[1.1rem] border border-[#d8ccb8] bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,248,235,0.78))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.82rem] [@media(pointer:coarse)_and_(max-height:480px)]:p-2">

              {/* Card grid — explicit pixel sizes for proper portrait proportions */}
              <div className="relative flex min-h-0 flex-1 items-center justify-between">

                {/* Prev Button */}
                <div className="flex w-12 justify-start shrink-0 z-10 [@media(pointer:coarse)_and_(max-height:480px)]:w-8">
                  <button type="button" onClick={() => goPage(curPage - 1)} disabled={curPage === 0} className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border-[2px] border-[#d0b98a] bg-[#fffaf3] text-[#8a6428] shadow-sm disabled:opacity-35 transition-all [@media(hover:hover)]:hover:-translate-x-1 [@media(pointer:coarse)_and_(max-height:480px)]:h-8 [@media(pointer:coarse)_and_(max-height:480px)]:w-8">
                    <ChevronLeft className="h-5 w-5 [@media(pointer:coarse)_and_(max-height:480px)]:h-4 [@media(pointer:coarse)_and_(max-height:480px)]:w-4" />
                  </button>
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden h-full">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${mode}-${superF}-${classF}-${rarF}-${dSearch}-${sortMode}-${sortDir}-${curPage}`}
                      initial={{ opacity: 0, x: dir > 0 ? 32 : -32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir > 0 ? -32 : 32 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="grid w-full justify-center"
                      style={gridStyle}
                    >
                      {pageItems.map((entry, i) => {
                        if (mode === "targets") {
                          const targetEntry = entry as ContentTargetView;
                          return (
                          <div
                            key={targetEntry.id}
                            style={{ width: "100%", maxWidth: cardW, height: "100%", maxHeight: cardH }}
                            className="relative flex items-center justify-center select-none"
                            {...makeLongPressProps(targetEntry)}
                          >
                            <CollectionTargetCard target={targetEntry} />
                            {deckDraft && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddTargetToDraft(targetEntry);
                                }}
                                className="absolute bottom-2 right-2 z-10 flex h-9 min-w-9 touch-manipulation items-center justify-center gap-1 rounded-lg border-[2px] border-emerald-700/30 bg-emerald-50 px-2 font-serif text-[0.62rem] font-black uppercase tracking-[0.06em] text-emerald-800 shadow-[0_4px_0_rgba(4,120,87,0.25),0_10px_18px_rgba(15,23,42,0.18)] transition [@media(hover:hover)]:hover:-translate-y-px [@media(pointer:coarse)_and_(max-height:480px)]:bottom-1 [@media(pointer:coarse)_and_(max-height:480px)]:right-1 [@media(pointer:coarse)_and_(max-height:480px)]:h-7 [@media(pointer:coarse)_and_(max-height:480px)]:min-w-7 [@media(pointer:coarse)_and_(max-height:480px)]:px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.5rem]"
                                aria-label={`Adicionar ${targetEntry.name} ao deck`}
                              >
                                <Plus className="h-3.5 w-3.5 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
                                <span className="[@media(pointer:coarse)_and_(max-height:480px)]:sr-only">Add</span>
                                {(draftTargetCopies[targetEntry.id] ?? 0) > 0 && (
                                  <span className="rounded-full bg-emerald-200/80 px-1 text-[0.5rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.45rem]">
                                    ×{draftTargetCopies[targetEntry.id]}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                          );
                        }

                        const syllableEntry = entry as ContentSyllableView;
                        return (
                          <div key={`${syllableEntry.id}-${i}`} style={{ width: "100%", maxWidth: sylW, height: sylH }} className="relative flex justify-center pb-2 [@media(pointer:coarse)_and_(max-height:480px)]:pb-1">
                            <div className="origin-top scale-[0.85] [@media(pointer:coarse)_and_(max-height:480px)]:scale-[0.72]">
                              <SyllableCard syllable={syllableEntry.syllable} selected={false} playable={false} disabled={false} staticDisplay onClick={() => { }} sizePreset="hand-desktop" />
                            </div>
                            {deckDraft && (
                              <button
                                type="button"
                                onClick={() => handleAddCardToDraft(syllableEntry.cardId)}
                                className="absolute bottom-1 right-1 z-10 flex h-7 min-w-7 touch-manipulation items-center justify-center gap-1 rounded-lg border border-emerald-700/25 bg-emerald-50 px-1.5 text-[0.55rem] font-black text-emerald-800 shadow-sm"
                                aria-label={`Adicionar carta ${syllableEntry.syllable} ao deck`}
                              >
                                <Plus className="h-3 w-3" />
                                {(draftCardCopies[syllableEntry.cardId] ?? 0) > 0 && (
                                  <span className="rounded-full bg-emerald-200/80 px-1 text-[0.48rem]">
                                    ×{draftCardCopies[syllableEntry.cardId]}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {pageItems.length === 0 && (
                        <div style={{ gridColumn: `1 / ${mode === "targets" ? targetCols + 1 : sylCols + 1}` }} className="flex flex-col items-center justify-center py-16 opacity-50">
                          <span className="text-[3rem]">🃏</span>
                          <span className="mt-2 font-serif text-[1rem] font-black text-[#8b7357]">Nenhuma carta</span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Next Button */}
                <div className="flex w-12 justify-end shrink-0 z-10 [@media(pointer:coarse)_and_(max-height:480px)]:w-8">
                  <button type="button" onClick={() => goPage(curPage + 1)} disabled={curPage >= totalPages - 1} className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border-[2px] border-[#d0b98a] bg-[#fffaf3] text-[#8a6428] shadow-sm disabled:opacity-35 transition-all [@media(hover:hover)]:hover:translate-x-1 [@media(pointer:coarse)_and_(max-height:480px)]:h-8 [@media(pointer:coarse)_and_(max-height:480px)]:w-8">
                    <ChevronRight className="h-5 w-5 [@media(pointer:coarse)_and_(max-height:480px)]:h-4 [@media(pointer:coarse)_and_(max-height:480px)]:w-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar rail */}
          <div className={cn("min-h-0 shrink-0", panelW)}>
            <AnimatePresence mode="wait" initial={false}>
              {sidebar === "decks" ? (
                <motion.div key="decks" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.18 }} className="h-full">
                  <DeckRailPanel
                    decks={visibleDecks}
                    compact={compact}
                    selectedDeckId={selectedDeck?.deckId ?? selectedDeckId}
                    view={deckRailView}
                    isEditing={Boolean(deckDraft)}
                    isDirty={isDeckDraftDirty}
                    onSelectDeck={handleSelectDeck}
                    onViewChange={setDeckRailView}
                    onCreateDeck={handleCreateDeck}
                    onStartEdit={handleStartEditDeck}
                    onSaveDraft={handleSaveDeckDraft}
                    onCancelDraft={handleCancelDeckDraft}
                    onRemoveTarget={handleRemoveTargetFromDraft}
                    onRemoveCard={handleRemoveCardFromDraft}
                  />
                </motion.div>
              ) : (
                <motion.div key="filters" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.18 }} className="flex h-full flex-col overflow-hidden rounded-[1rem] border border-[#d8ccb8] bg-[#fffaf3]/94 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex shrink-0 items-center justify-between border-b border-[#d9c8a9] bg-[#fffaf3]/90 px-4 py-2.5">
                    <div className="font-serif text-[1rem] font-black uppercase text-[#5b2408]">Filtros e Busca</div>
                    <button type="button" onClick={() => setSidebar("decks")} className="flex h-6 w-6 touch-manipulation items-center justify-center rounded-full bg-amber-900/10 text-[0.65rem] font-black text-amber-950 transition hover:bg-amber-900/20">X</button>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3 no-scrollbar pb-10">
                    {/* Search */}
                    <div className="space-y-1.5">
                      <label className="ml-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-950/60">Buscar</label>
                      <div className="relative flex items-center">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-950/40" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome ou ID" className="h-10 w-full rounded-xl border border-amber-900/15 bg-white/70 pl-8 pr-2 text-[0.8rem] font-bold text-amber-950 outline-none transition placeholder:text-amber-950/40 placeholder:font-normal focus:border-amber-500/40 focus:bg-white shadow-sm" />
                      </div>
                    </div>

                    {/* Superclass */}
                    {superclassOptions.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="ml-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-950/60">Superclasse</label>
                        <select value={superF} onChange={(e) => { setSuperF(e.target.value); setClassF("all"); }} className={cn("h-10 w-full rounded-xl border border-amber-900/15 bg-white/70 px-3 text-[0.8rem] outline-none transition focus:border-amber-500/40 shadow-sm", superF === "all" ? "text-amber-950/50" : "text-amber-950 font-black")}>
                          <option value="all" className="font-normal text-amber-950/50">Todas as Superclasses</option>
                          {superclassOptions.map((o) => <option key={o.id} value={o.id} className="font-black text-amber-950">{o.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Class */}
                    {classOptions.length > 1 && (
                      <div className="space-y-1.5">
                        <label className="ml-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-950/60">Classe</label>
                        <select value={classF} onChange={(e) => setClassF(e.target.value)} className={cn("h-10 w-full rounded-xl border border-amber-900/15 bg-white/70 px-3 text-[0.8rem] outline-none transition focus:border-amber-500/40 shadow-sm", classF === "all" ? "text-amber-950/50" : "text-amber-950 font-black")}>
                          <option value="all" className="font-normal text-amber-950/50">Todas as Classes</option>
                          {classOptions.map((o) => <option key={o.id} value={o.id} className="font-black text-amber-950">{o.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Rarity */}
                    {mode === "targets" && (
                      <div className="space-y-1.5">
                        <label className="ml-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-950/60">Raridade</label>
                        <select value={rarF} onChange={(e) => setRarF(e.target.value)} className={cn("h-10 w-full rounded-xl border border-amber-900/15 bg-white/70 px-3 text-[0.8rem] outline-none transition focus:border-amber-500/40 shadow-sm", rarF === "all" ? "text-amber-950/50" : "text-amber-950 font-black")}>
                          <option value="all" className="font-normal text-amber-950/50">Todas as Raridades</option>
                          {filterOptionsView.rarityOptions.map((option) => <option key={option.id} value={option.id} className="font-black text-amber-950">{option.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Sorting and reset */}
                    {mode === "targets" && (
                      <div className={cn("mt-2 space-y-1.5", compact && "mt-1 space-y-1")}>
                        <label className="ml-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-950/60">Ordenação</label>
                        <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
                          <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
                            <Button type="button" variant="ghost" onClick={() => { if (sortMode !== "rarity") { setSortMode("rarity"); setSortDir("desc"); } else setSortMode("default"); }} className={cn("flex-1 rounded-xl border font-black transition shadow-sm items-center justify-center", compact ? "h-8 px-2 text-[0.68rem]" : "h-10 px-3 text-[0.8rem]", sortMode === "rarity" ? "border-emerald-500/40 bg-emerald-50 text-emerald-800" : "border-amber-900/15 bg-white/70 text-amber-950/60")}>
                              <Layers3 className={cn("shrink-0", compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1.5")} /> Raridade
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => { if (sortMode !== "damage") { setSortMode("damage"); setSortDir("desc"); } else setSortMode("default"); }} className={cn("flex-1 rounded-xl border font-black transition shadow-sm items-center justify-center", compact ? "h-8 px-2 text-[0.68rem]" : "h-10 px-3 text-[0.8rem]", sortMode === "damage" ? "border-emerald-500/40 bg-emerald-50 text-emerald-800" : "border-amber-900/15 bg-white/70 text-amber-950/60")}>
                              <Swords className={cn("shrink-0", compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1.5")} /> Dano
                            </Button>
                          </div>
                          <Button type="button" variant="ghost" onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")} disabled={sortMode === "default"} className={cn("flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-900/15 bg-white/70 text-amber-950 transition disabled:opacity-45 shadow-sm", compact ? "h-8 text-[0.68rem]" : "h-10 text-[0.8rem]", sortMode !== "default" && "border-amber-500/40 bg-amber-50 text-amber-800")}>
                            {sortDir === "desc" ? <><ArrowDown className={cn(compact ? "h-3 w-3" : "h-4 w-4")} /> Descendente</> : <><ArrowUp className={cn(compact ? "h-3 w-3" : "h-4 w-4")} /> Ascendente</>}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 pb-2">
                      <Button type="button" variant="ghost" onClick={() => { setSearch(""); setSuperF("all"); setClassF("all"); setRarF("all"); setSortMode("default"); }} disabled={!search && superF === "all" && classF === "all" && rarF === "all"} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-900/20 bg-amber-100/50 text-[0.75rem] font-black uppercase tracking-wider text-amber-950 transition hover:bg-amber-200/50 disabled:opacity-45 shadow-sm">
                        <RotateCcw className="h-4 w-4" /> Limpar filtros
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hold-to-reveal overlay */}
      {preview && (
        <CardPreviewOverlay
          target={preview}
          originX={previewOriginX}
          isDesktop={previewIsDesktop}
          copies={previewCopies}
          onClose={() => setPreview(null)}
        />
      )}
    </motion.div>
  );
};
