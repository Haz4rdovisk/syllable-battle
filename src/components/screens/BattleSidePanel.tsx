import React from "react";
import { CardPile } from "../game/GameComponents";
import {
  BattlePilePresetId,
  DEFAULT_BATTLE_PILE_PRESET_ID,
} from "../game/battleCardStackVisuals";

const noopDivRef = () => {};

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
