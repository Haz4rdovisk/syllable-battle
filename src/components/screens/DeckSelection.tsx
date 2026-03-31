import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Deck, normalizeRarity } from "../../types/game";
import { CONTENT_PIPELINE } from "../../data/content";
import { AnimatePresence, motion, Variants } from "motion/react";
import { ChevronLeft, Info, BookOpen, X, Swords } from "lucide-react";
import { cn } from "../../lib/utils";
import { SyllableCard } from "../game/GameComponents";

interface DeckSelectionProps {
  onSelectDeck: (deck: Deck) => void;
  onBack: () => void;
  selectedDeckId?: string;
  remoteSelectedDeckId?: string;
  isPreparingBattle?: boolean;
  title?: string;
  idleStatusTitle?: string;
  phaseKey?: string;
}

interface DeckSelectionEntry {
  deckModel: (typeof CONTENT_PIPELINE.deckModels)[number];
  runtimeDeck: Deck;
}

export const DeckSelection: React.FC<DeckSelectionProps> = ({
  onSelectDeck,
  onBack,
  selectedDeckId,
  remoteSelectedDeckId,
  isPreparingBattle = false,
  title = "ESCOLHA SEU DECK",
  idleStatusTitle = "ESCOLHA SEU DECK",
  phaseKey,
}) => {
  const [openedDeckId, setOpenedDeckId] = useState<string | null>(null);
  const [cardsInteractive, setCardsInteractive] = useState(false);

  const deckEntries = useMemo(
    () =>
      CONTENT_PIPELINE.deckModels
        .map((deckModel) => {
          const runtimeDeck = CONTENT_PIPELINE.runtimeDecksById[deckModel.id] ?? null;
          if (!runtimeDeck) return null;
          return { deckModel, runtimeDeck };
        })
        .filter((entry): entry is DeckSelectionEntry => !!entry),
    [],
  );

  const openedDeck = useMemo(
    () => deckEntries.find((entry) => entry.deckModel.id === openedDeckId) ?? null,
    [deckEntries, openedDeckId],
  );

  const statusTitle = isPreparingBattle
    ? "AMBOS OS DECKS FORAM ESCOLHIDOS - PARTIDA INICIANDO..."
    : selectedDeckId
      ? remoteSelectedDeckId
        ? "AMBOS OS DECKS ESTAO PRONTOS"
        : "SEU DECK PRONTO - AGUARDANDO O ADVERSARIO"
      : remoteSelectedDeckId
        ? "ADVERSARIO PRONTO - ESCOLHA SEU DECK"
        : idleStatusTitle;

  const statusDotClass = isPreparingBattle
    ? "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.85)]"
    : selectedDeckId
      ? "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]"
      : remoteSelectedDeckId
        ? "bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,0.75)]"
        : "bg-slate-300 shadow-[0_0_16px_rgba(203,213,225,0.45)]";

  const openedDeckSyllables = useMemo(() => {
    if (!openedDeck) return [];

    return [...openedDeck.deckModel.cards]
      .sort((left, right) => {
        if (right.copiesInDeck !== left.copiesInDeck) return right.copiesInDeck - left.copiesInDeck;
        return left.card.syllable.localeCompare(right.card.syllable);
      })
      .map((entry) => [entry.card.syllable, entry.copiesInDeck] as const);
  }, [openedDeck]);

  const openedDeckTargets = useMemo(() => {
    if (!openedDeck) return [];

    return openedDeck.deckModel.targetInstances.map((entry) => ({
      instanceKey: entry.instanceKey,
      id: entry.target.id,
      name: entry.target.name,
      emoji: entry.target.emoji,
      rarity: entry.target.rarity,
      syllables: entry.target.cardIds.map(
        (cardId) => CONTENT_PIPELINE.catalog.cardsById[cardId]?.syllable ?? cardId,
      ),
    }));
  }, [openedDeck]);

  const selectionPhaseKey = phaseKey ?? title;

  useEffect(() => {
    setCardsInteractive(false);
    const settleTimeout = window.setTimeout(() => {
      setCardsInteractive(true);
    }, 980);

    return () => window.clearTimeout(settleTimeout);
  }, [selectionPhaseKey]);

  const deckGridVariants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const deckCardVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.965 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const getRarityToneClass = (rarity: Deck["targets"][number]["rarity"]) => {
    const normalized = normalizeRarity(rarity);
    if (normalized === "comum") return "bg-slate-500";
    if (normalized === "raro") return "bg-amber-600";
    if (normalized === "épico") return "bg-purple-700";
    return "bg-rose-800";
  };

  const getRarityLabel = (rarity: Deck["targets"][number]["rarity"]) => {
    const normalized = normalizeRarity(rarity);
    if (normalized === "épico") return "EPICO";
    if (normalized === "lendário") return "LENDARIO";
    return normalized.toUpperCase();
  };

  const getRarityDamage = (rarity: Deck["targets"][number]["rarity"]) => {
    const normalized = normalizeRarity(rarity);
    if (normalized === "comum") return 1;
    if (normalized === "raro") return 2;
    if (normalized === "épico") return 3;
    return 4;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4 no-scrollbar sm:p-8"
    >
      <div className="shrink-0 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="font-serif text-amber-100/40 hover:text-amber-100">
          <ChevronLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-serif font-black tracking-tight text-amber-100">{title}</h2>
          <div className="mt-1 h-1 w-24 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/20 bg-black/25 px-5 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={statusTitle}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="inline-flex items-center gap-3"
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full", statusDotClass)} />
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/80 sm:text-[11px] sm:tracking-[0.26em]">
                    {statusTitle}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="w-24" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectionPhaseKey}
          variants={deckGridVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -14, transition: { duration: 0.28, ease: "easeInOut" } }}
          className="grid shrink-0 grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-2.5"
        >
          {deckEntries.map(({ deckModel, runtimeDeck }) => (
            <motion.div
              key={deckModel.id}
              variants={deckCardVariants}
              className="relative mx-auto w-full max-w-[340px] lg:max-w-[324px]"
            >
              <motion.div
                whileHover={
                  !cardsInteractive || selectedDeckId === deckModel.id || isPreparingBattle ? undefined : { y: -12 }
                }
                whileTap={!cardsInteractive || isPreparingBattle ? undefined : { scale: 0.98 }}
                animate={
                  selectedDeckId === deckModel.id
                    ? {
                        y: [0, -6, 0],
                        boxShadow: [
                          "0 0 0 rgba(212,175,55,0.0)",
                          "0 18px 36px rgba(46,125,50,0.45)",
                          "0 0 0 rgba(212,175,55,0.0)",
                        ],
                      }
                    : {}
                }
                transition={
                  selectedDeckId === deckModel.id
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-[40px] border-4 border-[#d4af37] bg-[#3e2723] p-1 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]",
                  "before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/leather.png')] before:opacity-40",
                  selectedDeckId === deckModel.id && "ring-4 ring-emerald-300/70 shadow-[0_0_0_2px_rgba(110,231,183,0.3)]",
                  (!cardsInteractive || isPreparingBattle) && "pointer-events-none",
                  isPreparingBattle && "opacity-90",
                )}
                onClick={() => {
                  if (!cardsInteractive || isPreparingBattle) return;
                  onSelectDeck(runtimeDeck);
                }}
              >
                <div
                  className={cn(
                    "relative z-10 flex h-[292px] flex-col rounded-[36px] border-2 border-[#d4af37]/40 bg-gradient-to-br p-5 sm:h-[340px] sm:p-6",
                    runtimeDeck.color,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] sm:text-[3.35rem]">
                      {deckModel.definition.emoji}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full border border-amber-400/20 bg-black/30 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                        {deckModel.targetInstances.length} CARTAS
                      </div>
                      {selectedDeckId === deckModel.id && (
                        <div className="rounded-full border border-emerald-300/30 bg-emerald-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                          DECK SELECIONADO
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    <h3 className="text-[2rem] font-serif font-black text-amber-100 transition-colors group-hover:text-amber-400 sm:text-[2.15rem]">
                      {deckModel.definition.name}
                    </h3>
                    <p className="text-[13px] font-serif italic leading-relaxed text-amber-100/60 sm:text-sm">
                      "{deckModel.definition.description}"
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-5">
                    <div className="flex -space-x-3">
                      {deckModel.targetInstances.slice(0, 4).map((entry) => (
                        <div
                          key={entry.instanceKey}
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#3e2723] text-xl shadow-lg"
                        >
                          {entry.target.emoji}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!cardsInteractive) return;
                        setOpenedDeckId(deckModel.id);
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-300/30 bg-amber-50/10 px-4 py-2 text-sm font-black text-amber-300 shadow-[0_10px_20px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:border-amber-200/45 hover:bg-amber-50/16 hover:text-amber-100 active:translate-y-0"
                      aria-label={`Abrir grimorio do deck ${deckModel.definition.name}`}
                    >
                      <BookOpen className="h-4 w-4" />
                      ABRIR
                    </button>
                  </div>
                </div>

                <div className="absolute inset-0 -translate-x-full bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-700 group-hover:translate-x-full group-hover:opacity-100" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="paper-panel mt-8 flex items-start gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-900/20 bg-amber-900/10">
          <Info className="h-6 w-6 text-amber-900" />
        </div>
        <div className="text-sm font-serif leading-relaxed text-amber-950">
          <span className="mb-1 block text-lg font-black">Dica:</span>
          Cada deck possui uma distribuicao unica de silabas. Decks como o <span className="font-bold">Oceano</span> trazem
          combinacoes mais complexas, mas seus ataques costumam golpear com mais forca.
        </div>
      </div>

      <AnimatePresence>
        {openedDeck ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md"
            onClick={() => setOpenedDeckId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="paper-panel relative max-h-[88vh] w-full max-w-6xl overflow-hidden border-4 border-[#3e2723]/30 p-0 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            >
              <div
                className={cn(
                  "relative overflow-hidden px-8 py-7 text-amber-50",
                  "bg-gradient-to-br",
                  openedDeck.runtimeDeck.color,
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.18),transparent_42%)]" />
                <div className="relative flex items-start justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border-2 border-amber-200/30 bg-black/15 text-5xl shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
                      {openedDeck.deckModel.definition.emoji}
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="text-4xl font-serif font-black tracking-tight">
                        {openedDeck.deckModel.definition.name}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm font-serif italic text-amber-50/75">
                        {openedDeck.deckModel.definition.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpenedDeckId(null)}
                    className="rounded-full border border-amber-100/20 bg-black/15 text-amber-50 hover:bg-black/25 hover:text-amber-100"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid max-h-[calc(88vh-12rem)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1.25fr_0.95fr]">
                <div className="border-b border-amber-900/10 px-7 py-7 lg:border-b-0 lg:border-r">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-900/55">ALVOS DO DECK</div>
                      <h4 className="mt-2 text-2xl font-serif font-black text-amber-950">Bestiario do Duelo</h4>
                    </div>
                    <div className="rounded-full border border-amber-900/15 bg-amber-900/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-amber-900/60">
                      {openedDeck.deckModel.targetInstances.length} cartas de alvo
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {openedDeckTargets.map((target) => (
                      <div key={target.instanceKey} className="mx-auto w-full max-w-[146px]">
                        <div className="card-base relative flex aspect-[126/176] w-full flex-col overflow-hidden rounded-[1.1rem] shadow-[0_14px_26px_rgba(0,0,0,0.15)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(0,0,0,0.18)]">
                          <div
                            className={cn(
                              "flex h-10 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white",
                              getRarityToneClass(target.rarity),
                            )}
                          >
                            <span className="truncate">{getRarityLabel(target.rarity)}</span>
                            <div className="flex items-center gap-1.5">
                              <Swords className="h-4 w-4" />
                              <span>{getRarityDamage(target.rarity)}</span>
                            </div>
                          </div>

                          <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-1.5">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_42%)]" />
                            <div className="relative translate-y-3 text-[4.9rem] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
                              {target.emoji}
                            </div>
                          </div>

                          <div className="mt-auto shrink-0 bg-parchment/90 px-2.5 pb-2.5 pt-4">
                            <div className="text-center font-serif text-[0.82rem] font-black tracking-tight text-amber-950">
                              {target.name}
                            </div>
                            <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                              {target.syllables.map((syllable, index) => (
                                <div
                                  key={`${target.id}-${syllable}-${index}`}
                                  className="rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950 shadow-sm"
                                >
                                  {syllable}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-8 py-7">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-900/55">SILABAS DO DECK</div>
                      <h4 className="mt-2 text-2xl font-serif font-black text-amber-950">Reserva de Cartas</h4>
                    </div>
                    <div className="rounded-full border border-amber-900/15 bg-amber-900/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-amber-900/60">
                      {openedDeckSyllables.reduce((total, [, count]) => total + count, 0)} silabas
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {openedDeckSyllables.map(([syllable, count]) => (
                      <div key={syllable} className="flex flex-col items-center gap-0">
                        <div className="origin-top scale-[0.72] pointer-events-none -mb-3">
                          <SyllableCard
                            syllable={syllable}
                            selected={false}
                            playable={false}
                            disabled={false}
                            onClick={() => {}}
                          />
                        </div>
                        <span className="-mt-3 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm">
                          x{count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};
