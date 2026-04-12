import type {
  CardDefinition,
  DeckDefinition,
  DeckModel,
  DeckVisualThemeId,
  NormalizedContentCatalog,
  TargetDefinition,
} from "./types";

export interface DeckBuilderDraft {
  id: string;
  sourceDeckId?: string;
  name: string;
  description: string;
  emoji: string;
  superclass: string;
  visualTheme: DeckVisualThemeId;
  targetIds: string[];
  cardPool: Record<string, number>;
}

const DEFAULT_DECK_NAME = "Novo Deck";
const DEFAULT_DECK_DESCRIPTION = "Deck local em montagem.";
const DEFAULT_DECK_EMOJI = "🃏";
const DEFAULT_SUPERCLASS = "animal";
const DEFAULT_VISUAL_THEME: DeckVisualThemeId = "harvest";

const normalizeDeckBuilderId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createUniqueDeckBuilderId = (existingIds: Iterable<string>, preferredName = DEFAULT_DECK_NAME) => {
  const base = normalizeDeckBuilderId(preferredName) || "novo-deck";
  const ids = new Set(existingIds);

  if (!ids.has(base)) return base;

  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
};

const cloneCardPool = (cardPool: Record<string, number>) =>
  Object.entries(cardPool).reduce<Record<string, number>>((acc, [cardId, count]) => {
    const copies = Math.max(0, Math.trunc(Number(count) || 0));
    if (copies > 0) {
      acc[cardId] = copies;
    }
    return acc;
  }, {});

const changeCardCopies = (
  cardPool: Record<string, number>,
  cardIds: readonly string[],
  delta: number,
) => {
  const next = cloneCardPool(cardPool);

  cardIds.forEach((cardId) => {
    const copies = Math.max(0, (next[cardId] ?? 0) + delta);
    if (copies > 0) {
      next[cardId] = copies;
    } else {
      delete next[cardId];
    }
  });

  return next;
};

export function createDeckBuilderDraftFromDeckModel(deckModel: DeckModel): DeckBuilderDraft {
  const { definition } = deckModel;

  return {
    id: definition.id,
    sourceDeckId: definition.id,
    name: definition.name,
    description: definition.description,
    emoji: definition.emoji,
    superclass: definition.superclass,
    visualTheme: definition.visualTheme,
    targetIds: [...definition.targetIds],
    cardPool: cloneCardPool(definition.cardPool),
  };
}

export function createEmptyDeckBuilderDraft(
  catalog: NormalizedContentCatalog,
  existingDeckIds: Iterable<string>,
): DeckBuilderDraft {
  const id = createUniqueDeckBuilderId(existingDeckIds, DEFAULT_DECK_NAME);

  return {
    id,
    name: DEFAULT_DECK_NAME,
    description: DEFAULT_DECK_DESCRIPTION,
    emoji: DEFAULT_DECK_EMOJI,
    superclass: catalog.decks[0]?.superclass ?? DEFAULT_SUPERCLASS,
    visualTheme: catalog.decks[0]?.visualTheme ?? DEFAULT_VISUAL_THEME,
    targetIds: [],
    cardPool: {},
  };
}

export function createDeckDefinitionFromBuilderDraft(
  draft: DeckBuilderDraft,
  catalog: NormalizedContentCatalog,
): DeckDefinition {
  const cardPool = Object.entries(cloneCardPool(draft.cardPool)).reduce<Record<string, number>>(
    (acc, [cardId, count]) => {
      if (catalog.cardsById[cardId]) {
        acc[cardId] = count;
      }
      return acc;
    },
    {},
  );
  const targetIds = draft.targetIds.filter((targetId) => Boolean(catalog.targetsById[targetId]));

  return {
    id: draft.id,
    name: draft.name.trim() || DEFAULT_DECK_NAME,
    description: draft.description.trim() || DEFAULT_DECK_DESCRIPTION,
    emoji: draft.emoji.trim() || DEFAULT_DECK_EMOJI,
    superclass: draft.superclass.trim() || DEFAULT_SUPERCLASS,
    visualTheme: draft.visualTheme,
    cardIds: Object.keys(cardPool),
    cardPool,
    targetIds,
  };
}

export function addTargetToDeckBuilderDraft(
  draft: DeckBuilderDraft,
  target: Pick<TargetDefinition, "id" | "cardIds">,
): DeckBuilderDraft {
  return {
    ...draft,
    targetIds: [...draft.targetIds, target.id],
    cardPool: changeCardCopies(draft.cardPool, target.cardIds, 1),
  };
}

export function removeTargetFromDeckBuilderDraft(
  draft: DeckBuilderDraft,
  target: Pick<TargetDefinition, "id" | "cardIds">,
): DeckBuilderDraft {
  const index = draft.targetIds.lastIndexOf(target.id);
  if (index < 0) return draft;

  const targetIds = [...draft.targetIds];
  targetIds.splice(index, 1);

  return {
    ...draft,
    targetIds,
    cardPool: changeCardCopies(draft.cardPool, target.cardIds, -1),
  };
}

export function addCardToDeckBuilderDraft(
  draft: DeckBuilderDraft,
  card: Pick<CardDefinition, "id">,
): DeckBuilderDraft {
  return {
    ...draft,
    cardPool: changeCardCopies(draft.cardPool, [card.id], 1),
  };
}

export function removeCardFromDeckBuilderDraft(
  draft: DeckBuilderDraft,
  card: Pick<CardDefinition, "id">,
): DeckBuilderDraft {
  return {
    ...draft,
    cardPool: changeCardCopies(draft.cardPool, [card.id], -1),
  };
}

export function getDeckBuilderTargetCopies(draft: DeckBuilderDraft) {
  return draft.targetIds.reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] ?? 0) + 1;
    return acc;
  }, {});
}

export function getDeckBuilderCardCopies(draft: DeckBuilderDraft) {
  return cloneCardPool(draft.cardPool);
}
