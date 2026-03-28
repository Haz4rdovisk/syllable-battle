import { getBattleHandFrame } from "./battleFlow";
import {
  BattleCardBackPresetId,
  BattlePilePresetId,
  DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
  DEFAULT_BATTLE_PILE_PRESET_ID,
  LegacyBattleCardStackPresetId,
} from "../game/battleCardStackVisuals";

const BATTLE_STAGE_WIDTH = 1600;
const BATTLE_STAGE_HEIGHT = 900;
const BATTLE_STAGE_CENTER_X = BATTLE_STAGE_WIDTH / 2;
const BATTLE_STAGE_CENTER_Y = BATTLE_STAGE_HEIGHT / 2;

export interface BattleShellLayoutConfig {
  desktopSidebarWidth: number;
  desktopGap: number;
  desktopTopRailHeight: number;
  desktopBoardTopOffset: number;
  desktopBoardBottomOffset: number;
  desktopBottomRailHeight: number;
  mobileFooterHandTopPadding: number;
}

export interface BattleBoardLayoutConfig {
  desktopMaxWidth: number;
  desktopLaneMaxWidth: number;
  mobileLaneMaxWidth: number;
  mobileRowMinHeight: number;
  mobileGap: number;
  desktopGap: number;
  mobilePaddingX: number;
  mobilePaddingY: number;
  desktopPaddingX: number;
  desktopPaddingTop: number;
  desktopPaddingBottom: number;
  targetCardMinWidth: number;
  targetCardMaxWidth: number;
  targetCardMinHeight: number;
  targetCardMaxHeight: number;
}

export interface BattleSidebarLayoutConfig {
  railWidth: number;
  chroniclesHeight: number;
  deckRackGap: number;
  topHandOffsetY: number;
}

export interface BattleHudLayoutConfig {
  statusWidth: number;
  statusHeight: number;
  mobileStatusWidth: number;
  mobileStatusHeight: number;
  actionWidth: number;
  actionHeight: number;
  mobileActionWidth: number;
  mobileActionHeight: number;
  actionSlotHeight: number;
}

export type BattleEditableElementKey =
  | "shell"
  | "board"
  | "enemyField"
  | "playerField"
  | "boardMessage"
  | "chronicles"
  | "enemyTargetDeck"
  | "enemyDeck"
  | "playerTargetDeck"
  | "playerDeck"
  | "topHand"
  | "bottomHand"
  | "status"
  | "action"
  | "enemyPill"
  | "playerPill";

export type BattleElementAnchor =
  | "center"
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export type BattleElementEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface BattleElementPropertyConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  anchor: BattleElementAnchor;
  lockAspectRatio: boolean;
  snapToGrid: boolean;
  slideX: number;
  slideY: number;
  duration: number;
  delay: number;
  easing: BattleElementEasing;
  visibleDesktop: boolean;
  visibleTablet: boolean;
  visibleMobile: boolean;
}

export interface BattleTextLayoutConfig {
  chroniclesTitle: string;
  statusTitle: string;
  actionTitle: string;
  actionSubtitle: string;
  actionTitleHover: string;
  actionTitlePressed: string;
  actionTitleDisabled: string;
  actionTitleSelected: string;
  actionSubtitleHover: string;
  actionSubtitlePressed: string;
  actionSubtitleDisabled: string;
  actionSubtitleSelected: string;
  titleFontSize: number;
  titleLetterSpacing: number;
  bodyFontSize: number;
  bodyLetterSpacing: number;
  titleAlign: "left" | "center" | "right";
  bodyAlign: "left" | "center" | "right";
  titleColor: string;
  bodyColor: string;
}

export interface BattleAnimationAnchorPoint {
  x: number;
  y: number;
}

