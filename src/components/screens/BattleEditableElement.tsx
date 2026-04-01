import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  BattleEditableElementKey,
  BattleElementAnchor,
  BattleElementPropertyConfig,
  BattleLayoutConfig,
} from "./BattleLayoutConfig";
import { battleActiveLayoutConfig } from "./BattleLayoutPreset";
import { BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE } from "./BattleLayoutEditorState";
import {
  battleGlobalFrameToScenePosition,
  getBattleElementParentBase,
  getBattleStageMetrics,
  getBattleEditorFrame,
} from "./BattleSceneSpace";

const anchorToTransformOrigin: Record<BattleElementAnchor, string> = {
  center: "center center",
  top: "center top",
  "top-left": "left top",
  "top-right": "right top",
  left: "left center",
  right: "right center",
  bottom: "center bottom",
  "bottom-left": "left bottom",
  "bottom-right": "right bottom",
};

const easingMap: Record<BattleElementPropertyConfig["easing"], "linear" | "easeIn" | "easeOut" | "easeInOut"> = {
  linear: "linear",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
};

const useViewportMetrics = (
  viewportWidth?: number,
  viewportHeight?: number,
): { width: number; height: number } => {
  const [runtimeSize, setRuntimeSize] = useState(() => ({
    width: typeof window === "undefined" ? 1600 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight,
  }));

  useEffect(() => {
    if (
      viewportWidth !== undefined ||
      viewportHeight !== undefined ||
      typeof window === "undefined"
    ) {
      return;
    }

    const handleResize = () =>
      setRuntimeSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewportHeight, viewportWidth]);

  const width = viewportWidth ?? runtimeSize.width;
  const height = viewportHeight ?? runtimeSize.height;

  return {
    width,
    height,
  };
};

export interface BattleEditableElementProps {
  element: BattleEditableElementKey;
  layout?: BattleLayoutConfig;
  viewportWidth?: number;
  viewportHeight?: number;
  gridSize?: number;
  snapThreshold?: number;
  baseX?: number;
  baseY?: number;
  previewAnimations?: boolean;
  editorMode?: boolean;
  selected?: boolean;
  previewSelectable?: boolean;
  passthrough?: boolean;
  motionReplayNonce?: number;
  snapTargets?: Array<{
    key: BattleEditableElementKey;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  className?: string;
  zIndexOverride?: number;
  children: React.ReactNode;
}

export const BattleEditableElement: React.FC<BattleEditableElementProps> = ({
  element,
  layout = battleActiveLayoutConfig,
  viewportWidth,
  viewportHeight,
  gridSize = 8,
  snapThreshold = 12,
  baseX,
  baseY,
  previewAnimations = false,
  editorMode = false,
  selected = false,
  previewSelectable = true,
  passthrough = false,
  motionReplayNonce = 0,
  snapTargets = [],
  className,
  zIndexOverride,
  children,
}) => {
  const config = layout.elements[element];
  const parentBase = getBattleElementParentBase(element, layout);
  const resolvedBaseX = baseX ?? parentBase.x;
  const resolvedBaseY = baseY ?? parentBase.y;
  const viewportMetrics = useViewportMetrics(viewportWidth, viewportHeight);
  const stageMetrics = getBattleStageMetrics(
    viewportMetrics.width,
    viewportMetrics.height,
  );
  const stageScale = stageMetrics.scale <= 0 ? 1 : stageMetrics.scale;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode:
      | "move"
      | "resize-right"
      | "resize-left"
      | "resize-top"
      | "resize-bottom"
      | "resize-top-left"
      | "resize-top-right"
      | "resize-bottom-left"
      | "resize-bottom-right";
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);
  const [liveConfig, setLiveConfig] = useState(config);
  const [smartGuides, setSmartGuides] = useState<{
    vertical: number | null;
    horizontal: number | null;
  }>({ vertical: null, horizontal: null });

  useEffect(() => {
    setLiveConfig(config);
  }, [config]);

  const resolvedConfig = editorMode ? liveConfig : config;

