import type {
  BattleElementAnchor,
  BattleEditableElementKey,
  BattleElementPropertyConfig,
  BattleLayoutConfig,
} from "./BattleLayoutConfig";

export interface BattleSceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BattleStageMetrics {
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  isPortrait: boolean;
}

export interface BattleStageDomMetrics {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
}

export interface BattleEditorFrame extends BattleSceneRect {
  centerX: number;
  centerY: number;
  parentBaseX: number;
  parentBaseY: number;
  sceneX: number;
  sceneY: number;
}

export const BATTLE_STAGE_WIDTH = 1600;
export const BATTLE_STAGE_HEIGHT = 900;

export const battleSceneReference = {
  width: BATTLE_STAGE_WIDTH,
  height: BATTLE_STAGE_HEIGHT,
} as const;

export const getBattleStageMetrics = (
  viewportWidth: number,
  viewportHeight: number,
): BattleStageMetrics => {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const isPortrait = safeHeight > safeWidth;
  const scale = Math.min(
    safeWidth / BATTLE_STAGE_WIDTH,
    safeHeight / BATTLE_STAGE_HEIGHT,
  );

  return {
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
    scale,
    offsetX: (safeWidth - BATTLE_STAGE_WIDTH * scale) / 2,
    offsetY: (safeHeight - BATTLE_STAGE_HEIGHT * scale) / 2,
    isPortrait,
  };
};

export const getBattleStageDomMetrics = (
  node?: Element | null,
): BattleStageDomMetrics | null => {
  if (typeof document === "undefined") return null;

  const stageRoot =
    (node instanceof Element
      ? node.closest<HTMLElement>('[data-battle-stage-root="true"]')
      : null) ??
    document.querySelector<HTMLElement>('[data-battle-stage-root="true"]');

  if (!stageRoot) return null;

  const rect = stageRoot.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const scaleX = rect.width / BATTLE_STAGE_WIDTH;
  const scaleY = rect.height / BATTLE_STAGE_HEIGHT;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    scaleX,
    scaleY,
  };
};

export const toBattleStageLocalRect = <
  T extends { left: number; top: number; width: number; height: number },
>(
  rect: T | null | undefined,
  stage: BattleStageDomMetrics | null,
) => {
  if (!rect) return null;
  if (!stage) {
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    left: (rect.left - stage.left) / stage.scaleX,
    top: (rect.top - stage.top) / stage.scaleY,
    width: rect.width / stage.scaleX,
    height: rect.height / stage.scaleY,
  };
};

export const toBattleScreenRect = (
  rect: BattleSceneRect,
  stage: BattleStageMetrics,
): BattleSceneRect => ({
  x: stage.offsetX + rect.x * stage.scale,
  y: stage.offsetY + rect.y * stage.scale,
  width: rect.width * stage.scale,
  height: rect.height * stage.scale,
});

export const getBattleAnchorOffset = (
  width: number,
  height: number,
  anchor: BattleElementAnchor,
) => {
  switch (anchor) {
    case "top-left":
      return { x: 0, y: 0 };
    case "top":
      return { x: width / 2, y: 0 };
    case "top-right":
      return { x: width, y: 0 };
    case "left":
      return { x: 0, y: height / 2 };
    case "right":
      return { x: width, y: height / 2 };
    case "bottom-left":
      return { x: 0, y: height };
    case "bottom":
      return { x: width / 2, y: height };
    case "bottom-right":
      return { x: width, y: height };
    case "center":
    default:
      return { x: width / 2, y: height / 2 };
  }
};

export const getBattleEditorFrame = (
  config: BattleElementPropertyConfig,
  parentBaseX: number,
  parentBaseY: number,
): BattleEditorFrame => {
  const width = Math.max(0, config.width);
  const height = Math.max(0, config.height);
  const offset = getBattleAnchorOffset(width, height, config.anchor);
  const centerX = BATTLE_STAGE_WIDTH / 2 + config.x;
  const centerY = BATTLE_STAGE_HEIGHT / 2 + config.y;
  const globalLeft = centerX - offset.x;
  const globalTop = centerY - offset.y;

  return {
    x: globalLeft - parentBaseX,
    y: globalTop - parentBaseY,
    width,
    height,
    centerX,
    centerY,
    parentBaseX,
    parentBaseY,
    sceneX: globalLeft,
    sceneY: globalTop,
  };
};