export interface BattleAnimationLayoutConfig {
  openingTargetEntry0Origin: BattleAnimationAnchorPoint | null;
  openingTargetEntry1Origin: BattleAnimationAnchorPoint | null;
  openingTargetEntry2Origin: BattleAnimationAnchorPoint | null;
  openingTargetEntry3Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry0Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry1Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry2Origin: BattleAnimationAnchorPoint | null;
  replacementTargetEntry3Origin: BattleAnimationAnchorPoint | null;
  postPlayHandDrawOrigin: BattleAnimationAnchorPoint | null;
  handPlayTarget0Destination: BattleAnimationAnchorPoint | null;
  handPlayTarget1Destination: BattleAnimationAnchorPoint | null;
  mulliganReturn1Destination: BattleAnimationAnchorPoint | null;
  mulliganReturn2Destination: BattleAnimationAnchorPoint | null;
  mulliganReturn3Destination: BattleAnimationAnchorPoint | null;
  mulliganDraw1Origin: BattleAnimationAnchorPoint | null;
  mulliganDraw2Origin: BattleAnimationAnchorPoint | null;
  mulliganDraw3Origin: BattleAnimationAnchorPoint | null;
  targetAttack0Impact: BattleAnimationAnchorPoint | null;
  targetAttack1Impact: BattleAnimationAnchorPoint | null;
  targetAttack2Impact: BattleAnimationAnchorPoint | null;
  targetAttack3Impact: BattleAnimationAnchorPoint | null;
  targetAttack0Destination: BattleAnimationAnchorPoint | null;
  targetAttack1Destination: BattleAnimationAnchorPoint | null;
  targetAttack2Destination: BattleAnimationAnchorPoint | null;
  targetAttack3Destination: BattleAnimationAnchorPoint | null;
}

export interface BattleVisualLayoutConfig {
  cardBackPresetId: BattleCardBackPresetId;
  pilePresetId: BattlePilePresetId;
}

type LegacyBattleVisualLayoutOverrides = Partial<BattleVisualLayoutConfig> & {
  cardStackPresetId?: LegacyBattleCardStackPresetId;
};

export interface BattleLayoutConfig {
  shell: BattleShellLayoutConfig;
  board: BattleBoardLayoutConfig;
  sidebars: BattleSidebarLayoutConfig;
  hud: BattleHudLayoutConfig;
  visuals: BattleVisualLayoutConfig;
  elements: Record<BattleEditableElementKey, BattleElementPropertyConfig>;
  text: BattleTextLayoutConfig;
  animations: BattleAnimationLayoutConfig;
}

export type BattleLayoutOverrides = Partial<{
  shell: Partial<BattleShellLayoutConfig>;
  board: Partial<BattleBoardLayoutConfig>;
  sidebars: Partial<BattleSidebarLayoutConfig>;
  hud: Partial<BattleHudLayoutConfig>;
  visuals: Partial<BattleVisualLayoutConfig>;
  elements: Partial<Record<BattleEditableElementKey, Partial<BattleElementPropertyConfig>>>;
  text: Partial<BattleTextLayoutConfig>;
  animations: Partial<BattleAnimationLayoutConfig>;
}>;

const createDefaultElementConfig = (): BattleElementPropertyConfig => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  scaleX: 100,
  scaleY: 100,
  opacity: 100,
  zIndex: 0,
  anchor: "center",
  lockAspectRatio: false,
  snapToGrid: false,
  slideX: 0,
  slideY: 0,
  duration: 0.28,
  delay: 0,
  easing: "ease-out",
  visibleDesktop: true,
  visibleTablet: true,
  visibleMobile: true,
});

const defaultShellLayout: BattleShellLayoutConfig = {
  desktopSidebarWidth: 252,
  desktopGap: 12,
  desktopTopRailHeight: 128,
  desktopBoardTopOffset: 124,
  desktopBoardBottomOffset: 142,
  desktopBottomRailHeight: 152,
  mobileFooterHandTopPadding: 28,
};

const defaultBoardLayout: BattleBoardLayoutConfig = {
  desktopMaxWidth: 930,
  desktopLaneMaxWidth: 360,
  mobileLaneMaxWidth: 312,
  mobileRowMinHeight: 170,
  mobileGap: 8,
  desktopGap: 36,
  mobilePaddingX: 12,
  mobilePaddingY: 8,
  desktopPaddingX: 32,
  desktopPaddingTop: 12,
  desktopPaddingBottom: 12,
  targetCardMinWidth: 102,
  targetCardMaxWidth: 148,
  targetCardMinHeight: 156,
  targetCardMaxHeight: 212,
};

const defaultSidebarLayout: BattleSidebarLayoutConfig = {
  railWidth: 244,
  chroniclesHeight: 392,
  deckRackGap: 16,
  topHandOffsetY: -48,
};

