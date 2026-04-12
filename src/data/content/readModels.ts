import { normalizeRarity, type Rarity } from "../../types/game";
import {
  CONTENT_RARITY_ASCENDING,
  filterAndSortContentTargets,
  formatTaxonomyLabel,
  getContentRarityDamage,
  getContentRarityLabel,
  getContentRarityOrder,
  getContentRaritySoftToneClass,
  getContentRarityToneClass,
  normalizeTaxonomyValue,
  resolveTargetSyllables,
  type ContentSortDirection,
  type ContentTargetFilterOptions,
  type ContentTargetSortMode,
} from "./helpers";
import type {
  CardDefinition,
  DeckDefinition,
  DeckModel,
  NormalizedContentCatalog,
  TargetDefinition,
} from "./types";

export interface ContentTaxonomyOptionView {
  id: string;
  label: string;
}

export interface ContentRarityView {
  id: Rarity;
  label: string;
  compactLabel: string;
  uppercaseLabel: string;
  order: number;
  damage: number;
  toneClass: string;
  softToneClass: string;
}

export interface ContentTargetView {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  rarity: Rarity;
  rarityView: ContentRarityView;
  damage: number;
  cardIds: string[];
  syllables: string[];
  syllableCount: number;
  superclass: string;
  superclassId: string;
  superclassLabel: string;
  classKey: string;
  classId: string;
  classLabel: string;
  copies: number;
  definition?: TargetDefinition;
}

export interface ContentSyllableView {
  id: string;
  cardId: string;
  syllable: string;
  label: string;
  copies?: number;
  usedByTargetIds: string[];
  usedByTargetNames: string[];
  card?: CardDefinition;
}

export interface ContentDeckMetricsView {
  totalTargets: number;
  uniqueTargets: number;
  totalSyllables: number;
  uniqueSyllables: number;
  averageTargetLength: number;
  averageDamage: number;
  rarityCounts: Record<Rarity, number>;
}

export interface ContentDeckSummaryView {
  id: string;
  name: string;
  description: string;
  emoji: string;
  superclass: string;
  superclassId: string;
  superclassLabel: string;
  visualTheme: DeckDefinition["visualTheme"];
  cardIds: string[];
  targetIds: string[];
  targets: ContentTargetView[];
  syllables: ContentSyllableView[];
  metrics: ContentDeckMetricsView;
  definition: DeckDefinition;
}

export interface ContentCatalogFiltersView {
  superclassOptions: ContentTaxonomyOptionView[];
  classOptions: ContentTaxonomyOptionView[];
  rarityOptions: ContentTaxonomyOptionView[];
}

export interface ContentTargetViewFromSyllablesInput {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  rarity: string;
  syllables: readonly string[];
  cardIds?: readonly string[];
  superclass?: string;
  classKey?: string;
  copies?: number;
}

export interface CreateContentTargetViewOptions {
  copies?: number;
}

export interface CreateContentCatalogTargetViewsOptions {
  deckModels?: readonly DeckModel[];
}

export interface CreateContentCatalogFiltersViewOptions {
  superclassFilter?: string;
  locale?: string;
}

export interface FilterAndSortContentTargetViewsOptions
  extends Omit<ContentTargetFilterOptions, "sortMode" | "sortDirection"> {
  sortMode?: ContentTargetSortMode;
  sortDirection?: ContentSortDirection;
}

const createEmptyRarityCounts = (): Record<Rarity, number> => ({
  comum: 0,
  raro: 0,
  épico: 0,
  lendário: 0,
});

const roundContentMetric = (value: number) => Math.round(value * 100) / 100;

const averageContentMetric = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeContentSyllable = (value: string) => value.trim().toUpperCase();

export function createContentRarityView(rarity: string): ContentRarityView {
  const normalized = normalizeRarity(rarity);

  return {
    id: normalized,
    label: getContentRarityLabel(normalized),
    compactLabel: getContentRarityLabel(normalized, { stripAccents: true }),
    uppercaseLabel: getContentRarityLabel(normalized, { uppercase: true, stripAccents: true }),
    order: getContentRarityOrder(normalized),
    damage: getContentRarityDamage(normalized),
    toneClass: getContentRarityToneClass(normalized),
    softToneClass: getContentRaritySoftToneClass(normalized),
  };
}

