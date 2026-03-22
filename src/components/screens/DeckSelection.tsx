import React from "react";
import { Button } from "../ui/button";
import { Deck } from "../../types/game";
import { DECKS } from "../../data/decks";
import { motion } from "motion/react";
import { ChevronLeft, Info, BookOpen } from "lucide-react";
import { cn } from "../../lib/utils";

interface DeckSelectionProps {
  onSelectDeck: (deck: Deck) => void;
  onBack: () => void;
  selectedDeckId?: string;
  remoteSelectedDeckId?: string;
}

export const DeckSelection: React.FC<DeckSelectionProps> = ({
  onSelectDeck,
  onBack,
  selectedDeckId,
  remoteSelectedDeckId,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full w-full gap-6 p-4 sm:p-8 overflow-y-auto no-scrollbar"
    >
      <div className="flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={onBack} className="text-amber-100/40 hover:text-amber-100 font-serif">
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-serif font-black tracking-tight text-amber-100">ESCOLHA SEU DECK</h2>
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1" />
          {selectedDeckId ? (
            <p className="mt-3 text-sm font-serif italic text-emerald-300">
              Deck selecionado. {remoteSelectedDeckId ? "O adversario tambem escolheu." : "Aguardando escolha de deck do adversario."}
            </p>
          ) : (
            <p className="mt-3 text-sm font-serif italic text-amber-100/60">
              Escolha um deck para preparar o duelo.
            </p>
          )}
        </div>
        <div className="w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 shrink-0">
        {DECKS.map((deck) => (
          <motion.div
            key={deck.id}
            whileHover={selectedDeckId === deck.id ? undefined : { y: -12 }}
            whileTap={{ scale: 0.98 }}
            animate={
              selectedDeckId === deck.id
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
              selectedDeckId === deck.id
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className={cn(
              "relative group cursor-pointer overflow-hidden rounded-[40px] border-4 border-[#d4af37] bg-[#3e2723] p-1 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]",
              "before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/leather.png')] before:opacity-40",
              selectedDeckId === deck.id && "ring-4 ring-emerald-300/70 shadow-[0_0_0_2px_rgba(110,231,183,0.3)]"
            )}
            onClick={() => onSelectDeck(deck)}
          >
            {/* Deck Cover */}
            <div className={cn(
              "relative z-10 flex flex-col h-[300px] sm:h-[400px] rounded-[36px] border-2 border-[#d4af37]/40 p-6 sm:p-8",
              "bg-gradient-to-br",
              deck.color
            )}>
              <div className="flex items-center justify-between">
                <div className="text-6xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">{deck.emoji}</div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/30 text-amber-200 border border-amber-400/20">
                    {deck.targets.length} CARTAS
                  </div>
                  {selectedDeckId === deck.id && (
                    <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-950/70 text-emerald-200 border border-emerald-300/30">
                      DECK SELECIONADO
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <h3 className="text-3xl font-serif font-black text-amber-100 group-hover:text-amber-400 transition-colors">
                  {deck.name}
                </h3>
                <p className="text-sm text-amber-100/60 leading-relaxed font-serif italic">
                  "{deck.description}"
                </p>
              </div>

              <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/10">
                <div className="flex -space-x-3">
                  {deck.targets.slice(0, 4).map((t, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-[#3e2723] border-2 border-[#d4af37] flex items-center justify-center text-xl shadow-lg">
                      {t.emoji}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <BookOpen className="w-4 h-4" />
                  ABRIR
                </div>
              </div>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full" />
          </motion.div>
        ))}
      </div>

      <div className="mt-8 paper-panel flex gap-6 items-start">
        <div className="w-12 h-12 rounded-2xl bg-amber-900/10 flex items-center justify-center shrink-0 border border-amber-900/20">
          <Info className="w-6 h-6 text-amber-900" />
        </div>
        <div className="text-sm text-amber-950 leading-relaxed font-serif">
          <span className="font-black text-lg block mb-1">Dica:</span> 
          Cada deck possui uma distribuição única de sílabas. Decks como o <span className="font-bold">Oceano</span> possuem sílabas mais complexas, mas seus ataques são mais fortes!
        </div>
      </div>
    </motion.div>
  );
};
