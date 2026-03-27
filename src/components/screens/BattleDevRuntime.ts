import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

export interface BattleDevWatcherSample {
  id: number;
  at: number;
  reason: "init" | "change";
  snapshot: unknown;
}

interface BattleDevRuntimeRefs {
  battleDebugSamplesRef: MutableRefObject<BattleDevWatcherSample[]>;
  battleDebugSampleIdRef: MutableRefObject<number>;
  battleDebugStartedAtRef: MutableRefObject<number | null>;
  battleDebugLastSignatureRef: MutableRefObject<string>;
}

interface UseBattleDevRuntimeArgs extends BattleDevRuntimeRefs {
  enabled: boolean;
  buildBattleDevSnapshot: () => unknown;
  bumpBattleDebugWatcherVersion: () => void;
  clearAnimationFallbacks: () => void;
  damage: (side: "player" | "enemy", amount?: number) => void;
}

export const useBattleDevRuntime = ({
  enabled,
  buildBattleDevSnapshot,
  battleDebugSamplesRef,
  battleDebugSampleIdRef,
  battleDebugStartedAtRef,
  battleDebugLastSignatureRef,
  bumpBattleDebugWatcherVersion,
  clearAnimationFallbacks,
  damage,
}: UseBattleDevRuntimeArgs) => {
  const buildBattleDevSnapshotRef = useRef<() => unknown>(() => null);

  const clearBattleDebugWatcher = useCallback(() => {
    battleDebugSamplesRef.current = [];
    battleDebugSampleIdRef.current = 0;
    battleDebugStartedAtRef.current = Date.now();
    battleDebugLastSignatureRef.current = "";
    bumpBattleDebugWatcherVersion();
  }, [
    battleDebugLastSignatureRef,
    battleDebugSampleIdRef,
    battleDebugSamplesRef,
    battleDebugStartedAtRef,
    bumpBattleDebugWatcherVersion,
  ]);

  const downloadBattleDebugDump = useCallback(() => {
    if (typeof document === "undefined") return;
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const payload = {
      exportedAt: now.toISOString(),
      startedAt:
        battleDebugStartedAtRef.current != null
          ? new Date(battleDebugStartedAtRef.current).toISOString()
          : null,
      count: battleDebugSamplesRef.current.length,
      latest: buildBattleDevSnapshot(),
      samples: battleDebugSamplesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `battle-dev-dump.${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [battleDebugSamplesRef, battleDebugStartedAtRef, buildBattleDevSnapshot]);

  useEffect(() => {
    if (!enabled) return;
    buildBattleDevSnapshotRef.current = buildBattleDevSnapshot;
  }, [buildBattleDevSnapshot, enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.__battleDev = {
      snapshot: () => buildBattleDevSnapshot(),
      logSnapshot: () => console.log(window.__battleDev?.snapshot()),
      dumpDebugCapture: () => downloadBattleDebugDump(),
      clearDebugCapture: () => clearBattleDebugWatcher(),
      clearAnimationFallbacks: () => clearAnimationFallbacks(),
      damage: (side, amount = 10) => damage(side, amount),
      damagePlayer: (amount = 10) => window.__battleDev?.damage("player", amount),
      damageEnemy: (amount = 10) => window.__battleDev?.damage("enemy", amount),
      kill: (side) => window.__battleDev?.damage(side, 999),
      help: () =>
        [
          "window.__battleDev.dumpDebugCapture()",
          "window.__battleDev.clearDebugCapture()",
          "window.__battleDev.clearAnimationFallbacks()",
          "window.__battleDev.damage('player', 10)",
          "window.__battleDev.damage('enemy', 10)",
          "window.__battleDev.kill('enemy')",
        ].join("\n"),
    };

    return () => {
      delete window.__battleDev;
    };
  }, [
    buildBattleDevSnapshot,
    clearAnimationFallbacks,
    clearBattleDebugWatcher,
    damage,
    downloadBattleDebugDump,
    enabled,
  ]);

  useEffect(() => {
    if (!enabled) return;
    if (battleDebugStartedAtRef.current == null) {
      battleDebugStartedAtRef.current = Date.now();
    }

    const capture = (reason: "init" | "change") => {
      const snapshot = buildBattleDevSnapshotRef.current();
      const signature = JSON.stringify(snapshot);
      if (reason === "change" && signature === battleDebugLastSignatureRef.current) {
        return;
      }
      battleDebugLastSignatureRef.current = signature;
      battleDebugSamplesRef.current = [
        ...battleDebugSamplesRef.current,
        {
          id: battleDebugSampleIdRef.current++,
          at: Date.now(),
          reason,
          snapshot,
        },
      ].slice(-800);
      bumpBattleDebugWatcherVersion();
    };

    capture("init");
    const interval = window.setInterval(() => capture("change"), 300);
    return () => window.clearInterval(interval);
  }, [
    battleDebugLastSignatureRef,
    battleDebugSampleIdRef,
    battleDebugSamplesRef,
    battleDebugStartedAtRef,
    bumpBattleDebugWatcherVersion,
    enabled,
  ]);

  return {
    clearBattleDebugWatcher,
    downloadBattleDebugDump,
  };
};
