import React from "react";
import { cn } from "../../lib/utils";

export type BattleTurnFocusTone = "player" | "enemy" | "neutral";

interface BattleHandFocusFrameProps {
  scale: "desktop" | "mobile";
  compact?: boolean;
  turnLabel: string;
  clock: string;
  clockUrgent?: boolean;
  tone?: BattleTurnFocusTone;
  className?: string;
  children: React.ReactNode;
}

const turnToneClassName: Record<BattleTurnFocusTone, string> = {
  player:
    "border-emerald-300/35 bg-[linear-gradient(180deg,rgba(12,58,44,0.9),rgba(5,31,24,0.86))] text-emerald-50 shadow-[0_14px_34px_rgba(5,46,22,0.28)]",
  enemy:
    "border-rose-300/30 bg-[linear-gradient(180deg,rgba(95,26,40,0.9),rgba(56,16,26,0.86))] text-rose-50 shadow-[0_14px_34px_rgba(76,5,25,0.26)]",
  neutral:
    "border-amber-200/25 bg-[linear-gradient(180deg,rgba(60,41,12,0.9),rgba(43,30,10,0.84))] text-amber-50 shadow-[0_14px_34px_rgba(66,32,6,0.24)]",
};

export const BattleHandFocusFrame: React.FC<BattleHandFocusFrameProps> = ({
  scale,
  compact = false,
  turnLabel,
  clock,
  clockUrgent = false,
  tone = "neutral",
  className,
  children,
}) => {
  const isMobile = scale === "mobile";
  const isCompactMobile = isMobile && compact;

  return (
    <div className={cn("relative flex h-full w-full min-h-0 items-end justify-center overflow-visible", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-1 overflow-hidden rounded-[2rem] border backdrop-blur-[2px]",
          isMobile
            ? isCompactMobile
              ? "top-6 border-amber-100/10 bg-[linear-gradient(180deg,rgba(7,12,9,0.08),rgba(7,12,9,0.24)_44%,rgba(7,12,9,0.54)_100%)] shadow-[0_18px_36px_rgba(0,0,0,0.24)]"
              : "top-8 border-amber-100/10 bg-[linear-gradient(180deg,rgba(7,12,9,0.1),rgba(7,12,9,0.28)_48%,rgba(7,12,9,0.56)_100%)] shadow-[0_22px_44px_rgba(0,0,0,0.28)]"
            : "top-9 border-amber-100/12 bg-[linear-gradient(180deg,rgba(7,12,9,0.08),rgba(7,12,9,0.24)_44%,rgba(7,12,9,0.62)_100%)] shadow-[0_28px_52px_rgba(0,0,0,0.32)]",
        )}
      >
        <div className="absolute inset-x-[6%] top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
        <div className="absolute inset-x-[12%] bottom-2 h-10 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,rgba(245,158,11,0)_74%)] blur-xl" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex justify-center">
        <div
          className={cn(
            "flex items-center rounded-full border backdrop-blur-sm",
            turnToneClassName[tone],
            isCompactMobile
              ? "min-h-8 max-w-[90%] gap-1.5 px-2.5 py-1"
              : isMobile
                ? "min-h-9 max-w-[92%] gap-2 px-3 py-1.5"
                : "min-h-10 gap-2 px-3 py-1.5",
          )}
        >
          <span
            className={cn(
              "font-black uppercase leading-none",
              isCompactMobile
                ? "text-[9px] tracking-[0.2em]"
                : isMobile
                  ? "text-[10px] tracking-[0.22em]"
                  : "text-[11px] tracking-[0.24em]",
            )}
          >
            {turnLabel}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-serif font-black tabular-nums leading-none",
              clockUrgent
                ? "border-rose-200/40 bg-rose-100/14 text-rose-100"
                : "border-black/15 bg-black/18 text-current",
              isCompactMobile ? "text-[13px]" : isMobile ? "text-sm" : "text-base",
            )}
          >
            {clock}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] flex h-full w-full min-h-0 items-end justify-center overflow-visible",
          isCompactMobile ? "px-0.5 pb-0.5" : "px-1 pb-1",
        )}
      >
        {children}
      </div>
    </div>
  );
};
