import { ChronicleEntry, GameMessage } from "../../types/game";
import { BattleFieldLaneSlot } from "./BattleFieldLane";

export interface BattlePortraitViewModel {
  label: string;
  avatar?: string;
  isLocal: boolean;
  life: number;
  active: boolean;
  flashDamage: number;
}

export interface BattleDeckRackViewModel {
  targetDeckCount: number;
  deckCount: number;
}

export interface BattleHudViewModel {
  title: string;
  turnLabel: string;
  clock: string;
  clockUrgent: boolean;
}

export interface BattleActionButtonViewModel {
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface BattleSceneBoardModel {
  enemyFieldSlots: BattleFieldLaneSlot[];
  playerFieldSlots: BattleFieldLaneSlot[];
  currentMessage: GameMessage | null;
  enemyPortrait: BattlePortraitViewModel;
  playerPortrait: BattlePortraitViewModel;
}

export interface BattleLeftSidebarViewModel {
  decks: BattleDeckRackViewModel;
  chronicles: ChronicleEntry[];
}

export interface BattleRightSidebarViewModel {
  hud: BattleHudViewModel;
  decks: BattleDeckRackViewModel;
  action?: BattleActionButtonViewModel;
}

export function createBattleSceneBoardModel(
  board: BattleSceneBoardModel,
): BattleSceneBoardModel {
  return board;
}

export interface BattleSceneModel {
  board: BattleSceneBoardModel;
  leftSidebar: BattleLeftSidebarViewModel;
  rightSidebar: BattleRightSidebarViewModel;
}

export type BattleBoardSurfaceViewModel = BattleSceneBoardModel;
export type BattleSceneViewModel = BattleSceneModel;

export const createBattleBoardSurfaceViewModel = createBattleSceneBoardModel;
