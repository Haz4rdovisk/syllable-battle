import type {
  BattleEditableElementKey,
  BattleFieldContainerElementKey,
  BattleLayoutConfig,
  BattleLayoutDeviceKey,
  BattleTargetFieldSlotElementKey,
} from "./BattleLayoutConfig";
import {
  BATTLE_TARGET_FIELD_SLOT_COUNT,
  getBattleTargetFieldSlotElementKey,
} from "./BattleLayoutConfig";
import type {
  BattleSceneRect,
  BattleStageMetrics,
} from "./BattleSceneSpace";
import {
  getBattleCompactShellSlots,
  getBattleDesktopShellSlots,
  getBattleElementSceneRect,
  getBattleFieldContainerElementKey,
  getBattleFieldContainerSceneRect,
  getBattleStageMetrics,
  getBattleTargetFieldSlotLocalRect,
  getBattleTargetFieldSlotSceneRect,
  shouldUseBattleMobileShell,
} from "./BattleSceneSpace";

export interface BattleScenePoint {
  x: number;
  y: number;
}

export interface BattleSceneLayoutElementBridge {
  key: BattleEditableElementKey;
  sceneRect: BattleSceneRect;
  center: BattleScenePoint;
}

export interface BattleSceneLayoutSlotBridge {
  side: "player" | "enemy";
  slotIndex: number;
  elementKey: BattleTargetFieldSlotElementKey;
  sceneRect: BattleSceneRect;
  localRect: BattleSceneRect;
  center: BattleScenePoint;
}

export interface BattleSceneLayoutFieldBridge {
  side: "player" | "enemy";
  elementKey: BattleFieldContainerElementKey;
  sceneRect: BattleSceneRect;
  center: BattleScenePoint;
  slots: BattleSceneLayoutSlotBridge[];
}

export interface BattleSceneLayoutBridge {
  layout: BattleLayoutConfig;
  layoutDevice: BattleLayoutDeviceKey;
  viewportWidth: number;
  viewportHeight: number;
  stageMetrics: BattleStageMetrics;
  usesMobileShell: boolean;
  desktopShellSlots: ReturnType<typeof getBattleDesktopShellSlots>;
  compactShellSlots: ReturnType<typeof getBattleCompactShellSlots>;
  elements: Record<BattleEditableElementKey, BattleSceneLayoutElementBridge>;
  fields: Record<"player" | "enemy", BattleSceneLayoutFieldBridge>;
}

const getRectCenter = (rect: BattleSceneRect): BattleScenePoint => ({
  x: Math.round(rect.x + rect.width / 2),
  y: Math.round(rect.y + rect.height / 2),
});

const buildFieldBridge = (
  side: "player" | "enemy",
  layout: BattleLayoutConfig,
): BattleSceneLayoutFieldBridge => {
  const sceneRect = getBattleFieldContainerSceneRect(side, layout);
  const slots = Array.from(
    { length: BATTLE_TARGET_FIELD_SLOT_COUNT },
    (_, slotIndex) => {
      const elementKey = getBattleTargetFieldSlotElementKey(side, slotIndex);
      const slotSceneRect = getBattleTargetFieldSlotSceneRect(
        side,
        slotIndex,
        layout,
      );
      return {
        side,
        slotIndex,
        elementKey,
        sceneRect: slotSceneRect,
        localRect: getBattleTargetFieldSlotLocalRect(side, slotIndex, layout),
        center: getRectCenter(slotSceneRect),
      };
    },
  );

  return {
    side,
    elementKey: getBattleFieldContainerElementKey(side),
    sceneRect,
    center: getRectCenter(sceneRect),
    slots,
  };
};

export const buildBattleSceneLayoutBridge = ({
  layout,
  layoutDevice,
  viewportWidth,
  viewportHeight,
}: {
  layout: BattleLayoutConfig;
  layoutDevice: BattleLayoutDeviceKey;
  viewportWidth: number;
  viewportHeight: number;
}): BattleSceneLayoutBridge => {
  const elements = (
    Object.keys(layout.elements) as BattleEditableElementKey[]
  ).reduce<Record<BattleEditableElementKey, BattleSceneLayoutElementBridge>>(
    (acc, key) => {
      const sceneRect = getBattleElementSceneRect(key, layout);
      acc[key] = {
        key,
        sceneRect,
        center: getRectCenter(sceneRect),
      };
      return acc;
    },
    {} as Record<BattleEditableElementKey, BattleSceneLayoutElementBridge>,
  );

  return {
    layout,
    layoutDevice,
    viewportWidth,
    viewportHeight,
    stageMetrics: getBattleStageMetrics(viewportWidth, viewportHeight),
    usesMobileShell: shouldUseBattleMobileShell(layoutDevice),
    desktopShellSlots: getBattleDesktopShellSlots(layout),
    compactShellSlots: getBattleCompactShellSlots(layout, viewportHeight <= 464),
    elements,
    fields: {
      player: buildFieldBridge("player", layout),
      enemy: buildFieldBridge("enemy", layout),
    },
  };
};