const defaultHudLayout: BattleHudLayoutConfig = {
  statusWidth: 200,
  statusHeight: 146,
  mobileStatusWidth: 220,
  mobileStatusHeight: 88,
  actionWidth: 244,
  actionHeight: 112,
  mobileActionWidth: 220,
  mobileActionHeight: 64,
  actionSlotHeight: 162,
};

const defaultVisualLayout: BattleVisualLayoutConfig = {
  cardBackPresetId: DEFAULT_BATTLE_CARD_BACK_PRESET_ID,
  pilePresetId: DEFAULT_BATTLE_PILE_PRESET_ID,
};

const defaultAnimationLayout: BattleAnimationLayoutConfig = {
  openingTargetEntry0Origin: null,
  openingTargetEntry1Origin: null,
  openingTargetEntry2Origin: null,
  openingTargetEntry3Origin: null,
  replacementTargetEntry0Origin: null,
  replacementTargetEntry1Origin: null,
  replacementTargetEntry2Origin: null,
  replacementTargetEntry3Origin: null,
  postPlayHandDrawOrigin: null,
  handPlayTarget0Destination: null,
  handPlayTarget1Destination: null,
  mulliganReturn1Destination: null,
  mulliganReturn2Destination: null,
  mulliganReturn3Destination: null,
  mulliganDraw1Origin: null,
  mulliganDraw2Origin: null,
  mulliganDraw3Origin: null,
  targetAttack0Impact: null,
  targetAttack1Impact: null,
  targetAttack2Impact: null,
  targetAttack3Impact: null,
  targetAttack0Destination: null,
  targetAttack1Destination: null,
  targetAttack2Destination: null,
  targetAttack3Destination: null,
};

const getBattleBoardFrame = (board: BattleBoardLayoutConfig) => ({
  width: board.desktopMaxWidth,
  height:
    board.desktopPaddingTop +
    board.targetCardMaxHeight * 2 +
    board.desktopGap +
    board.desktopPaddingBottom,
});

const getBattleFieldFrame = (board: BattleBoardLayoutConfig) => ({
  width: board.targetCardMaxWidth * 2 + board.desktopGap,
  height: board.targetCardMaxHeight,
});

const getBattleBoardMessageFrame = () => ({
  width: 320,
  height: 92,
});

const getBattlePileFrame = () => ({
  width: 112,
  height: 190,
});

const getBattleChroniclesFrame = (sidebars: BattleSidebarLayoutConfig) => ({
  width: sidebars.railWidth,
  height: sidebars.chroniclesHeight,
});

const getBattleStatusFrame = (hud: BattleHudLayoutConfig) => ({
  width: hud.statusWidth,
  height: hud.statusHeight,
});

const getBattleActionFrame = (hud: BattleHudLayoutConfig) => ({
  width: hud.actionWidth,
  height: hud.actionHeight,
});

const getBattlePillFrame = () => ({
  width: 240,
  height: 88,
});

const toCenteredPosition = (rect: { x: number; y: number; width: number; height: number }) => ({
  x: Math.round(rect.x + rect.width / 2 - BATTLE_STAGE_CENTER_X),
  y: Math.round(rect.y + rect.height / 2 - BATTLE_STAGE_CENTER_Y),
});

