import { DECK_VISUAL_THEME_CLASSES } from "./themes";
import type { DeckDefinition, DeckVisualThemeId, NormalizedContentCatalog } from "./types";

const STORAGE_VERSION = 1;
export const DECK_BUILDER_STORAGE_KEY = "syllable-battle.collection.deck-builder.v1";

export interface DeckBuilderLocalState {
  decks: DeckDefinition[];
  selectedDeckId?: string;
}

interface PersistedDeckBuilderStateV1 {
  version: typeof STORAGE_VERSION;
  selectedDeckId?: string;
  decks: unknown[];
}

type DeckBuilderStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);

const isDeckVisualThemeId = (value: unknown): value is DeckVisualThemeId =>
  typeof value === "string" && value in DECK_VISUAL_THEME_CLASSES;

const sanitizeCardPool = (
  value: unknown,
  catalog: NormalizedContentCatalog,
): Record<string, number> => {
  if (!isPlainObject(value)) return {};

  return Object.entries(value).reduce<Record<string, number>>((acc, [cardId, rawCount]) => {
    if (!catalog.cardsById[cardId]) return acc;
    const count = Number(rawCount);
    if (!Number.isFinite(count)) return acc;
    const copies = Math.max(0, Math.trunc(count));
    if (copies > 0) {
      acc[cardId] = copies;
    }
    return acc;
  }, {});
};

const sanitizeTargetIds = (value: unknown, catalog: NormalizedContentCatalog) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((targetId) => (typeof targetId === "string" ? targetId.trim() : ""))
    .filter((targetId) => Boolean(targetId && catalog.targetsById[targetId]));
};

export function sanitizeDeckBuilderDefinition(
  value: unknown,
  catalog: NormalizedContentCatalog,
): DeckDefinition | null {
  if (!isPlainObject(value)) return null;

  const id = readText(value.id).toLowerCase();
  if (!id) return null;

  const cardPool = sanitizeCardPool(value.cardPool, catalog);
  const targetIds = sanitizeTargetIds(value.targetIds, catalog);
  const fallbackDeck = catalog.decks[0];

  return {
    id,
    name: readText(value.name, "Deck Local") || "Deck Local",
    description: readText(value.description, "Deck salvo neste dispositivo.") || "Deck salvo neste dispositivo.",
    emoji: readText(value.emoji, "🃏") || "🃏",
    superclass: readText(value.superclass, fallbackDeck?.superclass ?? "animal") || (fallbackDeck?.superclass ?? "animal"),
    visualTheme: isDeckVisualThemeId(value.visualTheme)
      ? value.visualTheme
      : fallbackDeck?.visualTheme ?? "harvest",
    cardIds: Object.keys(cardPool),
    cardPool,
    targetIds,
  };
}

export function sanitizeDeckBuilderLocalState(
  value: unknown,
  catalog: NormalizedContentCatalog,
): DeckBuilderLocalState {
  if (!isPlainObject(value) || value.version !== STORAGE_VERSION || !Array.isArray(value.decks)) {
    return { decks: [] };
  }

  const decksById = new Map<string, DeckDefinition>();
  value.decks.forEach((deckValue) => {
    const deck = sanitizeDeckBuilderDefinition(deckValue, catalog);
    if (deck) {
      decksById.set(deck.id, deck);
    }
  });

  const selectedDeckId = readText(value.selectedDeckId) || undefined;

  return {
    decks: [...decksById.values()],
    selectedDeckId,
  };
}

export function loadDeckBuilderLocalState(
  storage: DeckBuilderStorageLike | null | undefined,
  catalog: NormalizedContentCatalog,
): DeckBuilderLocalState {
  if (!storage) return { decks: [] };

  try {
    const rawValue = storage.getItem(DECK_BUILDER_STORAGE_KEY);
    if (!rawValue) return { decks: [] };
    return sanitizeDeckBuilderLocalState(JSON.parse(rawValue), catalog);
  } catch {
    return { decks: [] };
  }
}

export function saveDeckBuilderLocalState(
  storage: DeckBuilderStorageLike | null | undefined,
  state: DeckBuilderLocalState,
  catalog: NormalizedContentCatalog,
) {
  if (!storage) return false;

  const sanitizedState = sanitizeDeckBuilderLocalState(
    {
      version: STORAGE_VERSION,
      decks: state.decks,
      selectedDeckId: state.selectedDeckId,
    } satisfies PersistedDeckBuilderStateV1,
    catalog,
  );

  try {
    storage.setItem(
      DECK_BUILDER_STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        decks: sanitizedState.decks,
        selectedDeckId: sanitizedState.selectedDeckId,
      } satisfies PersistedDeckBuilderStateV1),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearDeckBuilderLocalState(storage: DeckBuilderStorageLike | null | undefined) {
  if (!storage) return false;

  try {
    storage.removeItem(DECK_BUILDER_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
