import React from "react";
import { cn } from "../../lib/utils";

interface BattleStatusPanelProps {
  presentation: "desktop" | "mobile";
  title: string;
  turnLabel: string;
  clock: string;
  clockUrgent?: boolean;
  action?: React.ReactNode;
}

export const BattleStatusPanel: React.FC<BattleStatusPanelProps> = ({
  presentation,
  title,
  turnLabel,
  clock,
  clockUrgent = false,
  action,
}) => {
  if (presentation === "mobile") {
    return (
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "paper-panel relative flex min-h-[92px] min-w-[132px] flex-col justify-center overflow-hidden rounded-[1.5rem] border-2 px-4 py-3 text-center shadow-xl transition-all duration-300",
            clockUrgent
              ? "animate-pulse border-rose-300/45 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,228,230,0.94))] shadow-[0_0_28px_rgba(244,63,94,0.16)]"
              : "border-amber-900/25 bg-parchment/95",
          )}
        >
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-900/55">{title}</div>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-900/60">{turnLabel}</div>
          <div className={cn("mt-2 font-serif text-3xl font-black tabular-nums leading-none", clockUrgent ? "text-rose-900" : "text-amber-950")}>{clock}</div>
        </div>

        {action ?? null}
      </div>
    );
  }

  return (
    <div className="flex w-[200px] flex-col items-center gap-4">
      <div
        className={cn(
          "paper-panel relative flex h-[146px] w-full flex-col justify-center overflow-hidden rounded-xl border-2 p-4 text-center shadow-2xl transition-all duration-300",
          clockUrgent
            ? "animate-pulse border-rose-300/40 bg-parchment/95 shadow-[0_0_30px_rgba(244,63,94,0.18)]"
            : "border-amber-900/30 bg-parchment/95",
        )}
      >
        {clockUrgent ? <div className="absolute inset-0 bg-rose-100/35" /> : null}
        <div className="mb-2 border-b-2 border-amber-900/10 pb-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-900/70">
          {title}
        </div>
        <div className="flex min-h-[34px] items-center justify-center px-2">
          <div
            className={cn(
              "max-w-full text-center font-serif text-[15px] font-black uppercase leading-tight tracking-[0.12em]",
              clockUrgent ? "text-rose-950" : "text-amber-950",
            )}
          >
            {turnLabel}
          </div>
        </div>
        <div className={cn("mt-2.5 font-serif text-5xl font-black tabular-nums leading-none tracking-[0.04em]", clockUrgent ? "text-rose-950" : "text-amber-950")}>{clock}</div>
      </div>

      {action ? <div className="flex h-[162px] w-full items-center justify-center">{action}</div> : null}
    </div>
  );
};
