import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";
import type { BattlePreviewPlaybackSelection } from "./battlePlaybackTimeline";
import {
  BattleTimelineRuntime,
  BattleTimelineSnapshot,
} from "./battlePlaybackTimeline";
import { resolveBattlePixiFrame } from "./battlePixiPlaybackBridge";
import type {
  BattlePixiHandTravelDrawable,
  BattlePixiSceneModel,
  BattlePixiTargetDrawable,
} from "./BattlePixiSceneModel";
import { createBattlePixiSceneModel } from "./BattlePixiSceneModel";
import type { BattleSceneRenderModel } from "./BattleSceneViewModel";

const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 900;

const textStyle = new TextStyle({
  fill: 0xfef3c7,
  fontFamily: "Georgia",
  fontSize: 16,
  fontWeight: "700",
  align: "center",
});

const badgeStyle = new TextStyle({
  fill: 0x0f172a,
  fontFamily: "Arial",
  fontSize: 13,
  fontWeight: "700",
  align: "center",
});

const accentByKind = {
  guide: {
    fill: 0xfbbf24,
    fillAlpha: 0.08,
    stroke: 0xfbbf24,
    strokeAlpha: 0.5,
  },
  player: {
    fill: 0x6b1d1d,
    fillAlpha: 0.86,
    stroke: 0xd4af37,
    strokeAlpha: 0.95,
  },
  enemy: {
    fill: 0x10294e,
    fillAlpha: 0.86,
    stroke: 0xd4af37,
    strokeAlpha: 0.95,
  },
  travel: {
    fill: 0xf3e6c2,
    fillAlpha: 0.96,
    stroke: 0x7c2d12,
    strokeAlpha: 0.92,
  },
} as const;

export interface BattlePixiSceneRuntimeUpdateArgs {
  renderModel: BattleSceneRenderModel;
  previewPlayback?: BattlePreviewPlaybackSelection | null;
}

export class BattlePixiSceneRuntime {
  private readonly timeline = new BattleTimelineRuntime({
    now: () => performance.now(),
  });

  private app: Application | null = null;

  private host: HTMLDivElement | null = null;

  private sceneLayer = new Container();

  private labelLayer = new Container();

  private sceneModel: BattlePixiSceneModel | null = null;

  private sceneKey: string | null = null;

  private completedMotionIds = new Set<string>();

  private destroyed = false;

  private snapshotListener: ((snapshot: BattleTimelineSnapshot) => void) | null =
    null;

  private lastSnapshotSignature: string | null = null;

  async mount(host: HTMLDivElement) {
    this.host = host;
    const app = new Application();
    await app.init({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      antialias: true,
      backgroundAlpha: 0,
      autoDensity: false,
    });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    app.stage.sortableChildren = true;
    this.sceneLayer.sortableChildren = true;
    this.labelLayer.sortableChildren = true;
    app.stage.addChild(this.sceneLayer);
    app.stage.addChild(this.labelLayer);
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    app.canvas.style.pointerEvents = "none";
    host.appendChild(app.canvas);
    app.ticker.add(this.handleTick);
  }

  update({ renderModel, previewPlayback }: BattlePixiSceneRuntimeUpdateArgs) {
    this.sceneModel = createBattlePixiSceneModel(renderModel);
    const nextSceneKey = [
      this.sceneModel.signature,
      previewPlayback?.clipId ?? "runtime",
      previewPlayback?.active ? "active" : "inactive",
    ].join(":");
    const shouldReplay = this.sceneKey !== nextSceneKey;
    this.sceneKey = nextSceneKey;
    this.timeline.configure({
      durationMs: this.sceneModel.durationMs,
      loop: previewPlayback?.loop ?? false,
    });

    if (shouldReplay) {
      this.completedMotionIds.clear();
      if (previewPlayback) {
        if (previewPlayback.active && this.sceneModel.durationMs > 0) {
          this.timeline.replay();
        } else {
          this.timeline.stop();
        }
      } else if (this.sceneModel.durationMs > 0) {
        this.timeline.replay();
      } else {
        this.timeline.stop();
      }
    }

    this.drawCurrentFrame();
  }

  play() {
    this.timeline.play();
    this.drawCurrentFrame();
  }

  pause() {
    this.timeline.pause();
    this.drawCurrentFrame();
  }

  replay() {
    this.completedMotionIds.clear();
    this.timeline.replay();
    this.drawCurrentFrame();
  }

  seek(timeMs: number) {
    this.timeline.seek(timeMs);
    this.drawCurrentFrame();
  }