const getDefaultBattleElementPositions = (
  shell: BattleShellLayoutConfig,
  board: BattleBoardLayoutConfig,
  sidebars: BattleSidebarLayoutConfig,
  hud: BattleHudLayoutConfig,
) => {
  const boardFrame = getBattleBoardFrame(board);
  const fieldFrame = getBattleFieldFrame(board);
  const boardMessageFrame = getBattleBoardMessageFrame();
  const pileFrame = getBattlePileFrame();
  const chroniclesFrame = getBattleChroniclesFrame(sidebars);
  const statusFrame = getBattleStatusFrame(hud);
  const actionFrame = getBattleActionFrame(hud);
  const pillFrame = getBattlePillFrame();

  const leftSidebarRect = {
    x: 0,
    y: 0,
    width: shell.desktopSidebarWidth,
    height: BATTLE_STAGE_HEIGHT,
  };
  const rightSidebarRect = {
    x: BATTLE_STAGE_WIDTH - shell.desktopSidebarWidth,
    y: 0,
    width: shell.desktopSidebarWidth,
    height: BATTLE_STAGE_HEIGHT,
  };
  const centerX = shell.desktopSidebarWidth + shell.desktopGap;
  const centerWidth = BATTLE_STAGE_WIDTH - centerX * 2;
  const centerTopRect = {
    x: centerX,
    y: 0,
    width: centerWidth,
    height: shell.desktopTopRailHeight,
  };
  const boardRect = {
    x: centerX + Math.round((centerWidth - boardFrame.width) / 2),
    y: shell.desktopBoardTopOffset + 12,
    width: boardFrame.width,
    height: boardFrame.height,
  };
  const centerBottomRect = {
    x: centerX,
    y: BATTLE_STAGE_HEIGHT - shell.desktopBottomRailHeight,
    width: centerWidth,
    height: shell.desktopBottomRailHeight,
  };

  const deckPairWidth = pileFrame.width * 2 + sidebars.deckRackGap;
  const sidebarDeckStartX = Math.round((leftSidebarRect.width - deckPairWidth) / 2);
  const topDeckY = 24;
  const chroniclesY = topDeckY + pileFrame.height + 20;
  const playerDeckY = BATTLE_STAGE_HEIGHT - pileFrame.height - 24;
  const statusRect = {
    x: rightSidebarRect.x + Math.round((rightSidebarRect.width - statusFrame.width) / 2),
    y: 20,
    width: statusFrame.width,
    height: statusFrame.height,
  };
  const actionRect = {
    x: rightSidebarRect.x + Math.round((rightSidebarRect.width - actionFrame.width) / 2),
    y: Math.round(
      (statusRect.y + statusRect.height + playerDeckY - actionFrame.height) / 2,
    ),
    width: actionFrame.width,
    height: actionFrame.height,
  };

  const topHandRect = {
    x: centerTopRect.x + Math.round((centerTopRect.width - defaultEnemyHandFrame.width) / 2),
    y: sidebars.topHandOffsetY + 40,
    width: defaultEnemyHandFrame.width,
    height: defaultEnemyHandFrame.height,
  };
  const bottomHandRect = {
    x: centerBottomRect.x + Math.round((centerBottomRect.width - defaultPlayerHandFrame.width) / 2),
    y: centerBottomRect.y + centerBottomRect.height - defaultPlayerHandFrame.height - 8,
    width: defaultPlayerHandFrame.width,
    height: defaultPlayerHandFrame.height,
  };

  return {
    shell: { x: 0, y: 0 },
    board: toCenteredPosition(boardRect),
    enemyField: toCenteredPosition({
      x: boardRect.x + Math.round((boardRect.width - fieldFrame.width) / 2),
      y: boardRect.y + board.desktopPaddingTop,
      width: fieldFrame.width,
      height: fieldFrame.height,
    }),
    playerField: toCenteredPosition({
      x: boardRect.x + Math.round((boardRect.width - fieldFrame.width) / 2),
      y:
        boardRect.y +
        board.desktopPaddingTop +
        fieldFrame.height +
        board.desktopGap,
      width: fieldFrame.width,
      height: fieldFrame.height,
    }),
    boardMessage: toCenteredPosition({
      x: boardRect.x + Math.round((boardRect.width - boardMessageFrame.width) / 2),
      y: boardRect.y + Math.round((boardRect.height - boardMessageFrame.height) / 2),
      width: boardMessageFrame.width,
      height: boardMessageFrame.height,
    }),
    chronicles: toCenteredPosition({
      x: Math.round((leftSidebarRect.width - chroniclesFrame.width) / 2),
      y: chroniclesY,
      width: chroniclesFrame.width,
      height: chroniclesFrame.height,
    }),
    enemyTargetDeck: toCenteredPosition({
      x: sidebarDeckStartX,
      y: topDeckY,
      width: pileFrame.width,
      height: pileFrame.height,
    }),
    enemyDeck: toCenteredPosition({
      x: sidebarDeckStartX + pileFrame.width + sidebars.deckRackGap,
      y: topDeckY,
      width: pileFrame.width,
      height: pileFrame.height,
    }),
    playerTargetDeck: toCenteredPosition({
      x: rightSidebarRect.x + sidebarDeckStartX,
      y: playerDeckY,
      width: pileFrame.width,
      height: pileFrame.height,
    }),
    playerDeck: toCenteredPosition({
      x: rightSidebarRect.x + sidebarDeckStartX + pileFrame.width + sidebars.deckRackGap,
      y: playerDeckY,
      width: pileFrame.width,
      height: pileFrame.height,
    }),
    topHand: toCenteredPosition(topHandRect),
    bottomHand: toCenteredPosition(bottomHandRect),
    status: toCenteredPosition(statusRect),
    action: toCenteredPosition(actionRect),
    enemyPill: toCenteredPosition({
      x: 24,
      y: 24,
      width: pillFrame.width,
      height: pillFrame.height,
    }),
    playerPill: toCenteredPosition({
      x: 24,
      y: BATTLE_STAGE_HEIGHT - pillFrame.height - 36,
      width: pillFrame.width,
      height: pillFrame.height,
    }),
  };
};

