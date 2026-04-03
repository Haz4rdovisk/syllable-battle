import { BattleEditableElementKey } from "./BattleLayoutConfig";

export const BATTLE_SCENE_LAYER_ORDER = {
  shell: 10,
  field: 40,
  hand: 70,
  travel: 100,
  boardMessage: 120,
} as const;

const battleSceneElementBaseLayer: Partial<Record<BattleEditableElementKey, number>> = {
  shell: BATTLE_SCENE_LAYER_ORDER.shell,
  enemyField: BATTLE_SCENE_LAYER_ORDER.field,
  playerField: BATTLE_SCENE_LAYER_ORDER.field,
  boardMessage: BATTLE_SCENE_LAYER_ORDER.boardMessage,
};

export const getBattleSceneElementLayer = (
  element: BattleEditableElementKey,
  override?: number,
) => {
  const baseLayer = battleSceneElementBaseLayer[element];
  if (baseLayer === undefined) return override;
  if (override === undefined) return baseLayer;
  return Math.max(baseLayer, override);
};
