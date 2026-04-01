import { useEffect, useMemo, useState } from "react";
import {
  BattleLayoutDeviceOverrides,
  BattleLayoutDeviceKey,
  BattleLayoutOverrides,
  createBattleLayoutConfigForDevice,
  normalizeBattleLayoutDeviceOverrides,
} from "./BattleLayoutConfig";
import {
  battleActiveLayoutDeviceOverrides,
} from "./BattleLayoutPreset";
import {
  BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY,
  BATTLE_LAYOUT_MODEL_VERSION,
  BATTLE_LAYOUT_MODEL_VERSION_KEY,
} from "./BattleLayoutEditorState";

export function readActiveBattleLayoutOverrides(): BattleLayoutOverrides {
  return readActiveBattleLayoutDeviceOverrides().desktop;
}

export function readActiveBattleLayoutDeviceOverrides(): BattleLayoutDeviceOverrides {
  if (typeof window === "undefined") {
    return normalizeBattleLayoutDeviceOverrides(battleActiveLayoutDeviceOverrides);
  }

  try {
    const storedVersion = window.localStorage.getItem(BATTLE_LAYOUT_MODEL_VERSION_KEY);
    if (storedVersion !== String(BATTLE_LAYOUT_MODEL_VERSION)) {
      return normalizeBattleLayoutDeviceOverrides(battleActiveLayoutDeviceOverrides);
    }
    const raw = window.localStorage.getItem(BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY);
    if (!raw) return normalizeBattleLayoutDeviceOverrides(battleActiveLayoutDeviceOverrides);
    return normalizeBattleLayoutDeviceOverrides(
      JSON.parse(raw) as BattleLayoutDeviceOverrides | BattleLayoutOverrides,
    );
  } catch {
    return normalizeBattleLayoutDeviceOverrides(battleActiveLayoutDeviceOverrides);
  }
}

export function useActiveBattleLayoutConfig(
  device: BattleLayoutDeviceKey = "desktop",
) {
  const [layoutDeviceOverrides, setLayoutDeviceOverrides] = useState<BattleLayoutDeviceOverrides>(
    () => readActiveBattleLayoutDeviceOverrides(),
  );

  useEffect(() => {
    const sync = () => setLayoutDeviceOverrides(readActiveBattleLayoutDeviceOverrides());

    window.addEventListener("storage", sync);
    window.addEventListener(BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY, sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY,
        sync as EventListener,
      );
    };
  }, []);

  return useMemo(
    () => createBattleLayoutConfigForDevice(layoutDeviceOverrides, device),
    [layoutDeviceOverrides, device],
  );
}
