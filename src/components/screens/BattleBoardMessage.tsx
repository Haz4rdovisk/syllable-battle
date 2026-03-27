import React from "react";
import { motion } from "motion/react";
import { GameMessage } from "../../types/game";
import { cn } from "../../lib/utils";

interface BattleBoardMessageProps {
  message: GameMessage;
}

const resolveInfoBadge = (message: GameMessage) => {
  const normalizedTitle = message.title.trim().toLowerCase();
  const normalizedDetail = (message.detail ?? "").trim().toLowerCase();
  const normalizedCopy = `${normalizedTitle} ${normalizedDetail}`;

  if (message.kind === "turn") return "Turno";
  if (message.kind === "damage") return "Dano";
  if (/(ataque|ataca|golpe|investida)/.test(normalizedCopy)) return "Ataque";
  if (/(conclu|complet|finaliz|resolvid)/.test(normalizedCopy)) return "Conclusao";
  return "Resolucao";
};

const boardMessageTone = {
  turn: {
    shell:
      "border-emerald-900/55 bg-[linear-gradient(180deg,rgba(244,253,248,0.94),rgba(220,252,231,0.88))] shadow-[0_10px_24px_rgba(6,95,70,0.14)]",
    glowClass: "bg-[radial-gradient(circle,rgba(52,211,153,0.14)_0%,rgba(52,211,153,0)_72%)]",
    badgeClass: "border-emerald-800/15 bg-emerald-900/8 text-emerald-950/82",
    titleClass: "text-emerald-950",
    detailClass: "text-emerald-950/70",
    frameClass: "min-w-[244px] max-w-[304px] rounded-[1.45rem] border-[3px] px-5 py-3.5",
    titleSizeClass: "mt-2.5 text-[1.55rem] tracking-[0.02em]",
  },
  damage: {
    shell:
      "border-rose-900/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.94))] shadow-[0_0_52px_rgba(190,24,93,0.24)]",
    glowClass: "bg-[radial-gradient(circle,rgba(244,63,94,0.18)_0%,rgba(244,63,94,0)_72%)]",
    badgeClass: "border-rose-800/20 bg-rose-900/10 text-rose-950",
    titleClass: "text-rose-900",
    detailClass: "text-rose-900/70",
    frameClass: "min-w-[292px] max-w-[372px] rounded-[1.8rem] border-4 px-7 py-4.5",
    titleSizeClass: "mt-3 text-[2.1rem] tracking-tight",
  },
  info: {
    shell:
      "border-amber-900/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.94))] shadow-[0_0_46px_rgba(180,83,9,0.22)]",
    glowClass: "bg-[radial-gradient(circle,rgba(251,191,36,0.16)_0%,rgba(251,191,36,0)_72%)]",
    badgeClass: "border-amber-800/20 bg-amber-900/10 text-amber-950",
    titleClass: "text-amber-950",
    detailClass: "text-amber-950/70",
    frameClass: "min-w-[288px] max-w-[364px] rounded-[1.7rem] border-4 px-7 py-4",
    titleSizeClass: "mt-3 text-[1.95rem] tracking-tight",
  },
  error: {
    shell:
      "border-slate-900/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.94))] shadow-[0_0_46px_rgba(15,23,42,0.24)]",
    glowClass: "bg-[radial-gradient(circle,rgba(100,116,139,0.18)_0%,rgba(100,116,139,0)_72%)]",
    badgeClass: "border-slate-800/20 bg-slate-900/10 text-slate-950",
    titleClass: "text-slate-950",
    detailClass: "text-slate-950/70",
    frameClass: "min-w-[288px] max-w-[364px] rounded-[1.7rem] border-4 px-7 py-4",
    titleSizeClass: "mt-3 text-[1.95rem] tracking-tight",
  },
} as const;

export const BattleBoardMessage: React.FC<BattleBoardMessageProps> = ({ message }) => {
  const tone = boardMessageTone[message.kind];
  const badgeLabel = resolveInfoBadge(message);
  const isTurnMessage = message.kind === "turn";

  return (
    <motion.div
      key={message.title}
      initial={isTurnMessage ? { opacity: 0, scale: 0.92, y: 10 } : { opacity: 0, scale: 0.4, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={isTurnMessage ? { opacity: 0, scale: 0.96, y: -10 } : { opacity: 0, scale: 1.8, y: -20 }}
      className={cn(
        "paper-panel relative z-50 text-center",
        tone.shell,
        tone.frameClass,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-8 top-2 h-10 blur-2xl", tone.glowClass)} />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />
      <div className="flex justify-center">
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em]",
            tone.badgeClass,
          )}
        >
          {badgeLabel}
        </div>
      </div>
      <div
        className={cn(
          "font-serif font-black uppercase leading-none",
          tone.titleClass,
          tone.titleSizeClass,
        )}
      >
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
