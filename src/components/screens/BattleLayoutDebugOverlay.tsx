import React, { useEffect, useMemo, useState } from "react";

type RectSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ParentSnapshot = {
  tag: string;
  className: string;
  dataElementKey: string | null;
  display: string;
  position: string;
  alignItems: string;
  justifyContent: string;
  padding: string;
  transform: string;
};

type DebugSample = {
  key: string;
  savedFrame: { x: number; y: number; width: number; height: number };
  loadedFrame: { x: number; y: number; width: number; height: number };
  projectedFrameRect: RectSnapshot;
  hostRect: RectSnapshot;
  rootRect: RectSnapshot;
  frameCenterDelta: { x: number; y: number };
  rootCenterDelta: { x: number; y: number };
  classification:
    | "container errado"
    | "root visual errado"
    | "transform herdado"
    | "offset herdado"
    | "alinhamento do pai"
    | "escala/conversao inconsistente"
    | "diferenca apenas visual pequena";
  parentChain: ParentSnapshot[];
};

const rectFromDomRect = (rect: DOMRect): RectSnapshot => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

const getRectCenter = (rect: RectSnapshot) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const classifySample = (
  sample: Omit<DebugSample, "classification">,
): DebugSample["classification"] => {
  const hostDx = Math.abs(sample.frameCenterDelta.x);
  const hostDy = Math.abs(sample.frameCenterDelta.y);
  const rootDx = Math.abs(sample.rootCenterDelta.x);
  const rootDy = Math.abs(sample.rootCenterDelta.y);
  const chain = sample.parentChain;

  const hasTransform = chain.some((item) => item.transform && item.transform !== "none");
  const hasPadding = chain.some((item) => item.padding !== "0px");
  const hasAlignment = chain.some(
    (item) =>
      ["center", "flex-start", "flex-end", "start", "end"].includes(item.alignItems) ||
      ["center", "flex-start", "flex-end", "start", "end", "space-between"].includes(
        item.justifyContent,
      ),
  );

  if (hostDx <= 2 && hostDy <= 2 && rootDx <= 2 && rootDy <= 2) {
    return "diferenca apenas visual pequena";
  }
  if (rootDy > 6 || rootDx > 6) return "root visual errado";
  if ((hostDx > 6 || hostDy > 6) && hasTransform) return "transform herdado";
  if ((hostDx > 6 || hostDy > 6) && hasPadding) return "offset herdado";
  if ((hostDx > 6 || hostDy > 6) && hasAlignment) return "alinhamento do pai";
  if (hostDx > 6 || hostDy > 6) return "container errado";
  return "escala/conversao inconsistente";
};

