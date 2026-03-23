import React from "react";
import { CardPile } from "../game/GameComponents";

interface BattlePileRackProps {
  presentation: "desktop" | "mobile";
  targetDeckCount: number;
  deckCount: number;
  targetDeckAnchorRef: (node: HTMLDivElement | null) => void;
  deckAnchorRef: (node: HTMLDivElement | null) => void;
  discardAnchorRef: (node: HTMLDivElement | null) => void;
}

interface BattlePortraitRailProps {
  presentation: "mobile" | "desktop-top" | "desktop-bottom";
  portrait?: React.ReactNode;
  hand?: React.ReactNode;
}

export const BattlePileRack: React.FC<BattlePileRackProps> = ({
  presentation,
  targetDeckCount,
  deckCount,
  targetDeckAnchorRef,
  deckAnchorRef,
  discardAnchorRef,
}) => {
  if (presentation === "mobile") {
    return (
      <div className="flex items-start gap-3">
        <div>
          <CardPile
            label="ALVOS"
            count={targetDeckCount}
            color="bg-rose-950"
            variant="target"
            anchorRef={targetDeckAnchorRef}
          />
        </div>
        <div>
          <CardPile
            label="DECK"
            count={deckCount}
            color="bg-amber-950"
            variant="deck"
            anchorRef={deckAnchorRef}
          />
        </div>
        <div ref={discardAnchorRef} className="pointer-events-none h-0 w-0 opacity-0" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-[244px] items-start justify-center gap-4">
      <div ref={discardAnchorRef} className="pointer-events-none absolute left-2 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
      <div>
        <CardPile
          label="ALVOS"
          count={targetDeckCount}
          color="bg-rose-950"
          variant="target"
          anchorRef={targetDeckAnchorRef}
        />
      </div>
      <div>
        <CardPile
          label="DECK"
          count={deckCount}
          color="bg-amber-950"
          variant="deck"
          anchorRef={deckAnchorRef}
        />
      </div>
    </div>
  );
};

export const BattlePortraitRail: React.FC<BattlePortraitRailProps> = ({
  presentation,
  portrait,
  hand,
}) => {
  if (presentation === "mobile") {
    return <div className="flex justify-center lg:hidden">{portrait}</div>;
  }

  if (presentation === "desktop-top") {
    return (
      <div className="hidden h-full items-stretch px-0 lg:grid lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-2">
        <div className="flex items-start justify-end -mt-12">{hand}</div>
        <div className="flex items-start justify-start pt-0 -ml-14">{portrait ?? null}</div>
      </div>
    );
  }

  return (
    <div className="hidden h-full items-stretch px-0 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-2">
      <div className="flex items-end justify-end pr-1 pb-0">{portrait ?? null}</div>
      <div className="flex items-end justify-start overflow-visible pb-0">{hand}</div>
    </div>
  );
};
