import type { Rarity } from "../../types/game";
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
  /** Optional: passed when using formal construction rules for ideal/max range display */
  idealTargets?: number;
  maxTargets?: number;
  idealSyllables?: number;
  maxSyllables?: number;
}

// ─── Formal construction rules ───────────────────────────────────────────────

export interface DeckBuilderFormalRules {
  targets: { min: number; ideal: number; max: number };
  syllables: { min: number; ideal: number; max: number };
  /** Max copies per target rarity in a single deck */
  maxTargetCopiesByRarity: Partial<Record<Rarity, number>> & Record<string, number>;
  /** Max total copies of a syllable family (same syllable text, multiple versions) */
  maxSyllableCopiesPerFamily: number;
  /** Max copies of a single exact card version */
  maxSyllableCopiesPerExact: number;
  /** Minimum copies required per syllable */
  minSyllableCopies: number;
  /** Minimum copies required per syllable if used by 3+ distinct target families in the deck */
  minSyllableCopiesForMultiFamily: number;
  /** Number of distinct target families that triggers the higher syllable minimum */
  multiFamilyThreshold: number;
}

export const DECK_BUILDER_CONSTRUCTION_RULES: DeckBuilderFormalRules = {
  targets: { min: 24, ideal: 32, max: 36 },
  syllables: { min: 60, ideal: 72, max: 80 },
  maxTargetCopiesByRarity: { comum: 3, raro: 2, "épico": 2, "lendário": 1 },
  maxSyllableCopiesPerFamily: 6,
  maxSyllableCopiesPerExact: 4,
  minSyllableCopies: 2,
  minSyllableCopiesForMultiFamily: 3,
  multiFamilyThreshold: 3,
};

// ─── Validation status/issues (expanded for formal rules) ────────────────────

export type DeckBuilderValidationStatus = "empty" | "incomplete" | "ready" | "valid-min" | "ideal" | "exceeded";

export interface DeckBuilderValidationIssue {
  id: "empty" | "min-targets" | "min-syllables" | "max-targets" | "max-syllables"
    | "target-copy-limit" | "syllable-family-limit" | "syllable-exact-limit"
    | "syllable-min-copies" | "syllable-multi-family-min";
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
  /** Zero when formal rules are not used */
  idealTargets: number;
  maxTargets: number;
  idealSyllables: number;
  maxSyllables: number;
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
  const idealTargets = rules.idealTargets ?? 0;
  const maxTargets = rules.maxTargets ?? 0;
  const idealSyllables = rules.idealSyllables ?? 0;
  const maxSyllables = rules.maxSyllables ?? 0;
  const hasFormalRules = idealTargets > 0 && maxTargets > 0 && idealSyllables > 0 && maxSyllables > 0;

  const base = {
    minTargets: rules.minTargets,
    minSyllables: rules.minSyllables,
    idealTargets,
    maxTargets,
    idealSyllables,
    maxSyllables,
    totalTargets,
    uniqueTargets,
    totalSyllables,
    uniqueSyllables,
    repeatedCopies,
    targetProgress,
    syllableProgress,
    overallProgress,
  };

  if (totalTargets === 0 && totalSyllables === 0) {
    return { ...base, label: "Sem composicao", detail: "Adicione alvos e silabas para formar a base do deck." };
  }

  if (missingTargets > 0 || missingSyllables > 0) {
    const missingParts = [
      missingTargets > 0 ? `${missingTargets} alvo${missingTargets !== 1 ? "s" : ""}` : "",
      missingSyllables > 0 ? `${missingSyllables} silaba${missingSyllables !== 1 ? "s" : ""}` : "",
    ].filter(Boolean);
    return { ...base, label: "Abaixo do minimo", detail: `Falta ${missingParts.join(" e ")} para a base estrutural.` };
  }