  step(deltaMs: number) {
    this.timeline.step(deltaMs);
    this.drawCurrentFrame();
  }

  setLoop(loop: boolean) {
    this.timeline.setLoop(loop);
    this.drawCurrentFrame();
  }

  getSnapshot() {
    return this.timeline.getSnapshot();
  }

  setSnapshotListener(
    listener: ((snapshot: BattleTimelineSnapshot) => void) | null,
  ) {
    this.snapshotListener = listener;
    this.emitSnapshot();
  }

  destroy() {
    this.destroyed = true;
    if (this.app) {
      this.app.ticker.remove(this.handleTick);
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this.sceneLayer = new Container();
    this.labelLayer = new Container();
    this.sceneModel = null;
    this.completedMotionIds.clear();
  }

  private readonly handleTick = () => {
    this.drawCurrentFrame();
  };

  private drawCurrentFrame() {
    if (!this.app || !this.sceneModel) return;

    const snapshot = this.timeline.getSnapshot();
    const frame = resolveBattlePixiFrame(this.sceneModel, snapshot.timeMs);
    this.renderFrame(frame.drawables);
    this.fireCompletedMotions(frame.completedMotionIds);
    this.emitSnapshot(snapshot);
  }

  private renderFrame(
    drawables: ReturnType<typeof resolveBattlePixiFrame>["drawables"],
  ) {
    this.sceneLayer.removeChildren().forEach((child) => child.destroy());
    this.labelLayer.removeChildren().forEach((child) => child.destroy());

    drawables.forEach((drawable) => {
      const accent = accentByKind[drawable.accent];
      const graphics = new Graphics();
      graphics.zIndex = drawable.zIndex;
      graphics.alpha = drawable.alpha;
      graphics.position.set(drawable.x, drawable.y);
      graphics.rotation = (drawable.rotation * Math.PI) / 180;
      graphics.scale.set(drawable.scale);
      graphics.lineStyle(3, accent.stroke, accent.strokeAlpha);
      graphics.beginFill(accent.fill, accent.fillAlpha);
      graphics.drawRoundedRect(
        -drawable.width / 2,
        -drawable.height / 2,
        drawable.width,
        drawable.height,
        18,
      );
      graphics.endFill();
      this.sceneLayer.addChild(graphics);

      const label = new Text(drawable.label, textStyle);
      label.anchor.set(0.5);
      label.position.set(drawable.x, drawable.y + drawable.height * 0.2);
      label.zIndex = drawable.zIndex + 1;
      this.labelLayer.addChild(label);

      if (drawable.emoji) {
        const emoji = new Text(drawable.emoji, {
          ...textStyle,
          fontSize: 34,
        });
        emoji.anchor.set(0.5);
        emoji.position.set(drawable.x, drawable.y - drawable.height * 0.08);
        emoji.zIndex = drawable.zIndex + 1;
        this.labelLayer.addChild(emoji);
      }

      if (drawable.pendingCard) {
        const badge = new Text(drawable.pendingCard, badgeStyle);
        badge.anchor.set(0.5);
        badge.position.set(drawable.x, drawable.y + drawable.height * 0.36);
        badge.zIndex = drawable.zIndex + 2;
        this.labelLayer.addChild(badge);
      }
    });
  }

  private fireCompletedMotions(completedMotionIds: string[]) {
    if (!this.sceneModel) return;

    completedMotionIds.forEach((id) => {
      if (this.completedMotionIds.has(id)) return;
      this.completedMotionIds.add(id);
      const targetMotion = this.sceneModel?.targetDrawables.find(
        (drawable) => drawable.id === id,
      );
      if (targetMotion?.onComplete) {
        targetMotion.onComplete();
        return;
      }
      const travelMotion = this.sceneModel?.handTravelDrawables.find(
        (drawable) => drawable.id === id,
      );
      if (travelMotion?.onComplete) {
        travelMotion.onComplete(travelMotion.outgoingCard);
      }
    });
  }

  private emitSnapshot(snapshot = this.timeline.getSnapshot()) {
    if (!this.snapshotListener) return;
    const signature = [
      snapshot.phase,
      snapshot.timeMs,
      snapshot.durationMs,
      snapshot.loop ? "loop" : "once",
      snapshot.iteration,
    ].join(":");
    if (this.lastSnapshotSignature === signature) return;
    this.lastSnapshotSignature = signature;
    this.snapshotListener(snapshot);
  }
}