const defaultEnemyHandFrame = getBattleHandFrame("remote", 5, true);
const defaultPlayerHandFrame = getBattleHandFrame("local", 5, true);
const defaultBoardFrame = getBattleBoardFrame(defaultBoardLayout);
const defaultFieldFrame = getBattleFieldFrame(defaultBoardLayout);
const defaultBoardMessageFrame = getBattleBoardMessageFrame();
const defaultPileFrame = getBattlePileFrame();
const defaultChroniclesFrame = getBattleChroniclesFrame(defaultSidebarLayout);
const defaultStatusFrame = getBattleStatusFrame(defaultHudLayout);
const defaultActionFrame = getBattleActionFrame(defaultHudLayout);
const defaultPillFrame = getBattlePillFrame();
const defaultElementPositions = getDefaultBattleElementPositions(
  defaultShellLayout,
  defaultBoardLayout,
  defaultSidebarLayout,
  defaultHudLayout,
);

export const defaultBattleLayoutConfig: BattleLayoutConfig = {
  shell: defaultShellLayout,
  board: defaultBoardLayout,
  sidebars: defaultSidebarLayout,
  hud: defaultHudLayout,
  visuals: defaultVisualLayout,
  elements: {
    shell: {
      ...createDefaultElementConfig(),
      width: BATTLE_STAGE_WIDTH,
      height: BATTLE_STAGE_HEIGHT,
    },
    board: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.board,
      width: defaultBoardFrame.width,
      height: defaultBoardFrame.height,
    },
    enemyField: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.enemyField,
      width: defaultFieldFrame.width,
      height: defaultFieldFrame.height,
    },
    playerField: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.playerField,
      width: defaultFieldFrame.width,
      height: defaultFieldFrame.height,
    },
    boardMessage: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.boardMessage,
      width: defaultBoardMessageFrame.width,
      height: defaultBoardMessageFrame.height,
    },
    chronicles: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.chronicles,
      width: defaultChroniclesFrame.width,
      height: defaultChroniclesFrame.height,
    },
    enemyTargetDeck: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.enemyTargetDeck,
      width: defaultPileFrame.width,
      height: defaultPileFrame.height,
    },
    enemyDeck: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.enemyDeck,
      width: defaultPileFrame.width,
      height: defaultPileFrame.height,
    },
    playerTargetDeck: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.playerTargetDeck,
      width: defaultPileFrame.width,
      height: defaultPileFrame.height,
    },
    playerDeck: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.playerDeck,
      width: defaultPileFrame.width,
      height: defaultPileFrame.height,
    },
    topHand: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.topHand,
      width: defaultEnemyHandFrame.width,
      height: defaultEnemyHandFrame.height,
    },
    bottomHand: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.bottomHand,
      width: defaultPlayerHandFrame.width,
      height: defaultPlayerHandFrame.height,
    },
    status: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.status,
      width: defaultStatusFrame.width,
      height: defaultStatusFrame.height,
    },
    action: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.action,
      width: defaultActionFrame.width,
      height: defaultActionFrame.height,
    },
    enemyPill: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.enemyPill,
      width: defaultPillFrame.width,
      height: defaultPillFrame.height,
    },
    playerPill: {
      ...createDefaultElementConfig(),
      ...defaultElementPositions.playerPill,
      width: defaultPillFrame.width,
      height: defaultPillFrame.height,
    },
  },
  text: {
    chroniclesTitle: "Cronicas",
    statusTitle: "Controle",
    actionTitle: "Trocar",
    actionSubtitle: "Ate 3 cartas",
    actionTitleHover: "",
    actionTitlePressed: "Trocando...",
    actionTitleDisabled: "Indisponivel",
    actionTitleSelected: "",
    actionSubtitleHover: "",
    actionSubtitlePressed: "",
    actionSubtitleDisabled: "Aguarde o turno",
    actionSubtitleSelected: "",
    titleFontSize: 15,
    titleLetterSpacing: 0.12,
    bodyFontSize: 12,
    bodyLetterSpacing: 0.18,
    titleAlign: "center",
    bodyAlign: "center",
    titleColor: "#451a03",
    bodyColor: "#451a03",
  },
  animations: defaultAnimationLayout,
};

