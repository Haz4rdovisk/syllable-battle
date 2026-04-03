import { ChronicleEntry, GameMessage, GameState } from "../../types/game";
import { BattleFieldLaneSlot } from "./BattleFieldLane";
import {
  BattleTargetFieldSlotState,
  buildBattleTargetFieldStateFromSceneSlots,
} from "./BattleTargetField";
import {
  BattleHandLaneCard,
  BattleHandLaneDebugSnapshot,
  BattleHandLaneIncomingCard,
  BattleHandLaneOutgoingCard,
} from "./BattleHandLane";

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
  onClick?: () => void;
}

export interface BattleSceneBoardModel {
  enemyFieldSlots: BattleFieldLaneSlot[];
  playerFieldSlots: BattleFieldLaneSlot[];
  enemyFieldObjects: BattleTargetFieldSlotState[];
  playerFieldObjects: BattleTargetFieldSlotState[];
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

export interface BattleSceneHandModel {
  side: 0 | 1;
  presentation: "local" | "remote";
  stableCards: BattleHandLaneCard[];
  incomingCards?: BattleHandLaneIncomingCard[];
  outgoingCards?: BattleHandLaneOutgoingCard[];
  reservedSlots?: number;
  hoveredCardIndex?: number | null;
  selectedIndexes?: number[];
  canInteract?: boolean;
  showTurnHighlights?: boolean;
  showPlayableHints?: boolean;
  targets?: GameState["players"][0]["targets"];
  freshCardIds?: string[];
  onCardClick?: (index: number) => void;
  onHoverCard?: (index: number | null) => void;
  onIncomingCardComplete?: (incomingCard: BattleHandLaneIncomingCard) => void;
  onOutgoingCardComplete?: (outgoingCard: BattleHandLaneOutgoingCard) => void;
  bindCardRef?: (cardId: string, layoutId: string) => (node: HTMLDivElement | null) => void;
  onDebugSnapshotByScale?: Partial<Record<"desktop" | "mobile", (snapshot: BattleHandLaneDebugSnapshot) => void>>;
}

export interface BattleSceneHandsModel {
  top: BattleSceneHandModel;
  bottom: BattleSceneHandModel;
}

export function createBattleSceneBoardModel(
  board: Omit<
    BattleSceneBoardModel,
    "enemyFieldObjects" | "playerFieldObjects"
  > &
    Partial<
      Pick<BattleSceneBoardModel, "enemyFieldObjects" | "playerFieldObjects">
    >,
): BattleSceneBoardModel {
  const fallbackFieldState = buildBattleTargetFieldStateFromSceneSlots({
    enemyFieldSlots: board.enemyFieldSlots,
    playerFieldSlots: board.playerFieldSlots,
  });

  return {
    ...board,
    enemyFieldObjects: board.enemyFieldObjects ?? fallbackFieldState.enemySlots,
    playerFieldObjects: board.playerFieldObjects ?? fallbackFieldState.playerSlots,
  };
}

export interface BattleSceneModel {
  board: BattleSceneBoardModel;
  leftSidebar: BattleLeftSidebarViewModel;
  rightSidebar: BattleRightSidebarViewModel;
  hands: BattleSceneHandsModel;
}

export type BattleBoardSurfaceViewModel = BattleSceneBoardModel;
export type BattleSceneViewModel = BattleSceneModel;

export const createBattleBoardSurfaceViewModel = createBattleSceneBoardModel;
