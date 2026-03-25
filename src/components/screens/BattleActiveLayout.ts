import { useEffect, useMemo, useState } from "react";
import {
  BattleLayoutOverrides,
  createBattleLayoutConfig,
  pruneBattleLayoutOverrides,
} from "./BattleLayoutConfig";
import { battleActiveLayoutOverrides } from "./BattleLayoutPreset";
import {
  BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY,
  BATTLE_LAYOUT_MODEL_VERSION,
  BATTLE_LAYOUT_MODEL_VERSION_KEY,
} from "./BattleLayoutEditorState";

export function readActiveBattleLayoutOverrides(): BattleLayoutOverrides {
  if (typeof window === "undefined") {
    return pruneBattleLayoutOverrides(battleActiveLayoutOverrides);
  }

  try {
    const storedVersion = window.localStorage.getItem(BATTLE_LAYOUT_MODEL_VERSION_KEY);
    if (storedVersion !== String(BATTLE_LAYOUT_MODEL_VERSION)) {
      return pruneBattleLayoutOverrides(battleActiveLayoutOverrides);
    }
    const raw = window.localStorage.getItem(BATTLE_LAYOUT_ACTIVE_OVERRIDES_KEY);
    if (!raw) return pruneBattleLayoutOverrides(battleActiveLayoutOverrides);
    return pruneBattleLayoutOverrides(
      JSON.parse(raw) as BattleLayoutOverrides,
    );
  } catch {
    return pruneBattleLayoutOverrides(battleActiveLayoutOverrides);
  }
}

export function useActiveBattleLayoutConfig() {
  const [layoutOverrides, setLayoutOverrides] = useState<BattleLayoutOverrides>(
    () => readActiveBattleLayoutOverrides(),
  );

  useEffect(() => {
    const sync = () => setLayoutOverrides(readActiveBattleLayoutOverrides());

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
    () => createBattleLayoutConfig(layoutOverrides),
    [layoutOverrides],
  );
}