  const sharedStyle: React.CSSProperties = {
    width:
      resolvedConfig.width > 0
        ? `${Math.max(0, resolvedConfig.width)}px`
        : undefined,
    height:
      resolvedConfig.height > 0
        ? `${Math.max(0, resolvedConfig.height)}px`
        : undefined,
    maxWidth:
      resolvedConfig.width > 0
        ? `${Math.max(0, resolvedConfig.width)}px`
        : undefined,
    maxHeight:
      resolvedConfig.height > 0
        ? `${Math.max(0, resolvedConfig.height)}px`
        : undefined,
    opacity: resolvedConfig.opacity / 100,
    zIndex:
      zIndexOverride ??
      (resolvedConfig.zIndex === 0 ? undefined : resolvedConfig.zIndex),
    transformOrigin: anchorToTransformOrigin[resolvedConfig.anchor],
  };
  const resolvedFrame = getBattleEditorFrame(
    resolvedConfig,
    resolvedBaseX,
    resolvedBaseY,
  );
  const savedFrame = getBattleEditorFrame(config, resolvedBaseX, resolvedBaseY);
  const resolvedPositionStyle =
    className && /\babsolute\b/.test(className) ? undefined : "relative";
  const replayKey =
    motionReplayNonce > 0 ? `${element}-motion-${motionReplayNonce}` : element;

