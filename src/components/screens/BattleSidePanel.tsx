import React from "react";
import { CardPile } from "../game/GameComponents";
import { BattleLayoutConfig } from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { cn } from "../../lib/utils";
import {
  BattlePilePresetId,
  DEFAULT_BATTLE_PILE_PRESET_ID,
} from "../game/battleCardStackVisuals";

const noopDivRef = () => {};

export interface BattlePileRackProps {
  presentation: "desktop" | "mobile";
  targetDeckCount: number;
  deckCount: number;
  targetDeckAnchorRef?: (node: HTMLDivElement | null) => void;
  deckAnchorRef?: (node: HTMLDivElement | null) => void;
  discardAnchorRef?: (node: HTMLDivElement | null) => void;
  layout?: BattleLayoutConfig;
  fitParent?: boolean;
}

export interface BattleSinglePileProps {
  label: string;
  count: number;
  color: string;
  variant?: "deck" | "target";
  anchorRef?: (node: HTMLDivElement | null) => void;
  fitParent?: boolean;
  className?: string;
  pilePresetId?: BattlePilePresetId;
}

export interface BattlePileRailProps {
  layout?: BattleLayoutConfig;
  discardAnchorRef?: (node: HTMLDivElement | null) => void;
  className?: string;
  children: React.ReactNode;
}

export const BattleSinglePile: React.FC<BattleSinglePileProps> = ({
  label,
  count,
  color,
  variant = "deck",
  anchorRef = noopDivRef,
  fitParent = false,
  className,
  pilePresetId = DEFAULT_BATTLE_PILE_PRESET_ID,
}) => (
  <CardPile
    label={label}
    count={count}
    color={color}
    variant={variant}
    anchorRef={anchorRef}
    fitParent={fitParent}
    className={className}
    visualPresetId={pilePresetId}
  />
);

export const BattlePileRail: React.FC<BattlePileRailProps> = ({
  layout = battleActiveLayoutConfig,
  discardAnchorRef = noopDivRef,
  className,
  children,
}) => {
  const rackVars = {
    "--battle-sidebar-rail-width": `${layout.sidebars.railWidth}px`,
    "--battle-sidebar-rack-gap": `${layout.sidebars.deckRackGap}px`,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full items-start justify-center gap-[var(--battle-sidebar-rack-gap)]",
        className,
      )}
      style={rackVars}
    >
      <div ref={discardAnchorRef} className="pointer-events-none absolute left-2 top-1/2 h-20 w-14 -translate-y-1/2 opacity-0" />
      {children}
    </div>
  );
};

export const BattlePileRack: React.FC<BattlePileRackProps> = ({
  presentation,
  targetDeckCount,
  deckCount,
  targetDeckAnchorRef = noopDivRef,
  deckAnchorRef = noopDivRef,
  discardAnchorRef = noopDivRef,
  layout = battleActiveLayoutConfig,
  fitParent = false,
}) => {
  if (presentation === "mobile") {
    return (
      <div className="flex items-start gap-3">
        <div>
          <BattleSinglePile
            label="ALVOS"
            count={targetDeckCount}
            color="bg-rose-950"
            variant="target"
            anchorRef={targetDeckAnchorRef}
            pilePresetId={layout.visuals.targetPilePresetId}
          />
        </div>
        <div>
          <BattleSinglePile
            label="DECK"
            count={deckCount}
            color="bg-amber-950"
            variant="deck"
            anchorRef={deckAnchorRef}
            pilePresetId={layout.visuals.deckPilePresetId}
          />
        </div>
        <div ref={discardAnchorRef} className="pointer-events-none h-0 w-0 opacity-0" />
      </div>
    );
  }

  return (
    <BattlePileRail
      layout={layout}
      discardAnchorRef={discardAnchorRef}
      className={fitParent ? "max-w-none" : "max-w-[var(--battle-sidebar-rail-width)]"}
    >
      <div className="min-w-0">
        <BattleSinglePile
          label="ALVOS"
          count={targetDeckCount}
          color="bg-rose-950"
          variant="target"
          anchorRef={targetDeckAnchorRef}
          pilePresetId={layout.visuals.targetPilePresetId}
        />
      </div>
      <div className="min-w-0">
        <BattleSinglePile
          label="DECK"
          count={deckCount}
          color="bg-amber-950"
          variant="deck"
          anchorRef={deckAnchorRef}
          pilePresetId={layout.visuals.deckPilePresetId}
        />
      </div>
    </BattlePileRail>
  );
};
