import type React from "react";
import { Swords } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ContentRarityView } from "../../data/content";

interface ContentTargetRarityHeaderProps {
  rarityView: ContentRarityView;
  damage: number;
}

export const ContentTargetRarityHeader: React.FC<ContentTargetRarityHeaderProps> = ({
  rarityView,
  damage,
}) => (
  <div
    className={cn(
      "flex h-10 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white [@media(pointer:coarse)_and_(max-height:480px)]:h-7 [@media(pointer:coarse)_and_(max-height:480px)]:px-2 [@media(pointer:coarse)_and_(max-height:480px)]:text-[8px]",
      rarityView.toneClass,
    )}
  >
    <span className="truncate">{rarityView.uppercaseLabel}</span>
    <div className="flex items-center gap-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1">
      <Swords className="h-4 w-4 [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
      <span>{damage}</span>
    </div>
  </div>
);

interface ContentSyllableChipsProps {
  syllables: readonly string[];
  idPrefix: string;
  emptyLabel?: string;
  className?: string;
  chipClassName?: string;
}

export const ContentSyllableChips: React.FC<ContentSyllableChipsProps> = ({
  syllables,
  idPrefix,
  emptyLabel,
  className,
  chipClassName,
}) => (
  <div className={cn("flex flex-wrap justify-center gap-1", className)}>
    {syllables.length > 0
      ? syllables.map((syllable, index) => (
          <span
            key={`${idPrefix}-${syllable}-${index}`}
            className={cn(
              "rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950 shadow-sm",
              chipClassName,
            )}
          >
            {syllable}
          </span>
        ))
      : emptyLabel
        ? (
            <span
              className={cn(
                "rounded-full border border-amber-900/12 bg-white/70 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-900/40 shadow-sm",
              )}
            >
              {emptyLabel}
            </span>
          )
        : null}
  </div>
);