  const postEditorMessage = (payload: unknown) => {
    if (!editorMode || typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage(
      {
        type: BATTLE_LAYOUT_EDITOR_MESSAGE_TYPE,
        payload,
      },
      window.location.origin,
    );
  };

  const selectElementFromPointer = (
    event: Pick<PointerEvent, "ctrlKey" | "metaKey" | "shiftKey">,
  ) => {
    postEditorMessage({
      kind: "select-element",
      element,
      additive: event.shiftKey,
      toggle: event.ctrlKey || event.metaKey,
    });
  };

  const snapValue = (value: number) => {
    if (!resolvedConfig.snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const snapRectCenterToGrid = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (!resolvedConfig.snapToGrid) return rect;

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const snappedCenterX = snapValue(centerX);
    const snappedCenterY = snapValue(centerY);

    return {
      ...rect,
      x: snappedCenterX - rect.width / 2,
      y: snappedCenterY - rect.height / 2,
    };
  };

  const applySmartSnapping = (
    rect: { x: number; y: number; width: number; height: number },
    mode:
      | "move"
      | "resize-right"
      | "resize-left"
      | "resize-top"
      | "resize-bottom"
      | "resize-top-left"
      | "resize-top-right"
      | "resize-bottom-left"
      | "resize-bottom-right",
  ) => {
    if (!resolvedConfig.snapToGrid || snapTargets.length === 0) {
      setSmartGuides({ vertical: null, horizontal: null });
      return rect;
    }

    const threshold = Math.max(4, snapThreshold);
    let nextRect = { ...rect };
    let verticalGuide: number | null = null;
    let horizontalGuide: number | null = null;

    const currentLeft = nextRect.x;
    const currentCenterX = nextRect.x + nextRect.width / 2;
    const currentRight = nextRect.x + nextRect.width;
    const currentTop = nextRect.y;
    const currentCenterY = nextRect.y + nextRect.height / 2;
    const currentBottom = nextRect.y + nextRect.height;

    const horizontalCandidates =
      mode === "move"
        ? [{ type: "center", value: currentCenterX }]
        : mode.includes("left")
          ? [{ type: "left", value: currentLeft }]
          : mode.includes("right")
            ? [{ type: "right", value: currentRight }]
            : [];

    const verticalCandidates =
      mode === "move"
        ? [{ type: "center", value: currentCenterY }]
        : mode.includes("top")
          ? [{ type: "top", value: currentTop }]
          : mode.includes("bottom")
            ? [{ type: "bottom", value: currentBottom }]
            : [];

    let bestHorizontal:
      | { delta: number; guide: number; type: string }
      | null = null;
    let bestVertical:
      | { delta: number; guide: number; type: string }
      | null = null;

    snapTargets.forEach((target) => {
      if (target.key === element || target.width <= 0 || target.height <= 0) return;
      const targetHorizontal = [
        { type: "center", value: target.x + target.width / 2 },
      ];
      const targetVertical = [
        { type: "center", value: target.y + target.height / 2 },
      ];

      horizontalCandidates.forEach((candidate) => {
        targetHorizontal.forEach((targetPoint) => {
          const delta = targetPoint.value - candidate.value;
          if (Math.abs(delta) > threshold) return;
          if (!bestHorizontal || Math.abs(delta) < Math.abs(bestHorizontal.delta)) {
            bestHorizontal = { delta, guide: targetPoint.value, type: candidate.type };
          }
        });
      });

      verticalCandidates.forEach((candidate) => {
        targetVertical.forEach((targetPoint) => {
          const delta = targetPoint.value - candidate.value;
          if (Math.abs(delta) > threshold) return;
          if (!bestVertical || Math.abs(delta) < Math.abs(bestVertical.delta)) {
            bestVertical = { delta, guide: targetPoint.value, type: candidate.type };
          }
        });
      });
    });

    if (bestHorizontal) {
      if (mode === "move") {
        nextRect.x += bestHorizontal.delta;
      } else if (bestHorizontal.type === "left") {
        nextRect.x += bestHorizontal.delta;
        nextRect.width -= bestHorizontal.delta;
      } else if (bestHorizontal.type === "right") {
        nextRect.width += bestHorizontal.delta;
      }
      verticalGuide = bestHorizontal.guide;
    }

    if (bestVertical) {
      if (mode === "move") {
        nextRect.y += bestVertical.delta;
      } else if (bestVertical.type === "top") {
        nextRect.y += bestVertical.delta;
        nextRect.height -= bestVertical.delta;
      } else if (bestVertical.type === "bottom") {
        nextRect.height += bestVertical.delta;
      }
      horizontalGuide = bestVertical.guide;
    }

    setSmartGuides({ vertical: verticalGuide, horizontal: horizontalGuide });
    return nextRect;
  };

  const startInteraction = (
    mode:
      | "move"
      | "resize-right"
      | "resize-left"
      | "resize-top"
      | "resize-bottom"
      | "resize-top-left"
      | "resize-top-right"
      | "resize-bottom-left"
      | "resize-bottom-right",
    clientX: number,
    clientY: number,
  ) => {
    const node = wrapperRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      mode,
      startX: clientX,
      startY: clientY,
      baseX: resolvedConfig.x,
      baseY: resolvedConfig.y,
      baseWidth:
        resolvedConfig.width > 0 ? resolvedConfig.width : rect.width / stageScale,
      baseHeight:
        resolvedConfig.height > 0 ? resolvedConfig.height : rect.height / stageScale,
    };
    postEditorMessage({ kind: "begin-element-edit", element });
  };

  useEffect(() => {
    if (!editorMode || !selected) return;

    const handlePointerMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const nextPatch: Partial<BattleElementPropertyConfig> = {};

      if (session.mode === "move") {
        const baseRect = getBattleEditorFrame(
          {
            ...resolvedConfig,
            x: session.baseX,
            y: session.baseY,
            width: session.baseWidth,
            height: session.baseHeight,
          },
          resolvedBaseX,
          resolvedBaseY,
        );
        const snappedRect = applySmartSnapping(
          snapRectCenterToGrid({
            x: baseRect.sceneX + dx / stageScale,
            y: baseRect.sceneY + dy / stageScale,
            width: session.baseWidth,
            height: session.baseHeight,
          }),
          session.mode,
        );
        const nextPosition = battleGlobalFrameToScenePosition(
          {
            x: snappedRect.x,
            y: snappedRect.y,
            width: snappedRect.width,
            height: snappedRect.height,
          },
          resolvedConfig.anchor,
        );
        nextPatch.x = nextPosition.x;
        nextPatch.y = nextPosition.y;
      } else {
        const baseFrame = getBattleEditorFrame(
          {
            ...resolvedConfig,
            x: session.baseX,
            y: session.baseY,
            width: session.baseWidth,
            height: session.baseHeight,
          },
          resolvedBaseX,
          resolvedBaseY,
        );
        let workingRect = {
          x: baseFrame.sceneX,
          y: baseFrame.sceneY,
          width: session.baseWidth,
          height: session.baseHeight,
        };
        if (
          session.mode === "resize-right" ||
          session.mode === "resize-top-right" ||
          session.mode === "resize-bottom-right"
        ) {
          workingRect.width = Math.max(
            48,
            snapValue(session.baseWidth + dx / stageScale),
          );
        }
        if (
          session.mode === "resize-left" ||
          session.mode === "resize-top-left" ||
          session.mode === "resize-bottom-left"
        ) {
          const nextWidth = Math.max(
            48,
            snapValue(session.baseWidth - dx / stageScale),
          );
          workingRect.width = nextWidth;
          workingRect.x = snapValue(
            workingRect.x + (session.baseWidth - nextWidth),
          );
        }
        if (
          session.mode === "resize-bottom" ||
          session.mode === "resize-bottom-left" ||
          session.mode === "resize-bottom-right"
        ) {
          workingRect.height = Math.max(
            48,
            snapValue(session.baseHeight + dy / stageScale),
          );
        }
        if (
          session.mode === "resize-top" ||
          session.mode === "resize-top-left" ||
          session.mode === "resize-top-right"
        ) {
          const nextHeight = Math.max(
            48,
            snapValue(session.baseHeight - dy / stageScale),
          );
          workingRect.height = nextHeight;
          workingRect.y = snapValue(
            workingRect.y + (session.baseHeight - nextHeight),
          );
        }
        if (resolvedConfig.lockAspectRatio) {
          const ratio =
            session.baseWidth > 0 && session.baseHeight > 0
              ? session.baseWidth / session.baseHeight
              : 1;
          if (workingRect.width !== session.baseWidth && workingRect.height === session.baseHeight) {
            workingRect.height = Math.max(48, snapValue(workingRect.width / ratio));
          }
          if (workingRect.height !== session.baseHeight && workingRect.width === session.baseWidth) {
            workingRect.width = Math.max(48, snapValue(workingRect.height * ratio));
          }
        }

        const snappedRect = applySmartSnapping(
          {
            x: workingRect.x,
            y: workingRect.y,
            width: workingRect.width,
            height: workingRect.height,
          },
          session.mode,
        );
        const nextPosition = battleGlobalFrameToScenePosition(
          {
            x: snappedRect.x,
            y: snappedRect.y,
            width: snappedRect.width,
            height: snappedRect.height,
          },
          resolvedConfig.anchor,
        );
        nextPatch.width = snappedRect.width;
        nextPatch.height = snappedRect.height;
        nextPatch.x = nextPosition.x;
        nextPatch.y = nextPosition.y;
      }

      setLiveConfig((current) => ({ ...current, ...nextPatch }));
      postEditorMessage({ kind: "update-element-edit", element, patch: nextPatch });
    };

    const handlePointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setSmartGuides({ vertical: null, horizontal: null });
      postEditorMessage({ kind: "end-element-edit", element });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    editorMode,
    element,
    gridSize,
    resolvedBaseX,
    resolvedBaseY,
    resolvedConfig.lockAspectRatio,
    resolvedConfig.snapToGrid,
    selected,
    snapThreshold,
    stageScale,
  ]);