export function createContentTargetViewFromSyllables(
  input: ContentTargetViewFromSyllablesInput,
): ContentTargetView {
  const rarity = normalizeRarity(input.rarity);
  const superclass = input.superclass ?? "";
  const classKey = input.classKey ?? "";
  const syllables = input.syllables.map((syllable) => normalizeContentSyllable(syllable));

  return {
    id: input.id,
    name: input.name,
    emoji: input.emoji ?? "",
    description: input.description || undefined,
    rarity,
    rarityView: createContentRarityView(rarity),
    damage: getContentRarityDamage(rarity),
    cardIds: [...(input.cardIds ?? syllables)],
    syllables,
    syllableCount: syllables.length,
    superclass,
    superclassId: normalizeTaxonomyValue(superclass),
    superclassLabel: formatTaxonomyLabel(superclass, "Sem superclasse"),
    classKey,
    classId: normalizeTaxonomyValue(classKey),
    classLabel: formatTaxonomyLabel(classKey, "Sem classe"),
    copies: input.copies ?? 0,
  };
}

export function createContentTargetView(
  target: TargetDefinition,
  catalog: Pick<NormalizedContentCatalog, "cardsById">,
  options: CreateContentTargetViewOptions = {},
): ContentTargetView {
  return {
    ...createContentTargetViewFromSyllables({
      id: target.id,
      name: target.name,
      emoji: target.emoji,
      description: target.description,
      rarity: target.rarity,
      cardIds: target.cardIds,
      syllables: resolveTargetSyllables(target, catalog),
      superclass: target.superclass,
      classKey: target.classKey,
      copies: options.copies,
    }),
    definition: target,
  };
}

export function createContentTargetCopiesByIdFromDeckModels(deckModels: readonly DeckModel[]) {
  return deckModels.reduce<Map<string, number>>((acc, deckModel) => {
    deckModel.targetInstances.forEach((entry) => {
      acc.set(entry.targetId, (acc.get(entry.targetId) ?? 0) + 1);
    });
    return acc;
  }, new Map<string, number>());
}

export function createContentCatalogTargetViews(
  catalog: NormalizedContentCatalog,
  options: CreateContentCatalogTargetViewsOptions = {},
) {
  const copiesByTargetId = createContentTargetCopiesByIdFromDeckModels(options.deckModels ?? []);

  return catalog.targets.map((target) =>
    createContentTargetView(target, catalog, {
      copies: copiesByTargetId.get(target.id) ?? 0,
    }),
  );
}

export function createContentCatalogSyllableViews(catalog: NormalizedContentCatalog) {
  return catalog.cards.map((card) => {
    const usedByTargets = catalog.targets.filter((target) => target.cardIds.includes(card.id));

    return {
      id: card.id,
      cardId: card.id,
      syllable: card.syllable,
      label: card.label ?? card.syllable,
      usedByTargetIds: usedByTargets.map((target) => target.id),
      usedByTargetNames: usedByTargets.map((target) => target.name),
      card,
    };
  });
}