export function createBattleLayoutConfig(
  overrides: BattleLayoutOverrides = {},
): BattleLayoutConfig {
  const visualOverrides = (overrides.visuals ?? {}) as LegacyBattleVisualLayoutOverrides;
  const legacyCardStackPresetId = visualOverrides.cardStackPresetId;

  const getLegacyDeckOverride = (
    side: "enemy" | "player",
  ): Partial<BattleElementPropertyConfig> | undefined => {
    const legacyElements = (overrides.elements ?? {}) as Record<
      string,
      Partial<BattleElementPropertyConfig> | undefined
    >;
    return side === "enemy"
      ? legacyElements.enemyDecks
      : legacyElements.playerDecks;
  };

  return {
    shell: {
      ...defaultBattleLayoutConfig.shell,
      ...overrides.shell,
    },
    board: {
      ...defaultBattleLayoutConfig.board,
      ...overrides.board,
    },
    sidebars: {
      ...defaultBattleLayoutConfig.sidebars,
      ...overrides.sidebars,
    },
    hud: {
      ...defaultBattleLayoutConfig.hud,
      ...overrides.hud,
    },
    visuals: {
      cardBackPresetId:
        visualOverrides.cardBackPresetId ??
        legacyCardStackPresetId ??
        defaultBattleLayoutConfig.visuals.cardBackPresetId,
      pilePresetId:
        visualOverrides.pilePresetId ??
        legacyCardStackPresetId ??
        defaultBattleLayoutConfig.visuals.pilePresetId,
    },
    elements: {
      shell: {
        ...defaultBattleLayoutConfig.elements.shell,
        ...overrides.elements?.shell,
      },
      board: {
        ...defaultBattleLayoutConfig.elements.board,
        ...overrides.elements?.board,
      },
      enemyField: {
        ...defaultBattleLayoutConfig.elements.enemyField,
        ...overrides.elements?.enemyField,
      },
      playerField: {
        ...defaultBattleLayoutConfig.elements.playerField,
        ...overrides.elements?.playerField,
      },
      boardMessage: {
        ...defaultBattleLayoutConfig.elements.boardMessage,
        ...overrides.elements?.boardMessage,
      },
      chronicles: {
        ...defaultBattleLayoutConfig.elements.chronicles,
        ...overrides.elements?.chronicles,
      },
      enemyTargetDeck: {
        ...defaultBattleLayoutConfig.elements.enemyTargetDeck,
        ...getLegacyDeckOverride("enemy"),
        ...overrides.elements?.enemyTargetDeck,
      },
      enemyDeck: {
        ...defaultBattleLayoutConfig.elements.enemyDeck,
        ...getLegacyDeckOverride("enemy"),
        ...overrides.elements?.enemyDeck,
      },
      playerTargetDeck: {
        ...defaultBattleLayoutConfig.elements.playerTargetDeck,
        ...getLegacyDeckOverride("player"),
        ...overrides.elements?.playerTargetDeck,
      },
      playerDeck: {
        ...defaultBattleLayoutConfig.elements.playerDeck,
        ...getLegacyDeckOverride("player"),
        ...overrides.elements?.playerDeck,
      },
      topHand: {
        ...defaultBattleLayoutConfig.elements.topHand,
        ...overrides.elements?.topHand,
      },
      bottomHand: {
        ...defaultBattleLayoutConfig.elements.bottomHand,
        ...overrides.elements?.bottomHand,
      },
      status: {
        ...defaultBattleLayoutConfig.elements.status,
        ...overrides.elements?.status,
      },
      action: {
        ...defaultBattleLayoutConfig.elements.action,
        ...overrides.elements?.action,
      },
      enemyPill: {
        ...defaultBattleLayoutConfig.elements.enemyPill,
        ...overrides.elements?.enemyPill,
      },
      playerPill: {
        ...defaultBattleLayoutConfig.elements.playerPill,
        ...overrides.elements?.playerPill,
      },
    },
    text: {
      ...defaultBattleLayoutConfig.text,
      ...overrides.text,
    },
    animations: {
      ...defaultBattleLayoutConfig.animations,
      ...overrides.animations,
    },
  };
}