export const BattleLayoutDebugOverlay: React.FC = () => {
  const [samples, setSamples] = useState<DebugSample[]>([]);
  const [targetFilter, setTargetFilter] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawTargets = params.get("battle-debug-targets") ?? params.get("battle-debug-target");
    if (!rawTargets) {
      setTargetFilter(null);
      return;
    }
    const parsed = rawTargets
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    setTargetFilter(parsed.length ? new Set(parsed) : null);
  }, []);

  useEffect(() => {
    const update = () => {
      const stage = document.querySelector<HTMLElement>("[data-battle-stage-root='true']");
      if (!stage) {
        setSamples([]);
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const stageScale = Number(stage.dataset.battleStageScale ?? "1") || 1;

      const nextSamples = Array.from(
        document.querySelectorAll<HTMLElement>("[data-battle-element-key]"),
      )
        .filter((element) => {
          const key = element.dataset.battleElementKey ?? "";
          return targetFilter ? targetFilter.has(key) : true;
        })
        .map((host) => {
          const key = host.dataset.battleElementKey ?? "unknown";
          const sceneX = Number(host.dataset.battleFrameSceneX ?? "0");
          const sceneY = Number(host.dataset.battleFrameSceneY ?? "0");
          const sceneWidth = Number(host.dataset.battleFrameWidth ?? "0");
          const sceneHeight = Number(host.dataset.battleFrameHeight ?? "0");
          const loadedSceneX = Number(host.dataset.battleLoadedFrameSceneX ?? sceneX);
          const loadedSceneY = Number(host.dataset.battleLoadedFrameSceneY ?? sceneY);
          const loadedWidth = Number(host.dataset.battleLoadedFrameWidth ?? sceneWidth);
          const loadedHeight = Number(host.dataset.battleLoadedFrameHeight ?? sceneHeight);

          const projectedFrameRect = {
            left: stageRect.left + sceneX * stageScale,
            top: stageRect.top + sceneY * stageScale,
            width: sceneWidth * stageScale,
            height: sceneHeight * stageScale,
          };

          const hostRect = rectFromDomRect(host.getBoundingClientRect());
          const visualRoot =
            key === "shell"
              ? host
              : (host.querySelector<HTMLElement>("[data-battle-visual-root='true']") ?? host);
          const rootRect = rectFromDomRect(visualRoot.getBoundingClientRect());

          const projectedCenter = getRectCenter(projectedFrameRect);
          const hostCenter = getRectCenter(hostRect);
          const rootCenter = getRectCenter(rootRect);

          const parentChain: ParentSnapshot[] = [];
          let current: HTMLElement | null = host.parentElement;
          while (current) {
            const style = window.getComputedStyle(current);
            parentChain.push({
              tag: current.tagName.toLowerCase(),
              className: current.className || "",
              dataElementKey: current.dataset.battleElementKey ?? null,
              display: style.display,
              position: style.position,
              alignItems: style.alignItems,
              justifyContent: style.justifyContent,
              padding: style.padding,
              transform: style.transform,
            });
            if (current.dataset.battleStageRoot === "true") break;
            current = current.parentElement;
          }

          const partialSample = {
            key,
            savedFrame: { x: sceneX, y: sceneY, width: sceneWidth, height: sceneHeight },
            loadedFrame: {
              x: loadedSceneX,
              y: loadedSceneY,
              width: loadedWidth,
              height: loadedHeight,
            },
            projectedFrameRect,
            hostRect,
            rootRect,
            frameCenterDelta: {
              x: Number((hostCenter.x - projectedCenter.x).toFixed(2)),
              y: Number((hostCenter.y - projectedCenter.y).toFixed(2)),
            },
            rootCenterDelta: {
              x: Number((rootCenter.x - projectedCenter.x).toFixed(2)),
              y: Number((rootCenter.y - projectedCenter.y).toFixed(2)),
            },
            parentChain,
          };

          return {
            ...partialSample,
            classification: classifySample(partialSample),
          } satisfies DebugSample;
        })
        .sort((a, b) => a.key.localeCompare(b.key));

      setSamples(nextSamples);
      (window as Window & { __battleLayoutDebugSamples?: DebugSample[] }).__battleLayoutDebugSamples =
        nextSamples;
    };

    update();
    const interval = window.setInterval(update, 250);
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
    };
  }, [targetFilter]);

  const panelRows = useMemo(() => samples, [samples]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[500]">
      {samples.map((sample) => {
        const frameCenter = getRectCenter(sample.projectedFrameRect);
        const rootCenter = getRectCenter(sample.rootRect);
        return (
          <React.Fragment key={sample.key}>
            <div
              className="absolute border border-cyan-300/90"
              style={{
                left: sample.projectedFrameRect.left,
                top: sample.projectedFrameRect.top,
                width: sample.projectedFrameRect.width,
                height: sample.projectedFrameRect.height,
              }}
            />
            <div
              className="absolute border border-fuchsia-400/90"
              style={{
                left: sample.rootRect.left,
                top: sample.rootRect.top,
                width: sample.rootRect.width,
                height: sample.rootRect.height,
              }}
            />
            <div
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300"
              style={{ left: frameCenter.x, top: frameCenter.y }}
            />
            <div
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400"
              style={{ left: rootCenter.x, top: rootCenter.y }}
            />
          </React.Fragment>
        );
      })}

      <div className="pointer-events-auto absolute right-3 top-3 max-h-[80vh] w-[420px] overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-black/80 p-3 text-xs text-white shadow-2xl">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">
          Battle Layout Debug
        </div>
        <div className="mb-3 text-[11px] text-white/60">
          {targetFilter ? `Filtro: ${Array.from(targetFilter).join(", ")}` : "Todos os elementos"}
        </div>
        <div className="space-y-3">
          {panelRows.map((sample) => (
            <div key={sample.key} className="rounded-lg border border-white/10 p-2">
              <div className="font-semibold text-amber-200">{sample.key}</div>
              <div className="mt-1 text-[11px] text-white/75">{sample.classification}</div>
              <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                <div>
                  saved: {sample.savedFrame.x},{sample.savedFrame.y} {sample.savedFrame.width}x
                  {sample.savedFrame.height}
                </div>
                <div>
                  loaded: {sample.loadedFrame.x},{sample.loadedFrame.y} {sample.loadedFrame.width}x
                  {sample.loadedFrame.height}
                </div>
                <div>
                  host: {sample.hostRect.left.toFixed(1)},{sample.hostRect.top.toFixed(1)}{" "}
                  {sample.hostRect.width.toFixed(1)}x{sample.hostRect.height.toFixed(1)}
                </div>
                <div>
                  root: {sample.rootRect.left.toFixed(1)},{sample.rootRect.top.toFixed(1)}{" "}
                  {sample.rootRect.width.toFixed(1)}x{sample.rootRect.height.toFixed(1)}
                </div>
                <div>
                  frameΔ: {sample.frameCenterDelta.x}, {sample.frameCenterDelta.y}
                </div>
                <div>
                  rootΔ: {sample.rootCenterDelta.x}, {sample.rootCenterDelta.y}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