  if (hasFormalRules) {
    const targetExceeded = totalTargets > maxTargets;
    const syllableExceeded = totalSyllables > maxSyllables;
    if (targetExceeded || syllableExceeded) {
      const parts = [
        targetExceeded ? `${totalTargets - maxTargets} alvo${totalTargets - maxTargets !== 1 ? "s" : ""} acima do limite` : "",
        syllableExceeded ? `${totalSyllables - maxSyllables} silaba${totalSyllables - maxSyllables !== 1 ? "s" : ""} acima do limite` : "",
      ].filter(Boolean);
      return { ...base, label: "Acima do maximo", detail: `Retire ${parts.join(" e ")}.` };
    }

    const targetInIdeal = totalTargets >= idealTargets;
    const syllableInIdeal = totalSyllables >= idealSyllables;
    if (targetInIdeal && syllableInIdeal) {
      return { ...base, label: "Faixa ideal", detail: `${totalTargets} alvos e ${totalSyllables} silabas — composicao otima.` };
    }

    const belowIdealParts = [
      !targetInIdeal ? `${idealTargets - totalTargets} alvo${idealTargets - totalTargets !== 1 ? "s" : ""} para ideal` : "",
      !syllableInIdeal ? `${idealSyllables - totalSyllables} silaba${idealSyllables - totalSyllables !== 1 ? "s" : ""} para ideal` : "",
    ].filter(Boolean);
    return { ...base, label: "Valido · abaixo do ideal", detail: `Falta ${belowIdealParts.join(" e ")}.` };
  }

  const extraTargets = Math.max(0, totalTargets - rules.minTargets);
  const extraSyllables = Math.max(0, totalSyllables - rules.minSyllables);
  const hasExtraStructure = extraTargets > 0 || extraSyllables > 0;

  return {
    ...base,
    label: hasExtraStructure ? "Acima do minimo" : "Minimo atendido",
    detail: hasExtraStructure
      ? "Estrutura acima do minimo atual; balanceamento fica para regras futuras."
      : "Estrutura minima atendida para o jogo atual.",
  };
}

// ─── Formal validation helpers ───────────────────────────────────────────────

/** Returns the max allowed copies for a target of the given rarity. */
export function getDeckBuilderTargetCopyLimit(rarity: string, rules: DeckBuilderFormalRules): number {
  return rules.maxTargetCopiesByRarity[rarity] ?? 1;
}

/**
 * Returns true if adding one more copy of `targetId` (with `rarity`) is allowed
 * under the formal copy-limit rules.
 */
export function getDeckBuilderTargetFormalCanAdd(
  targetId: string,
  rarity: string,
  draftTargetCopies: Record<string, number>,
  rules: DeckBuilderFormalRules,
): boolean {
  const current = draftTargetCopies[targetId] ?? 0;
  return current < getDeckBuilderTargetCopyLimit(rarity, rules);
}

/**
 * Groups `cardPool` copies by syllable text (family).
 * Returns a map from syllable text → total copies in the draft.
 */
export function getDeckBuilderSyllableFamilyCopies(
  cardPool: Record<string, number>,
  catalog: Pick<NormalizedContentCatalog, "cardsById">,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [cardId, copies] of Object.entries(cardPool)) {
    const syllable = catalog.cardsById[cardId]?.syllable ?? cardId;
    result[syllable] = (result[syllable] ?? 0) + Math.max(0, copies);
  }
  return result;
}

/**
 * Returns true if adding one more copy of `cardId` is allowed under the
 * formal per-exact and per-family copy limits.
 */
export function getDeckBuilderSyllableFormalCanAdd(
  cardId: string,
  syllableText: string,
  draftCardCopies: Record<string, number>,
  syllableFamilyCopies: Record<string, number>,
  rules: DeckBuilderFormalRules,
): boolean {
  const exactCopies = draftCardCopies[cardId] ?? 0;
  const familyCopies = syllableFamilyCopies[syllableText] ?? 0;
  return exactCopies < rules.maxSyllableCopiesPerExact && familyCopies < rules.maxSyllableCopiesPerFamily;
}

// ─── Full formal deck validation (16 cases) ──────────────────────────────────

/**
 * Validates a deck definition against the formal construction rules.
 * Covers all 16 rule cases: target count, per-rarity copies, syllable count,
 * per-family/exact limits, min-copies-per-syllable, and multi-family minimum.
 */