export function pruneBattleLayoutOverrides(
  overrides: BattleLayoutOverrides = {},
): BattleLayoutOverrides {
  const pruned: BattleLayoutOverrides = {};

  (Object.keys(defaultBattleLayoutConfig) as Array<keyof BattleLayoutConfig>).forEach(
    (sectionKey) => {
      const sectionOverrides = overrides[sectionKey];
      if (!sectionOverrides) return;

      const defaultSection = defaultBattleLayoutConfig[sectionKey];
      const nextSection: Record<string, unknown> = {};

      if (sectionKey === "elements") {
        const elementOverrides = sectionOverrides as NonNullable<
          BattleLayoutOverrides["elements"]
        >;
        const nextElements: Record<string, unknown> = {};

        (Object.keys(elementOverrides) as BattleEditableElementKey[]).forEach((elementKey) => {
          const elementSection = elementOverrides[elementKey];
          if (!elementSection) return;

          const defaultElementSection = defaultBattleLayoutConfig.elements[elementKey];
          if (!defaultElementSection) return;
          const nextElementSection: Record<string, unknown> = {};

          (
            Object.keys(elementSection) as Array<keyof BattleElementPropertyConfig>
          ).forEach((valueKey) => {
            const overrideValue = elementSection[valueKey];
            if (overrideValue === undefined) return;
            if (overrideValue !== defaultElementSection[valueKey]) {
              nextElementSection[String(valueKey)] = overrideValue;
            }
          });

          if (Object.keys(nextElementSection).length > 0) {
            nextElements[elementKey] = nextElementSection;
          }
        });

        if (Object.keys(nextElements).length > 0) {
          pruned.elements = nextElements as never;
        }
        return;
      }

      (
        Object.keys(sectionOverrides) as Array<
          keyof NonNullable<BattleLayoutOverrides[typeof sectionKey]>
        >
      ).forEach((valueKey) => {
        const overrideValue = sectionOverrides[valueKey];
        if (overrideValue === undefined) return;
        if (overrideValue !== defaultSection[valueKey as keyof typeof defaultSection]) {
          nextSection[String(valueKey)] = overrideValue as never;
        }
      });

      if (Object.keys(nextSection).length > 0) {
        pruned[sectionKey] = nextSection as never;
      }
    },
  );

  return pruned;
}

export function createBattleLayoutPresetSource(
  overrides: BattleLayoutOverrides = {},
): string {
  const pruned = pruneBattleLayoutOverrides(overrides);
  const visualOverrides = (overrides.visuals ?? {}) as LegacyBattleVisualLayoutOverrides;
  const legacyCardStackPresetId = visualOverrides.cardStackPresetId;
  const serializable: BattleLayoutOverrides = {
    ...pruned,
    visuals: {
      cardBackPresetId:
        visualOverrides.cardBackPresetId ??
        legacyCardStackPresetId ??
        defaultBattleLayoutConfig.visuals.cardBackPresetId,
      pilePresetId:
        visualOverrides.pilePresetId ??
        legacyCardStackPresetId ??
        defaultBattleLayoutConfig.visuals.pilePresetId,
    },
  };
  return [
    'import {',
    "  BattleLayoutOverrides,",
    "  createBattleLayoutConfig,",
    '} from "./BattleLayoutConfig";',
    "",
    `export const battleActiveLayoutOverrides: BattleLayoutOverrides = ${JSON.stringify(serializable, null, 2)};`,
    "",
    "export const battleActiveLayoutConfig =",
    "  createBattleLayoutConfig(battleActiveLayoutOverrides);",
    "",
  ].join("\n");
}
