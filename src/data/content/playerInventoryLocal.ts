import type { NormalizedContentCatalog } from "./types";
import type { PlayerCollectionInventorySnapshot } from "./playerCollection";

const STORAGE_VERSION = 1;
export const PLAYER_INVENTORY_LOCAL_STORAGE_KEY = "syllable-battle.collection.player-inventory-local.v1";

export type PlayerInventoryLocalMode = "catalog-full" | "qa-partial";

export interface PlayerInventoryLocalState {
  mode: PlayerInventoryLocalMode;
}

interface PersistedPlayerInventoryLocalStateV1 {
  version: typeof STORAGE_VERSION;
  mode: PlayerInventoryLocalMode;
}

type PlayerInventoryStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const DEFAULT_PLAYER_INVENTORY_LOCAL_STATE: PlayerInventoryLocalState = {
  mode: "catalog-full",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isPlayerInventoryLocalMode = (value: unknown): value is PlayerInventoryLocalMode =>
  value === "catalog-full" || value === "qa-partial";

export function sanitizePlayerInventoryLocalState(value: unknown): PlayerInventoryLocalState {
  if (!isPlainObject(value) || value.version !== STORAGE_VERSION || !isPlayerInventoryLocalMode(value.mode)) {
    return DEFAULT_PLAYER_INVENTORY_LOCAL_STATE;
  }

  return {
    mode: value.mode,
  };
}

export function loadPlayerInventoryLocalState(
  storage: PlayerInventoryStorageLike | null | undefined,
): PlayerInventoryLocalState {
  if (!storage) return DEFAULT_PLAYER_INVENTORY_LOCAL_STATE;

  try {
    const rawValue = storage.getItem(PLAYER_INVENTORY_LOCAL_STORAGE_KEY);
    if (!rawValue) return DEFAULT_PLAYER_INVENTORY_LOCAL_STATE;
    return sanitizePlayerInventoryLocalState(JSON.parse(rawValue));
  } catch {
    return DEFAULT_PLAYER_INVENTORY_LOCAL_STATE;
  }
}

export function savePlayerInventoryLocalState(
  storage: PlayerInventoryStorageLike | null | undefined,
  state: PlayerInventoryLocalState,
) {
  if (!storage) return false;
  const sanitizedState = sanitizePlayerInventoryLocalState({
    version: STORAGE_VERSION,
    mode: state.mode,
  } satisfies PersistedPlayerInventoryLocalStateV1);

  try {
    storage.setItem(
      PLAYER_INVENTORY_LOCAL_STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        mode: sanitizedState.mode,
      } satisfies PersistedPlayerInventoryLocalStateV1),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPlayerInventoryLocalState(storage: PlayerInventoryStorageLike | null | undefined) {
  if (!storage) return false;

  try {
    storage.removeItem(PLAYER_INVENTORY_LOCAL_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getPlayerInventoryLocalModeLabel(mode: PlayerInventoryLocalMode) {
  return mode === "qa-partial" ? "QA parcial" : "Completa";
}

export function createLocalPlayerInventorySnapshot(
  catalog: NormalizedContentCatalog,
  mode: PlayerInventoryLocalMode,
): PlayerCollectionInventorySnapshot {
  if (mode === "catalog-full") {
    return {
      source: "catalog-full-access",
      sourceLabel: "Colecao local",
      detail: "Catalogo completo disponivel neste dispositivo.",
    };
  }

  const targetCopies: Record<string, number> = {};
  const cardCopies: Record<string, number> = {};

  catalog.targets.forEach((target, index) => {
    const ownedCopies = index % 3 === 0 ? 1 : index % 7 === 0 ? 2 : 0;
    targetCopies[target.id] = ownedCopies;

    if (ownedCopies <= 0) return;
    target.cardIds.forEach((cardId) => {
      cardCopies[cardId] = (cardCopies[cardId] ?? 0) + ownedCopies;
    });
  });

  catalog.cards.forEach((card, index) => {
    if (cardCopies[card.id] !== undefined) return;
    cardCopies[card.id] = index % 5 === 0 ? 1 : 0;
  });

  return {
    source: "local-snapshot",
    sourceLabel: "Colecao QA",
    detail: "Fixture local parcial para exercitar disponibilidade e copias.",
    targetCopies,
    cardCopies,
  };
}
