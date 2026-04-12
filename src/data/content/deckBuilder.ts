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

export interface DeckBuilderValidationRules {
  minTargets: number;
  minSyllables: number;
}

export type DeckBuilderValidationStatus = "empty" | "incomplete" | "ready";

export interface DeckBuilderValidationIssue {
  id: "empty" | "min-targets" | "min-syllables";
  title: string;
  detail: string;
}

export interface DeckBuilderValidationView {
  status: DeckBuilderValidationStatus;
  label: string;
  detail: string;
  issues: DeckBuilderValidationIssue[];
}

export interface DeckBuilderCompositionView {
  minTargets: number;
  minSyllables: number;
  totalTargets: number;
  uniqueTargets: number;
  totalSyllables: number;
  uniqueSyllables: number;
  repeatedCopies: number;
  targetProgress: number;
  syllableProgress: number;
  overallProgress: number;
  label: string;
  detail: string;
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

const formatDuplicatedDeckName = (name: string) => {
  const normalizedName = name.trim() || DEFAULT_DECK_NAME;
  return normalizedName.toLowerCase().includes("copia") ? normalizedName : `${normalizedName} copia`;
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

export function createDuplicatedDeckBuilderDraftFromDeckModel(
  deckModel: DeckModel,
  existingDeckIds: Iterable<string>,
): DeckBuilderDraft {
  const duplicatedName = formatDuplicatedDeckName(deckModel.definition.name);
  const id = createUniqueDeckBuilderId(existingDeckIds, duplicatedName);

  return {
    id,
    name: duplicatedName,
    description: deckModel.definition.description,
    emoji: deckModel.definition.emoji,
    superclass: deckModel.definition.superclass,
    visualTheme: deckModel.definition.visualTheme,
    targetIds: [...deckModel.definition.targetIds],
    cardPool: cloneCardPool(deckModel.definition.cardPool),
  };
}

export function renameDeckBuilderDraft(draft: DeckBuilderDraft, name: string): DeckBuilderDraft {
  return {
    ...draft,
    name: name.trim() || draft.name,
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

export function validateDeckBuilderDefinition(
  definition: Pick<DeckDefinition, "targetIds" | "cardPool">,
  rules: DeckBuilderValidationRules,
): DeckBuilderValidationView {
  const totalTargets = definition.targetIds.length;
  const totalSyllables = Object.values(definition.cardPool).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const issues: DeckBuilderValidationIssue[] = [];

  if (totalTargets === 0 && totalSyllables === 0) {
    return {
      status: "empty",
      label: "Vazio",
      detail: "Adicione alvos ou silabas para iniciar o deck.",
      issues: [
        {
          id: "empty",
          title: "Deck vazio",
          detail: "O deck ainda nao tem alvos nem silabas.",
        },
      ],
    };
  }

  if (totalTargets < rules.minTargets) {
    issues.push({
      id: "min-targets",
      title: "Poucos alvos",
      detail: `Precisa de ${rules.minTargets} alvos para preencher o campo inicial.`,
    });
  }

  if (totalSyllables < rules.minSyllables) {
    issues.push({
      id: "min-syllables",
      title: "Poucas silabas",
      detail: `Precisa de ${rules.minSyllables} silabas para a mao inicial.`,
    });
  }

  if (issues.length > 0) {
    return {
      status: "incomplete",
      label: "Incompleto",
      detail: issues.map((issue) => issue.title).join(" · "),
      issues,
    };
  }

  return {
    status: "ready",
    label: "Valido",
    detail: "Estrutura minima pronta para o jogo atual.",
    issues: [],
  };
}

export function createDeckBuilderCompositionView(
  definition: Pick<DeckDefinition, "targetIds" | "cardPool">,
  rules: DeckBuilderValidationRules,
): DeckBuilderCompositionView {
  const totalTargets = definition.targetIds.length;
  const uniqueTargets = new Set(definition.targetIds).size;
  const totalSyllables = Object.values(definition.cardPool).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const uniqueSyllables = Object.values(definition.cardPool).filter((count) => Math.max(0, Number(count) || 0) > 0).length;
  const repeatedCopies = Math.max(0, totalTargets - uniqueTargets) + Math.max(0, totalSyllables - uniqueSyllables);
  const targetProgress = rules.minTargets > 0 ? Math.min(1, totalTargets / rules.minTargets) : 1;
  const syllableProgress = rules.minSyllables > 0 ? Math.min(1, totalSyllables / rules.minSyllables) : 1;
  const overallProgress = Math.min(targetProgress, syllableProgress);
  const missingTargets = Math.max(0, rules.minTargets - totalTargets);
  const missingSyllables = Math.max(0, rules.minSyllables - totalSyllables);

  if (totalTargets === 0 && totalSyllables === 0) {
    return {
      minTargets: rules.minTargets,
      minSyllables: rules.minSyllables,
      totalTargets,
      uniqueTargets,
      totalSyllables,
      uniqueSyllables,
      repeatedCopies,
      targetProgress,
      syllableProgress,
      overallProgress,
      label: "Sem composicao",
      detail: "Adicione alvos e silabas para formar a base do deck.",
    };
  }

  if (missingTargets > 0 || missingSyllables > 0) {
    const missingParts = [
      missingTargets > 0 ? `${missingTargets} alvo${missingTargets !== 1 ? "s" : ""}` : "",
      missingSyllables > 0 ? `${missingSyllables} silaba${missingSyllables !== 1 ? "s" : ""}` : "",
    ].filter(Boolean);

    return {
      minTargets: rules.minTargets,
      minSyllables: rules.minSyllables,
      totalTargets,
      uniqueTargets,
      totalSyllables,
      uniqueSyllables,
      repeatedCopies,
      targetProgress,
      syllableProgress,
      overallProgress,
      label: "Abaixo do minimo",
      detail: `Falta ${missingParts.join(" e ")} para a base estrutural.`,
    };
  }

  const extraTargets = Math.max(0, totalTargets - rules.minTargets);
  const extraSyllables = Math.max(0, totalSyllables - rules.minSyllables);
  const hasExtraStructure = extraTargets > 0 || extraSyllables > 0;

  return {
    minTargets: rules.minTargets,
    minSyllables: rules.minSyllables,
    totalTargets,
    uniqueTargets,
    totalSyllables,
    uniqueSyllables,
    repeatedCopies,
    targetProgress,
    syllableProgress,
    overallProgress,
    label: hasExtraStructure ? "Acima do minimo" : "Minimo atendido",
    detail: hasExtraStructure
      ? "Estrutura acima do minimo atual; balanceamento fica para regras futuras."
      : "Estrutura minima atendida para o jogo atual.",
  };
}
