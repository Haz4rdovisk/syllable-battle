import { RARITY_DAMAGE, normalizeRarity, type Rarity } from "../../types/game";
import type { NormalizedContentCatalog, TargetDefinition } from "./types";

export const CONTENT_RARITY_ASCENDING: readonly Rarity[] = [
  "comum",
  "raro",
  "épico",
  "lendário",
] as const;

export const CONTENT_RARITY_DESCENDING: readonly Rarity[] = [
  "lendário",
  "épico",
  "raro",
  "comum",
] as const;

const CONTENT_RARITY_TITLE_LABELS: Record<Rarity, string> = {
  comum: "Comum",
  raro: "Raro",
  épico: "Épico",
  lendário: "Lendário",
};

const CONTENT_RARITY_TONE_CLASSES: Record<Rarity, string> = {
  comum: "bg-slate-500",
  raro: "bg-amber-600",
  épico: "bg-purple-700",
  lendário: "bg-rose-800",
};

const CONTENT_RARITY_SOFT_TONE_CLASSES: Record<Rarity, string> = {
  comum: "bg-slate-50/90 text-slate-600 border-slate-200/60",
  raro: "bg-amber-50/90 text-amber-800 border-amber-200/60",
  épico: "bg-purple-50/90 text-purple-800 border-purple-200/60",
  lendário: "bg-rose-50/90 text-rose-900 border-rose-200/60",
};

export type ContentTargetSortMode = "default" | "rarity" | "damage";
export type ContentSortDirection = "asc" | "desc";

export interface ContentTargetFilterOptions {
  search?: string;
  superclass?: string;
  classKey?: string;
  rarity?: string;
  sortMode?: ContentTargetSortMode;
  sortDirection?: ContentSortDirection;
  locale?: string;
  includeNormalizedTaxonomyInSearch?: boolean;
  includeFormattedTaxonomyInSearch?: boolean;
}

export interface ContentTargetFilterEntry {
  id: string;
  name: string;
  rarity: string;
  superclass?: string;
  classKey?: string;
}

export function normalizeContentSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeTaxonomyValue(value: string) {
  return normalizeContentSearchValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatTaxonomyLabel(value: string, emptyLabel = "") {
  const normalized = normalizeTaxonomyValue(value);
  if (!normalized) return emptyLabel;

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function stripContentAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getContentRarityOrder(rarity: string) {
  const normalized = normalizeRarity(rarity);
  return normalized === "lendário" ? 3 : normalized === "épico" ? 2 : normalized === "raro" ? 1 : 0;
}

export function getContentRarityDamage(rarity: string) {
  return RARITY_DAMAGE[normalizeRarity(rarity)];
}

export function getContentRarityToneClass(rarity: string) {
  return CONTENT_RARITY_TONE_CLASSES[normalizeRarity(rarity)];
}

export function getContentRaritySoftToneClass(rarity: string) {
  return CONTENT_RARITY_SOFT_TONE_CLASSES[normalizeRarity(rarity)];
}

export function getContentRarityLabel(
  rarity: string,
  options: { uppercase?: boolean; stripAccents?: boolean } = {},
) {
  const label = CONTENT_RARITY_TITLE_LABELS[normalizeRarity(rarity)];
  const nextLabel = options.stripAccents ? stripContentAccents(label) : label;
  return options.uppercase ? nextLabel.toUpperCase() : nextLabel;
}

export function resolveTargetSyllables(
  target: Pick<TargetDefinition, "cardIds">,
  catalog: Pick<NormalizedContentCatalog, "cardsById">,
) {
  return target.cardIds.map((cardId) => catalog.cardsById[cardId]?.syllable ?? cardId);
}

const compareTargetNames = (
  left: ContentTargetFilterEntry,
  right: ContentTargetFilterEntry,
  locale?: string,
) => left.name.localeCompare(right.name, locale);

export function filterAndSortContentTargets<T extends ContentTargetFilterEntry>(
  targets: readonly T[],
  options: ContentTargetFilterOptions = {},
) {
  const {
    search = "",
    superclass = "all",
    classKey = "all",
    rarity = "all",
    sortMode = "default",
    sortDirection = "desc",
    locale,
    includeNormalizedTaxonomyInSearch = false,
    includeFormattedTaxonomyInSearch = false,
  } = options;
  const normalizedSearch = normalizeContentSearchValue(search);
  const normalizedSuperclassFilter = superclass === "all" ? "all" : normalizeTaxonomyValue(superclass);
  const normalizedClassFilter = classKey === "all" ? "all" : normalizeTaxonomyValue(classKey);

  let items = targets.filter((target) => {
    const normalizedSuperclass = normalizeTaxonomyValue(target.superclass ?? "");
    const normalizedClassKey = normalizeTaxonomyValue(target.classKey ?? "");

    if (normalizedSuperclassFilter !== "all" && normalizedSuperclass !== normalizedSuperclassFilter) {
      return false;
    }

    if (normalizedClassFilter !== "all" && normalizedClassKey !== normalizedClassFilter) {
      return false;
    }

    if (rarity !== "all" && normalizeRarity(target.rarity) !== normalizeRarity(rarity)) {
      return false;
    }

    if (!normalizedSearch) return true;

    const searchCorpus = [
      target.id,
      target.name,
      target.superclass,
      target.classKey,
      includeNormalizedTaxonomyInSearch ? normalizedSuperclass : "",
      includeNormalizedTaxonomyInSearch ? normalizedClassKey : "",
      includeFormattedTaxonomyInSearch ? formatTaxonomyLabel(target.superclass ?? "") : "",
      includeFormattedTaxonomyInSearch ? formatTaxonomyLabel(target.classKey ?? "") : "",
    ]
      .join(" ")
      .toLowerCase();

    return searchCorpus.includes(normalizedSearch);
  });

  if (sortMode === "rarity") {
    items = [...items].sort((left, right) => {
      const rarityDelta = getContentRarityOrder(right.rarity) - getContentRarityOrder(left.rarity);
      if (rarityDelta !== 0) return sortDirection === "desc" ? rarityDelta : -rarityDelta;
      return compareTargetNames(left, right, locale);
    });
  }

  if (sortMode === "damage") {
    items = [...items].sort((left, right) => {
      const damageDelta = getContentRarityDamage(right.rarity) - getContentRarityDamage(left.rarity);
      if (damageDelta !== 0) return sortDirection === "desc" ? damageDelta : -damageDelta;
      return compareTargetNames(left, right, locale);
    });
  }

  return items;
}