export const battleGlobalFrameToScenePosition = (
  rect: { x: number; y: number; width: number; height: number },
  anchor: BattleElementAnchor,
) => {
  const offset = getBattleAnchorOffset(rect.width, rect.height, anchor);

  return {
    x: Math.round(rect.x + offset.x - BATTLE_STAGE_WIDTH / 2),
    y: Math.round(rect.y + offset.y - BATTLE_STAGE_HEIGHT / 2),
  };
};

export const battleEditorFrameToScenePosition = (
  rect: { x: number; y: number; width: number; height: number },
  anchor: BattleElementAnchor,
  parentBaseX: number,
  parentBaseY: number,
) =>
  battleGlobalFrameToScenePosition(
    {
      x: rect.x + parentBaseX,
      y: rect.y + parentBaseY,
      width: rect.width,
      height: rect.height,
    },
    anchor,
  );

export const getBattleElementParentBase = (
  key: BattleEditableElementKey,
  layout: BattleLayoutConfig,
) => {
  const shellSlots = getBattleDesktopShellSlots(layout);
  const sidebarSlots = getBattleDesktopSidebarSlots(layout);
  const boardLeft =
    shellSlots.board.x + Math.round((shellSlots.board.width - layout.elements.board.width) / 2);
  const boardTop = shellSlots.board.y;

  switch (key) {
    case "shell":
    case "enemyField":
    case "playerField":
    case "boardMessage":
    case "enemyPill":
    case "playerPill":
      return { x: 0, y: 0 };
    case "board":
      return { x: shellSlots.board.x, y: shellSlots.board.y };
    case "topHand":
      return { x: shellSlots.centerTop.x, y: shellSlots.centerTop.y };
    case "bottomHand":
      return { x: shellSlots.centerBottom.x, y: shellSlots.centerBottom.y };
    case "enemyTargetDeck":
    case "enemyDeck":
    case "chronicles":
      return { x: shellSlots.leftSidebar.x, y: shellSlots.leftSidebar.y };
    case "playerTargetDeck":
    case "playerDeck":
    case "status":
    case "action":
      return { x: shellSlots.rightSidebar.x, y: shellSlots.rightSidebar.y };
    default:
      return { x: 0, y: 0 };
  }
};

export const getBattleElementSceneRect = (
  key: BattleEditableElementKey,
  layout: BattleLayoutConfig,
): BattleSceneRect => {
  const config = layout.elements[key];
  const parentBase = getBattleElementParentBase(key, layout);
  const frame = getBattleEditorFrame(config, parentBase.x, parentBase.y);

  return {
    x: frame.sceneX,
    y: frame.sceneY,
    width: frame.width,
    height: frame.height,
  };
};

export const getBattleDesktopShellSlots = (
  layout: BattleLayoutConfig,
): {
  leftSidebar: BattleSceneRect;
  rightSidebar: BattleSceneRect;
  centerTop: BattleSceneRect;
  board: BattleSceneRect;
  centerBottom: BattleSceneRect;
} => {
  const scene = battleSceneReference;
  const sidebarWidth = layout.shell.desktopSidebarWidth;
  const gap = layout.shell.desktopGap;
  const centerX = sidebarWidth + gap;
  const centerWidth = scene.width - centerX * 2;

  return {
    leftSidebar: {
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: scene.height,
    },
    rightSidebar: {
      x: scene.width - sidebarWidth,
      y: 0,
      width: sidebarWidth,
      height: scene.height,
    },
    centerTop: {
      x: centerX,
      y: 0,
      width: centerWidth,
      height: layout.shell.desktopTopRailHeight,
    },
    board: {
      x: centerX,
      y: layout.shell.desktopBoardTopOffset,
      width: centerWidth,
      height:
        scene.height -
        layout.shell.desktopBoardTopOffset -
        layout.shell.desktopBoardBottomOffset,
    },
    centerBottom: {
      x: centerX,
      y: scene.height - layout.shell.desktopBottomRailHeight,
      width: centerWidth,
      height: layout.shell.desktopBottomRailHeight,
    },
  };
};

