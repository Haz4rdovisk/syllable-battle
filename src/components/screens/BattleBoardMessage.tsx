import React from "react";
import { motion } from "motion/react";
import { GameMessage } from "../../types/game";
import { cn } from "../../lib/utils";

interface BattleBoardMessageProps {
  message: GameMessage;
}

const boardMessageTone = {
  turn: {
    badge: "Turno",
    shell:
      "border-emerald-900/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.94))] shadow-[0_0_46px_rgba(6,95,70,0.24)]",
    badgeClass: "border-emerald-800/20 bg-emerald-900/10 text-emerald-950",
    titleClass: "text-emerald-950",
    detailClass: "text-emerald-950/70",
  },
  damage: {
    badge: "Dano",
    shell:
      "border-rose-900/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.94))] shadow-[0_0_52px_rgba(190,24,93,0.24)]",
    badgeClass: "border-rose-800/20 bg-rose-900/10 text-rose-950",
    titleClass: "text-rose-900",
    detailClass: "text-rose-900/70",
  },
  info: {
    badge: "Resolucao",
    shell:
      "border-amber-900/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.94))] shadow-[0_0_46px_rgba(180,83,9,0.22)]",
    badgeClass: "border-amber-800/20 bg-amber-900/10 text-amber-950",
    titleClass: "text-amber-950",
    detailClass: "text-amber-950/70",
  },
  error: {
    badge: "Aviso",
    shell:
      "border-slate-900/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))] shadow-[0_0_46px_rgba(15,23,42,0.24)]",
    badgeClass: "border-slate-800/20 bg-slate-900/10 text-slate-950",
    titleClass: "text-slate-950",
    detailClass: "text-slate-950/70",
  },
} as const;

export const BattleBoardMessage: React.FC<BattleBoardMessageProps> = ({ message }) => {
  const tone = boardMessageTone[message.kind];

  return (
    <motion.div
      key={message.title}
      initial={{ opacity: 0, scale: 0.4, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.8, y: -20 }}
      className={cn(
        "paper-panel z-50 min-w-[280px] max-w-[360px] rounded-[1.75rem] border-4 px-7 py-4 text-center",
        tone.shell,
      )}
    >
      <div className="flex justify-center">
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em]",
            tone.badgeClass,
          )}
        >
          {tone.badge}
        </div>
      </div>
      <div className={cn("mt-3 font-serif text-[2rem] font-black uppercase tracking-tight leading-none", tone.titleClass)}>
        {message.title}
      </div>
      {message.detail ? (
        <div className={cn("mt-2 text-xs font-semibold uppercase tracking-[0.22em]", tone.detailClass)}>
          {message.detail}
        </div>
      ) : null}
    </motion.div>
  );
};