  if (passthrough) {
    return (
      <div
        key={replayKey}
        ref={wrapperRef}
        className={className}
        data-battle-element-key={element}
        onPointerDown={(event) => {
          if (!editorMode || !previewSelectable) return;
          selectElementFromPointer(event);
        }}
        style={{
          zIndex: zIndexOverride,
          position: resolvedPositionStyle,
        }}
      >
        {children}
        {editorMode && selected ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber-300/85 shadow-[0_0_0_1px_rgba(120,53,15,0.35)]" />
        ) : null}
      </div>
    );
  }

  if (!previewAnimations) {
    return (
      <div
        key={replayKey}
        ref={wrapperRef}
        className={className}
        data-battle-element-key={element}
        data-battle-frame-scene-x={savedFrame.sceneX}
        data-battle-frame-scene-y={savedFrame.sceneY}
        data-battle-frame-width={savedFrame.width}
        data-battle-frame-height={savedFrame.height}
        data-battle-loaded-frame-scene-x={resolvedFrame.sceneX}
        data-battle-loaded-frame-scene-y={resolvedFrame.sceneY}
        data-battle-loaded-frame-width={resolvedFrame.width}
        data-battle-loaded-frame-height={resolvedFrame.height}
        style={{
          ...sharedStyle,
          position: resolvedPositionStyle,
          transform: `translate(${resolvedFrame.x}px, ${resolvedFrame.y}px) rotate(${resolvedConfig.rotation}deg) scale(${resolvedConfig.scaleX / 100}, ${resolvedConfig.scaleY / 100})`,
        }}
        onPointerDown={(event) => {
          if (!editorMode || !previewSelectable) return;
          selectElementFromPointer(event);
        }}
      >
        {children}
        {editorMode && selected ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber-300/85 shadow-[0_0_0_1px_rgba(120,53,15,0.35)]" />
        ) : null}
        {editorMode && selected && smartGuides.vertical !== null ? (
          <div
            className="pointer-events-none absolute top-[-1600px] bottom-[-1600px] w-px bg-cyan-300/80"
            style={{ left: `${smartGuides.vertical - resolvedFrame.sceneX + resolvedFrame.x}px` }}
          />
        ) : null}
        {editorMode && selected && smartGuides.horizontal !== null ? (
          <div
            className="pointer-events-none absolute left-[-1600px] right-[-1600px] h-px bg-cyan-300/80"
            style={{ top: `${smartGuides.horizontal - resolvedFrame.sceneY + resolvedFrame.y}px` }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <motion.div
      key={replayKey}
      ref={wrapperRef}
      className={className}
      data-battle-element-key={element}
      data-battle-frame-scene-x={savedFrame.sceneX}
      data-battle-frame-scene-y={savedFrame.sceneY}
      data-battle-frame-width={savedFrame.width}
      data-battle-frame-height={savedFrame.height}
      data-battle-loaded-frame-scene-x={resolvedFrame.sceneX}
      data-battle-loaded-frame-scene-y={resolvedFrame.sceneY}
      data-battle-loaded-frame-width={resolvedFrame.width}
      data-battle-loaded-frame-height={resolvedFrame.height}
      style={sharedStyle}
      initial={{
        x: resolvedFrame.x + resolvedConfig.slideX,
        y: resolvedFrame.y + resolvedConfig.slideY,
        rotate: resolvedConfig.rotation,
        scaleX: resolvedConfig.scaleX / 100,
        scaleY: resolvedConfig.scaleY / 100,
        opacity: Math.max(0, resolvedConfig.opacity / 100),
      }}
      animate={{
        x: resolvedFrame.x,
        y: resolvedFrame.y,
        rotate: resolvedConfig.rotation,
        scaleX: resolvedConfig.scaleX / 100,
        scaleY: resolvedConfig.scaleY / 100,
        opacity: resolvedConfig.opacity / 100,
      }}
      transition={{
        duration: resolvedConfig.duration,
        delay: resolvedConfig.delay,
        ease: easingMap[resolvedConfig.easing],
      }}
      onPointerDown={(event) => {
        if (!editorMode || !previewSelectable) return;
        selectElementFromPointer(event);
      }}
    >
      {children}
      {editorMode && selected ? (
        <>
          <button
            type="button"
            aria-label={`Mover ${element}`}
            className="absolute inset-0 z-[200] cursor-move rounded-2xl border-2 border-amber-300/85 shadow-[0_0_0_1px_rgba(120,53,15,0.35)]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (event.ctrlKey || event.metaKey || event.shiftKey) {
                selectElementFromPointer(event);
                return;
              }
              startInteraction("move", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar largura ${element}`}
            className="absolute -right-2 top-1/2 z-[210] h-5 w-5 -translate-y-1/2 rounded-full border-2 border-amber-950 bg-amber-300"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-right", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar esquerda ${element}`}
            className="absolute -left-2 top-1/2 z-[210] h-5 w-5 -translate-y-1/2 rounded-full border-2 border-amber-950 bg-amber-300"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-left", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar altura ${element}`}
            className="absolute -bottom-2 left-1/2 z-[210] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-amber-950 bg-amber-300"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-bottom", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar topo ${element}`}
            className="absolute -top-2 left-1/2 z-[210] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-amber-950 bg-amber-300"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-top", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar base direita ${element}`}
            className="absolute -bottom-2 -right-2 z-[210] h-5 w-5 rounded-full border-2 border-amber-950 bg-amber-400 shadow-md"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-bottom-right", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar base esquerda ${element}`}
            className="absolute -bottom-2 -left-2 z-[210] h-5 w-5 rounded-full border-2 border-amber-950 bg-amber-400 shadow-md"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-bottom-left", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar topo direita ${element}`}
            className="absolute -top-2 -right-2 z-[210] h-5 w-5 rounded-full border-2 border-amber-950 bg-amber-400 shadow-md"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-top-right", event.clientX, event.clientY);
            }}
          />
          <button
            type="button"
            aria-label={`Redimensionar topo esquerda ${element}`}
            className="absolute -top-2 -left-2 z-[210] h-5 w-5 rounded-full border-2 border-amber-950 bg-amber-400 shadow-md"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startInteraction("resize-top-left", event.clientX, event.clientY);
            }}
          />
          {resolvedConfig.snapToGrid ? (
            <>
              <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-300/40" />
              <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-amber-300/40" />
            </>
          ) : null}
          {smartGuides.vertical !== null ? (
            <div
              className="pointer-events-none absolute top-[-1600px] bottom-[-1600px] w-px bg-cyan-300/80"
              style={{ left: `${smartGuides.vertical - resolvedFrame.sceneX + resolvedFrame.x}px` }}
            />
          ) : null}
          {smartGuides.horizontal !== null ? (
            <div
              className="pointer-events-none absolute left-[-1600px] right-[-1600px] h-px bg-cyan-300/80"
              style={{ top: `${smartGuides.horizontal - resolvedFrame.sceneY + resolvedFrame.y}px` }}
            />
          ) : null}
        </>
      ) : null}
    </motion.div>
  );
};