export const getBattleDesktopSidebarSlots = (
  layout: BattleLayoutConfig,
): {
  enemyTargetDeck: BattleSceneRect;
  enemyDeck: BattleSceneRect;
  chronicles: BattleSceneRect;
  status: BattleSceneRect;
  action: BattleSceneRect;
  playerTargetDeck: BattleSceneRect;
  playerDeck: BattleSceneRect;
} => {
  const shell = getBattleDesktopShellSlots(layout);
  const sidebarWidth = shell.leftSidebar.width;
  const sceneHeight = BATTLE_STAGE_HEIGHT;
  const deckGap = layout.sidebars.deckRackGap;
  const enemyTargetDeckWidth = layout.elements.enemyTargetDeck.width;
  const enemyDeckWidth = layout.elements.enemyDeck.width;
  const playerTargetDeckWidth = layout.elements.playerTargetDeck.width;
  const playerDeckWidth = layout.elements.playerDeck.width;
  const enemyDeckHeight = Math.max(
    layout.elements.enemyTargetDeck.height,
    layout.elements.enemyDeck.height,
  );
  const playerDeckHeight = Math.max(
    layout.elements.playerTargetDeck.height,
    layout.elements.playerDeck.height,
  );
  const enemyPairWidth = enemyTargetDeckWidth + enemyDeckWidth + deckGap;
  const playerPairWidth = playerTargetDeckWidth + playerDeckWidth + deckGap;
  const enemyDeckStartX = Math.round((sidebarWidth - enemyPairWidth) / 2);
  const playerDeckStartX = Math.round((sidebarWidth - playerPairWidth) / 2);
  const topDeckY = 12;
  const chroniclesY = topDeckY + enemyDeckHeight + 16;
  const decksBaseY = sceneHeight - playerDeckHeight - 12;
  const statusX = Math.round(
    (sidebarWidth - layout.elements.status.width) / 2,
  );
  const actionX = Math.round(
    (sidebarWidth - layout.elements.action.width) / 2,
  );
  const statusY = 8;
  const actionY = Math.round(
    (statusY +
      layout.elements.status.height +
      decksBaseY -
      layout.elements.action.height) /
      2,
  );

  return {
    enemyTargetDeck: {
      x: enemyDeckStartX,
      y: topDeckY,
      width: enemyTargetDeckWidth,
      height: layout.elements.enemyTargetDeck.height,
    },
    enemyDeck: {
      x: enemyDeckStartX + enemyTargetDeckWidth + deckGap,
      y: topDeckY,
      width: enemyDeckWidth,
      height: layout.elements.enemyDeck.height,
    },
    chronicles: {
      x: Math.round((sidebarWidth - layout.elements.chronicles.width) / 2),
      y: chroniclesY,
      width: layout.elements.chronicles.width,
      height: layout.elements.chronicles.height,
    },
    status: {
      x: statusX,
      y: statusY,
      width: layout.elements.status.width,
      height: layout.elements.status.height,
    },
    action: {
      x: actionX,
      y: actionY,
      width: layout.elements.action.width,
      height: layout.elements.action.height,
    },
    playerTargetDeck: {
      x: playerDeckStartX,
      y: decksBaseY,
      width: playerTargetDeckWidth,
      height: layout.elements.playerTargetDeck.height,
    },
    playerDeck: {
      x: playerDeckStartX + playerTargetDeckWidth + deckGap,
      y: decksBaseY,
      width: playerDeckWidth,
      height: layout.elements.playerDeck.height,
    },
  };
};

export const getBattleDesktopOverlaySlots = (
  layout: BattleLayoutConfig,
): {
  enemyPill: BattleSceneRect;
  playerPill: BattleSceneRect;
} => {
  const inset = 16;
  const sceneHeight = BATTLE_STAGE_HEIGHT;
  const enemyPill = layout.elements.enemyPill;
  const playerPill = layout.elements.playerPill;

  return {
    enemyPill: {
      x: inset,
      y: inset,
      width: enemyPill.width,
      height: enemyPill.height,
    },
    playerPill: {
      x: inset,
      y: sceneHeight - playerPill.height - inset,
      width: playerPill.width,
      height: playerPill.height,
    },
  };
};