function createContentDeckTargetViews(deckModel: DeckModel) {
  const targetCopies = deckModel.targetInstances.reduce<Map<string, number>>((acc, entry) => {
    acc.set(entry.targetId, (acc.get(entry.targetId) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  return deckModel.targetDefinitions
    .map((target) =>
      createContentTargetViewFromSyllables({
        id: target.id,
        name: target.name,
        emoji: target.emoji,
        description: target.description,
        rarity: target.rarity,
        cardIds: target.cardIds,
        syllables: target.cardIds.map((cardId) => deckModel.cards.find((entry) => entry.card.id === cardId)?.card.syllable ?? cardId),
        superclass: target.superclass,
        classKey: target.classKey,
        copies: targetCopies.get(target.id) ?? 0,
      }),
    )
    .sort((left, right) => getContentRarityOrder(right.rarity) - getContentRarityOrder(left.rarity));
}

function createContentDeckSyllableViews(deckModel: DeckModel) {
  return deckModel.cards.map((entry) => ({
    id: entry.card.id,
    cardId: entry.card.id,
    syllable: entry.card.syllable,
    label: entry.card.label ?? entry.card.syllable,
    copies: entry.copiesInDeck,
    usedByTargetIds: entry.usedByTargets.map((target) => target.id),
    usedByTargetNames: entry.usedByTargets.map((target) => target.name),
    card: entry.card,
  }));
}

function createContentDeckMetricsView(
  deckModel: DeckModel,
  targets: readonly ContentTargetView[],
  syllables: readonly ContentSyllableView[],
): ContentDeckMetricsView {
  const targetInstances = deckModel.targetInstances;
  const rarityCounts = targetInstances.reduce<Record<Rarity, number>>((acc, entry) => {
    acc[normalizeRarity(entry.target.rarity)] += 1;
    return acc;
  }, createEmptyRarityCounts());
  const totalSyllables = syllables.reduce((sum, entry) => sum + (entry.copies ?? 0), 0);
  const targetLengths = targetInstances.map((entry) => entry.target.cardIds.length);
  const targetDamages = targetInstances.map((entry) => getContentRarityDamage(entry.target.rarity));

  return {
    totalTargets: targetInstances.length,
    uniqueTargets: targets.length,
    totalSyllables,
    uniqueSyllables: syllables.length,
    averageTargetLength: roundContentMetric(averageContentMetric(targetLengths)),
    averageDamage: roundContentMetric(averageContentMetric(targetDamages)),
    rarityCounts,
  };
}

export function createContentDeckSummaryView(deckModel: DeckModel): ContentDeckSummaryView {
  const definition = deckModel.definition;
  const targets = createContentDeckTargetViews(deckModel);
  const syllables = createContentDeckSyllableViews(deckModel);

  return {
    id: deckModel.id,
    name: definition.name,
    description: definition.description,
    emoji: definition.emoji,
    superclass: definition.superclass,
    superclassId: normalizeTaxonomyValue(definition.superclass),
    superclassLabel: formatTaxonomyLabel(definition.superclass, "Sem superclasse"),
    visualTheme: definition.visualTheme,
    cardIds: [...definition.cardIds],
    targetIds: [...definition.targetIds],
    targets,
    syllables,
    metrics: createContentDeckMetricsView(deckModel, targets, syllables),
    definition,
  };
}

export function createContentDeckSummaryViews(deckModels: readonly DeckModel[]) {
  return deckModels.map((deckModel) => createContentDeckSummaryView(deckModel));
}

export function createContentCatalogFiltersView(
  targets: readonly { superclass?: string; classKey?: string }[],
  options: CreateContentCatalogFiltersViewOptions = {},
): ContentCatalogFiltersView {
  const { superclassFilter = "all", locale = "pt-BR" } = options;
  const superclassOptions = Array.from(
    new Set(targets.map((target) => normalizeTaxonomyValue(target.superclass ?? "")).filter(Boolean)),
  )
    .sort((left, right) => left.localeCompare(right, locale))
    .map((id) => ({ id, label: formatTaxonomyLabel(id) }));
  const classSource =
    superclassFilter === "all"
      ? targets
      : targets.filter((target) => normalizeTaxonomyValue(target.superclass ?? "") === superclassFilter);
  const classOptions = Array.from(
    new Set(classSource.map((target) => normalizeTaxonomyValue(target.classKey ?? "")).filter(Boolean)),
  )
    .sort((left, right) => left.localeCompare(right, locale))
    .map((id) => ({ id, label: formatTaxonomyLabel(id) }));

  return {
    superclassOptions,
    classOptions,
    rarityOptions: CONTENT_RARITY_ASCENDING.map((rarity) => ({
      id: rarity,
      label: getContentRarityLabel(rarity),
    })),
  };
}

export function filterAndSortContentTargetViews(
  targets: readonly ContentTargetView[],
  options: FilterAndSortContentTargetViewsOptions = {},
) {
  return filterAndSortContentTargets(targets, options);
}
