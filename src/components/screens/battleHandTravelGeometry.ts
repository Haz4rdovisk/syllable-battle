export interface BattleHandTravelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BattleHandTravelLayout {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

export interface BattleHandTravelSceneRect {
  sceneLeft: number;
  sceneTop: number;
}

interface BattleHandTravelBaseInput {
  baseHandFrame: {
    width: number;
    height: number;
  };
  bottomOffset: number;
  cardWidth: number;
  cardHeight: number;
  handSceneScale: number;
  sceneRect: BattleHandTravelSceneRect;
}

interface BattleHandTravelMotionBase {
  baseLeft: number;
  baseTop: number;
  portalBaseLeft: number;
  portalBaseTop: number;
}

export interface BattleHandIncomingTravelMotion extends BattleHandTravelMotionBase {
  deckExitX: number;
  deckExitY: number;
  startX: number;
  startY: number;
  slotX: number;
  slotY: number;
  startScale: number;
}

export interface BattleHandOutgoingTravelMotion extends BattleHandTravelMotionBase {
  destinationCenterX: number;
  destinationCenterY: number;
  deckBottomX: number;
  deckBottomY: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  slotX: number;
  slotY: number;
  initialScale: number;
  endScale: number;
}

const clampScale = (value: number, min = 0.72, max = 1.24) =>
  Math.min(max, Math.max(min, value));

const getBattleHandTravelBase = ({
  baseHandFrame,
  bottomOffset,
  cardWidth,
  cardHeight,
  handSceneScale,
  sceneRect,
}: BattleHandTravelBaseInput): BattleHandTravelMotionBase => {
  const baseLeft = baseHandFrame.width / 2 - cardWidth / 2;
  const baseTop = baseHandFrame.height - bottomOffset - cardHeight;

  return {
    baseLeft,
    baseTop,
    portalBaseLeft: sceneRect.sceneLeft + baseLeft * handSceneScale,
    portalBaseTop: sceneRect.sceneTop + baseTop * handSceneScale,
  };
};

export const getBattleHandTravelSlotOffset = (
  layout: BattleHandTravelLayout,
  handSceneScale: number,
) => ({
  x: layout.x * handSceneScale,
  y: layout.y * handSceneScale,
});

export const getBattleHandIncomingTravelMotion = ({
  originRect,
  layout,
  baseHandFrame,
  bottomOffset,
  cardWidth,
  cardHeight,
  handSceneScale,
  sceneRect,
}: {
  originRect: BattleHandTravelRect;
  layout: BattleHandTravelLayout;
  baseHandFrame: {
    width: number;
    height: number;
  };
  bottomOffset: number;
  cardWidth: number;
  cardHeight: number;
  handSceneScale: number;
  sceneRect: BattleHandTravelSceneRect;
}): BattleHandIncomingTravelMotion => {
  const base = getBattleHandTravelBase({
    baseHandFrame,
    bottomOffset,
    cardWidth,
    cardHeight,
    handSceneScale,
    sceneRect,
  });
  const slotOffset = getBattleHandTravelSlotOffset(layout, handSceneScale);
  const deckExitX = originRect.left + originRect.width / 2 - cardWidth / 2;
  const deckExitY =
    originRect.top +
    Math.max(8, originRect.height * 0.14) -
    cardHeight * 0.18;

  return {
    ...base,
    deckExitX,
    deckExitY,
    startX: deckExitX - base.portalBaseLeft,
    startY: deckExitY - base.portalBaseTop,
    slotX: slotOffset.x,
    slotY: slotOffset.y,
    startScale:
      cardWidth > 0 && cardHeight > 0
        ? clampScale(
            Math.min(
              originRect.width / cardWidth,
              originRect.height / cardHeight,
            ),
          )
        : 0.92,
  };
};

export const getBattleHandOutgoingTravelMotion = ({
  destinationRect,
  destinationMode,
  endScale,
  preserveScale = false,
  initialRect,
  layout,
  baseHandFrame,
  bottomOffset,
  cardWidth,
  cardHeight,
  handSceneScale,
  sceneRect,
}: {
  destinationRect: BattleHandTravelRect;
  destinationMode: "deck-bottom" | "zone-center";
  endScale?: number;
  preserveScale?: boolean;
  initialRect?: BattleHandTravelRect | null;
  layout: BattleHandTravelLayout;
  baseHandFrame: {
    width: number;
    height: number;
  };
  bottomOffset: number;
  cardWidth: number;
  cardHeight: number;
  handSceneScale: number;
  sceneRect: BattleHandTravelSceneRect;
}): BattleHandOutgoingTravelMotion => {
  const base = getBattleHandTravelBase({
    baseHandFrame,
    bottomOffset,
    cardWidth,
    cardHeight,
    handSceneScale,
    sceneRect,
  });
  const slotOffset = getBattleHandTravelSlotOffset(layout, handSceneScale);
  const destinationCenterX =
    destinationRect.left + destinationRect.width / 2 - cardWidth / 2;
  const destinationCenterY =
    destinationRect.top + destinationRect.height / 2 - cardHeight / 2;
  const deckBottomX = destinationCenterX;
  const deckBottomY =
    destinationRect.top +
    destinationRect.height -
    Math.max(10, destinationRect.height * 0.16) -
    cardHeight * 0.82;
  const initialLeft =
    initialRect != null
      ? initialRect.left + initialRect.width / 2 - cardWidth / 2
      : base.portalBaseLeft + slotOffset.x;
  const initialTop =
    initialRect != null
      ? initialRect.top + initialRect.height / 2 - cardHeight / 2
      : base.portalBaseTop + slotOffset.y;
  const absoluteEndLeft =
    destinationMode === "zone-center" ? destinationCenterX : deckBottomX;
  const absoluteEndTop =
    destinationMode === "zone-center" ? destinationCenterY : deckBottomY;
  const resolvedRestScale = Math.min(
    1.4,
    Math.max(0.6, layout.scale * handSceneScale),
  );
  const resolvedInitialScale =
    initialRect && cardWidth > 0 && cardHeight > 0
      ? clampScale(
          Math.min(
            initialRect.width / cardWidth,
            initialRect.height / cardHeight,
          ),
          0.72,
          1.4,
        )
      : 1;

  return {
    ...base,
    destinationCenterX,
    destinationCenterY,
    deckBottomX,
    deckBottomY,
    startX: initialLeft - base.portalBaseLeft,
    startY: initialTop - base.portalBaseTop,
    endX: absoluteEndLeft - base.portalBaseLeft,
    endY: absoluteEndTop - base.portalBaseTop,
    slotX: slotOffset.x,
    slotY: slotOffset.y,
    initialScale: resolvedInitialScale,
    endScale:
      endScale ??
      (preserveScale ? resolvedInitialScale : resolvedRestScale),
  };
};