export function validateDeckBuilderFormal(
  definition: Pick<DeckDefinition, "targetIds" | "cardPool">,
  catalog: Pick<NormalizedContentCatalog, "cardsById" | "targetsById">,
  rules: DeckBuilderFormalRules,
): DeckBuilderValidationView {
  const totalTargets = definition.targetIds.length;
  const totalSyllables = Object.values(definition.cardPool).reduce(
    (sum, count) => sum + Math.max(0, Number(count) || 0), 0,
  );

  if (totalTargets === 0 && totalSyllables === 0) {
    return {
      status: "empty",
      label: "Vazio",
      detail: "Adicione alvos e silabas para montar o deck.",
      issues: [{ id: "empty", title: "Deck vazio", detail: "Nenhum alvo ou silaba adicionado." }],
    };
  }

  const issues: DeckBuilderValidationIssue[] = [];

  // ── 1–4: Target count range ───────────────────────────────────────────────
  if (totalTargets < rules.targets.min) {
    const missing = rules.targets.min - totalTargets;
    issues.push({
      id: "min-targets",
      title: "Poucos alvos",
      detail: `Minimo ${rules.targets.min} alvos. Faltam ${missing}.`,
    });
  } else if (totalTargets > rules.targets.max) {
    issues.push({
      id: "max-targets",
      title: "Alvos acima do limite",
      detail: `Maximo ${rules.targets.max} alvos. Retire ${totalTargets - rules.targets.max}.`,
    });
  }

  // ── 5–8: Per-target rarity copy limits ────────────────────────────────────
  const targetCopies = getDeckBuilderTargetCopies({ targetIds: definition.targetIds } as DeckBuilderDraft);
  const targetsOverLimit: string[] = [];
  for (const [targetId, copies] of Object.entries(targetCopies)) {
    const targetDef = catalog.targetsById[targetId];
    if (!targetDef) continue;
    const limit = getDeckBuilderTargetCopyLimit(targetDef.rarity, rules);
    if (copies > limit) {
      targetsOverLimit.push(`${targetDef.name ?? targetId} (${copies}/${limit})`);
    }
  }
  if (targetsOverLimit.length > 0) {
    const shown = targetsOverLimit.slice(0, 3);
    const extra = targetsOverLimit.length > 3 ? ` +${targetsOverLimit.length - 3}` : "";
    issues.push({
      id: "target-copy-limit",
      title: "Limite de copias excedido",
      detail: `${shown.join(", ")}${extra}.`,
    });
  }

  // ── 9–12: Syllable count range ────────────────────────────────────────────
  if (totalSyllables < rules.syllables.min) {
    const missing = rules.syllables.min - totalSyllables;
    issues.push({
      id: "min-syllables",
      title: "Poucas silabas",
      detail: `Minimo ${rules.syllables.min} silabas. Faltam ${missing}.`,
    });
  } else if (totalSyllables > rules.syllables.max) {
    issues.push({
      id: "max-syllables",
      title: "Silabas acima do limite",
      detail: `Maximo ${rules.syllables.max} silabas. Retire ${totalSyllables - rules.syllables.max}.`,
    });
  }

  // ── 13–16: Per-syllable limits ────────────────────────────────────────────
  const familyCopies = getDeckBuilderSyllableFamilyCopies(definition.cardPool, catalog);
  const uniqueTargetIdsInDeck = new Set(definition.targetIds);

  const overFamilyLimit: string[] = [];
  const overExactLimit: string[] = [];
  const underMinCopies: string[] = [];
  const underMultiFamilyMin: string[] = [];

  for (const [cardId, copies] of Object.entries(definition.cardPool)) {
    const card = catalog.cardsById[cardId];
    if (!card || copies <= 0) continue;
    const syllable = card.syllable;

    // 13: family limit
    const family = familyCopies[syllable] ?? 0;
    if (family > rules.maxSyllableCopiesPerFamily && !overFamilyLimit.includes(syllable)) {
      overFamilyLimit.push(syllable);
    }
    // 14: exact version limit
    if (copies > rules.maxSyllableCopiesPerExact) {
      overExactLimit.push(syllable);
    }
    // 15: min copies per syllable (>= 2)
    if (copies < rules.minSyllableCopies) {
      underMinCopies.push(syllable);
    }
    // 16: multi-family minimum (used by 3+ distinct target families in deck → min 3)
    const targetFamiliesUsingCard = Object.values(catalog.targetsById).filter(
      (t) => uniqueTargetIdsInDeck.has(t.id) && t.cardIds.includes(cardId),
    ).length;
    if (
      targetFamiliesUsingCard >= rules.multiFamilyThreshold &&
      copies < rules.minSyllableCopiesForMultiFamily
    ) {
      underMultiFamilyMin.push(syllable);
    }
  }

  if (overFamilyLimit.length > 0) {
    issues.push({
      id: "syllable-family-limit",
      title: "Familia de silaba acima do limite",
      detail: `Max ${rules.maxSyllableCopiesPerFamily} por familia: ${overFamilyLimit.slice(0, 3).join(", ")}${overFamilyLimit.length > 3 ? `… +${overFamilyLimit.length - 3}` : ""}.`,
    });
  }
  if (overExactLimit.length > 0) {
    issues.push({
      id: "syllable-exact-limit",
      title: "Versao exata acima do limite",
      detail: `Max ${rules.maxSyllableCopiesPerExact} por versao: ${overExactLimit.slice(0, 3).join(", ")}${overExactLimit.length > 3 ? `… +${overExactLimit.length - 3}` : ""}.`,
    });
  }
  if (underMinCopies.length > 0) {
    issues.push({
      id: "syllable-min-copies",
      title: "Silaba com copias insuficientes",
      detail: `Min ${rules.minSyllableCopies} copia(s) por silaba: ${underMinCopies.slice(0, 3).join(", ")}${underMinCopies.length > 3 ? `… +${underMinCopies.length - 3}` : ""}.`,
    });
  }
  if (underMultiFamilyMin.length > 0) {
    issues.push({
      id: "syllable-multi-family-min",
      title: "Silaba compartilhada com poucas copias",
      detail: `Silabas usadas por ${rules.multiFamilyThreshold}+ alvos precisam de min ${rules.minSyllableCopiesForMultiFamily}: ${underMultiFamilyMin.slice(0, 3).join(", ")}${underMultiFamilyMin.length > 3 ? `… +${underMultiFamilyMin.length - 3}` : ""}.`,
    });
  }

  // ── Status derivation ─────────────────────────────────────────────────────
  const hasExceeded =
    issues.some((i) =>
      i.id === "max-targets" || i.id === "max-syllables" ||
      i.id === "target-copy-limit" || i.id === "syllable-family-limit" || i.id === "syllable-exact-limit",
    );
  const hasIncomplete =
    issues.some((i) =>
      i.id === "min-targets" || i.id === "min-syllables" ||
      i.id === "syllable-min-copies" || i.id === "syllable-multi-family-min",
    );

  if (hasExceeded) {
    return {
      status: "exceeded",
      label: "Invalido",
      detail: issues.map((i) => i.title).join(" · "),
      issues,
    };
  }
  if (hasIncomplete) {
    return {
      status: "incomplete",
      label: "Incompleto",
      detail: issues.map((i) => i.title).join(" · "),
      issues,
    };
  }

  // Within valid range — check if in ideal range
  const inIdealTargets = totalTargets >= rules.targets.ideal && totalTargets <= rules.targets.max;
  const inIdealSyllables = totalSyllables >= rules.syllables.ideal && totalSyllables <= rules.syllables.max;

  if (inIdealTargets && inIdealSyllables) {
    return {
      status: "ideal",
      label: "Faixa ideal",
      detail: `${totalTargets} alvos e ${totalSyllables} silabas — composicao otima.`,
      issues: [],
    };
  }

  return {
    status: "valid-min",
    label: "Valido · abaixo do ideal",
    detail: `Composicao valida. Ideal: ${rules.targets.ideal}–${rules.targets.max} alvos e ${rules.syllables.ideal}–${rules.syllables.max} silabas.`,
    issues: [],
  };
}
