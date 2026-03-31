import { CONFIG } from "../logic/gameLogic";
import { Deck, RARITY_DAMAGE, Rarity, normalizeRarity } from "../types/game";
import { DeckModel } from "./content/types";

export interface DeckContentWarning {
  id: string;
  severity: "info" | "warning";
  title: string;
  detail: string;
}

export interface DeckContentMetrics {
  totalSyllables: number;
  uniqueSyllables: number;
  averageCopiesPerSyllable: number;
  averageTargetLength: number;
  longestTargetLength: number;
  averageDamage: number;
  singleUseSyllableCount: number;
  highestSyllableCount: number;
  rarityCounts: Record<Rarity, number>;
}

export interface DeckSyllableBottleneck {
  syllable: string;
  availableCopies: number;
  requiredAcrossTargets: number;
  pressure: number;
  affectedTargets: string[];
}

export interface DeckTargetCompetition {
  instanceKey: string;
  targetId: string;
  targetName: string;
  sharedSyllables: string[];
  competingTargets: string[];
  pressureScore: number;
}

export interface DeckRelativeCheck {
  id: string;
  severity: "info" | "warning";
  title: string;
  detail: string;
}

export interface DeckMetricComparison {
  id: string;
  label: string;
  baseValue: number;
  compareValue: number;
  delta: number;
  baseDisplay: string;
  compareDisplay: string;
  deltaDisplay: string;
}

export interface DeckContentInspection {
  deckModel: DeckModel | null;
  deck: Deck | null;
  metrics: DeckContentMetrics;
  warnings: DeckContentWarning[];
  bottlenecks: DeckSyllableBottleneck[];
  targetCompetition: DeckTargetCompetition[];
  relativeChecks: DeckRelativeCheck[];
}

type DeckContentSource = DeckModel | Deck;

interface InsightCardEntry {
  cardId: string;
  syllable: string;
  copiesInDeck: number;
}

interface InsightTargetInstance {
  instanceKey: string;
  targetId: string;
  targetName: string;
  cardIds: string[];
  syllables: string[];
  rarity: Rarity;
}

interface ResolvedInsightTargetInstance {
  instanceKey: string;
  target: InsightTargetInstance;
  displayName: string;
}

const rarityOrder: Rarity[] = ["comum", "raro", "épico", "lendário"];

const comparisonMetricDefinitions = [
  { id: "total-syllables", label: "Silabas totais", getValue: (metrics: DeckContentMetrics) => metrics.totalSyllables },
  { id: "unique-syllables", label: "Silabas unicas", getValue: (metrics: DeckContentMetrics) => metrics.uniqueSyllables },
  {
    id: "average-copies",
    label: "Copias medias por silaba",
    getValue: (metrics: DeckContentMetrics) => metrics.averageCopiesPerSyllable,
  },
  {
    id: "average-target-length",
    label: "Media de silabas por target",
    getValue: (metrics: DeckContentMetrics) => metrics.averageTargetLength,
  },
  { id: "longest-target", label: "Maior target", getValue: (metrics: DeckContentMetrics) => metrics.longestTargetLength },
  { id: "average-damage", label: "Dano medio", getValue: (metrics: DeckContentMetrics) => metrics.averageDamage },
] as const;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDelta(value: number) {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMetricValue(value)}`;
}

function createEmptyRarityCounts(): Record<Rarity, number> {
  return {
    comum: 0,
    raro: 0,
    épico: 0,
    lendário: 0,
  };
}

function countSyllableOccurrences(targetSyllables: string[], syllable: string) {
  return targetSyllables.reduce((count, entry) => count + (entry === syllable ? 1 : 0), 0);
}

function isDeckModel(source: DeckContentSource): source is DeckModel {
  return "definition" in source && "cards" in source && "targetInstances" in source;
}

function getDeckName(source: DeckContentSource) {
  return isDeckModel(source) ? source.definition.name : source.name;
}

function getDeckId(source: DeckContentSource) {
  return isDeckModel(source) ? source.id : source.id;
}

function getDeckCardEntries(source: DeckContentSource): InsightCardEntry[] {
  if (isDeckModel(source)) {
    return source.cards.map((entry) => ({
      cardId: entry.card.id,
      syllable: entry.card.syllable,
      copiesInDeck: entry.copiesInDeck,
    }));
  }

  return Object.entries(source.syllables).map(([syllable, copiesInDeck]) => ({
    cardId: syllable,
    syllable,
    copiesInDeck,
  }));
}

function getDeckCardCopies(source: DeckContentSource) {
  return getDeckCardEntries(source).reduce<Map<string, number>>((acc, entry) => {
    acc.set(entry.syllable, entry.copiesInDeck);
    return acc;
  }, new Map<string, number>());
}

function getDeckTargetInstances(source: DeckContentSource): ResolvedInsightTargetInstance[] {
  const sourceTargets = isDeckModel(source)
    ? source.targetInstances.map((entry) => ({
        instanceKey: entry.instanceKey,
        targetId: entry.targetId,
        targetName: entry.target.name,
        cardIds: entry.target.cardIds,
        syllables: entry.target.cardIds.map((cardId) => {
          const cardEntry = source.cards.find((entry) => entry.card.id === cardId);
          return cardEntry?.card.syllable ?? cardId;
        }),
        rarity: normalizeRarity(entry.target.rarity),
      }))
    : source.targets.map((target, index) => ({
        instanceKey: `${target.id}-${index}`,
        targetId: target.id,
        targetName: target.name,
        cardIds: target.syllables,
        syllables: target.syllables,
        rarity: normalizeRarity(target.rarity),
      }));

  const targetCounts = sourceTargets.reduce<Map<string, number>>((acc, target) => {
    acc.set(target.targetId, (acc.get(target.targetId) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const targetIndexes = new Map<string, number>();

  return sourceTargets.map((target) => {
    const occurrence = (targetIndexes.get(target.targetId) ?? 0) + 1;
    targetIndexes.set(target.targetId, occurrence);

    return {
      ...target,
      target,
      displayName:
        (targetCounts.get(target.targetId) ?? 0) > 1 ? `${target.targetName} #${occurrence}` : target.targetName,
    };
  });
}

function getSyllableUsage(source: DeckContentSource) {
  const usage = new Map<string, string[]>();

  getDeckTargetInstances(source).forEach(({ target, displayName }) => {
    const uniqueSyllables = new Set(target.syllables);
    uniqueSyllables.forEach((syllable) => {
      const current = usage.get(syllable) ?? [];
      usage.set(syllable, [...current, displayName]);
    });
  });

  return usage;
}

export function getDeckContentMetrics(deck: DeckContentSource): DeckContentMetrics {
  const cardEntries = getDeckCardEntries(deck);
  const targetInstances = getDeckTargetInstances(deck);
  const syllableCounts = cardEntries.map((entry) => entry.copiesInDeck);
  const targetLengths = targetInstances.map((target) => target.target.cardIds.length);
  const rarityCounts = targetInstances.reduce<Record<Rarity, number>>((acc, target) => {
    const rarity = normalizeRarity(target.target.rarity);
    acc[rarity] += 1;
    return acc;
  }, createEmptyRarityCounts());
  const totalSyllables = cardEntries.reduce((sum, entry) => sum + entry.copiesInDeck, 0);

  return {
    totalSyllables,
    uniqueSyllables: syllableCounts.length,
    averageCopiesPerSyllable: round(totalSyllables / Math.max(1, syllableCounts.length)),
    averageTargetLength: round(average(targetLengths)),
    longestTargetLength: Math.max(0, ...targetLengths),
    averageDamage: round(
      average(targetInstances.map((target) => RARITY_DAMAGE[target.target.rarity])),
    ),
    singleUseSyllableCount: syllableCounts.filter((count) => count === 1).length,
    highestSyllableCount: Math.max(0, ...syllableCounts),
    rarityCounts,
  };
}

export function getDeckContentWarnings(deck: DeckContentSource): DeckContentWarning[] {
  const metrics = getDeckContentMetrics(deck);
  const targetInstances = getDeckTargetInstances(deck);
  const cardCopies = getDeckCardCopies(deck);
  const warnings: DeckContentWarning[] = [];
  const uncommonOrHigher = targetInstances.filter(
    (target) => RARITY_DAMAGE[target.target.rarity] >= RARITY_DAMAGE.raro,
  ).length;
  const lowCoverageTargets = targetInstances.filter((target) =>
    target.target.syllables.some((syllable) => (cardCopies.get(syllable) ?? 0) <= 2),
  ).length;

  if (metrics.longestTargetLength >= 4) {
    warnings.push({
      id: "long-target",
      severity: "warning",
      title: "Target longo no catalogo",
      detail: `O deck tem target de ${metrics.longestTargetLength} silabas. Isso costuma aumentar atrito de conclusao e dependencia de compra.`,
    });
  }

  if (metrics.averageDamage >= 2.5 || uncommonOrHigher >= Math.ceil(targetInstances.length * 0.66)) {
    warnings.push({
      id: "damage-profile",
      severity: "warning",
      title: "Perfil de dano acima da media basica",
      detail: `A media de dano por target ficou em ${metrics.averageDamage}, com forte concentracao em raridades raras ou superiores.`,
    });
  }

  if (metrics.averageCopiesPerSyllable <= 3.1) {
    warnings.push({
      id: "thin-syllable-pool",
      severity: "warning",
      title: "Pool de silabas pouco redundante",
      detail: `A media esta em ${metrics.averageCopiesPerSyllable} copias por silaba. Pools mais finos tendem a gerar mais mao travada.`,
    });
  }

  if (metrics.highestSyllableCount >= 5) {
    warnings.push({
      id: "heavy-concentration",
      severity: "info",
      title: "Concentracao alta em uma silaba",
      detail: `A silaba mais recorrente aparece ${metrics.highestSyllableCount} vezes. Vale revisar se isso e identidade intencional ou excesso de consistencia.`,
    });
  }

  if (lowCoverageTargets >= Math.ceil(targetInstances.length / 2)) {
    warnings.push({
      id: "tight-coverage",
      severity: "info",
      title: "Cobertura apertada em varios targets",
      detail: `${lowCoverageTargets} targets dependem de silabas com ate 2 copias no deck. Isso pode pressionar compra e reposicao.`,
    });
  }

  if (targetInstances.length === CONFIG.targetsInPlay) {
    warnings.push({
      id: "minimum-target-count",
      severity: "info",
      title: "Deck no minimo estrutural de targets",
      detail: `O deck tem exatamente ${CONFIG.targetsInPlay} targets, sem folga de rotacao para substituicao em campo.`,
    });
  }

  return warnings;
}

export function getDeckSyllableBottlenecks(deck: DeckContentSource): DeckSyllableBottleneck[] {
  const usage = getSyllableUsage(deck);
  const cardCopies = getDeckCardCopies(deck);
  const targetInstances = getDeckTargetInstances(deck);

  return [...usage.entries()]
    .map(([syllable, affectedTargets]) => {
      const availableCopies = cardCopies.get(syllable) ?? 0;
      const requiredAcrossTargets = targetInstances.reduce(
        (total, target) => total + countSyllableOccurrences(target.target.syllables, syllable),
        0,
      );

      return {
        syllable,
        availableCopies,
        requiredAcrossTargets,
        pressure: round(requiredAcrossTargets / Math.max(1, availableCopies)),
        affectedTargets,
      };
    })
    .filter((entry) => entry.pressure >= 1 || entry.availableCopies <= 2)
    .sort((left, right) => {
      if (right.pressure !== left.pressure) return right.pressure - left.pressure;
      if (left.availableCopies !== right.availableCopies) return left.availableCopies - right.availableCopies;
      return left.syllable.localeCompare(right.syllable);
    });
}

export function getDeckTargetCompetition(deck: DeckContentSource): DeckTargetCompetition[] {
  const targetInstances = getDeckTargetInstances(deck);
  const cardCopies = getDeckCardCopies(deck);

  return targetInstances
    .map(({ instanceKey, target, displayName }) => {
      const uniqueSyllables = [...new Set(target.syllables)];
      const sharedSyllables = uniqueSyllables.filter((syllable) =>
        targetInstances.some(
          (otherEntry) => otherEntry.instanceKey !== instanceKey && otherEntry.target.syllables.includes(syllable),
        ),
      );
      const competingTargets = targetInstances
        .filter(
          (otherEntry) =>
            otherEntry.instanceKey !== instanceKey &&
            sharedSyllables.some((syllable) => otherEntry.target.syllables.includes(syllable)),
        )
        .map((otherEntry) => otherEntry.displayName);
      const pressureScore = round(
        average(
          sharedSyllables.map((syllable) => {
            const availableCopies = cardCopies.get(syllable) ?? 0;
            const requiredAcrossTargets = targetInstances.reduce(
              (total, entry) => total + countSyllableOccurrences(entry.target.syllables, syllable),
              0,
            );
            return requiredAcrossTargets / Math.max(1, availableCopies);
          }),
        ),
      );

      return {
        instanceKey,
        targetId: target.targetId,
        targetName: displayName,
        sharedSyllables,
        competingTargets,
        pressureScore,
      };
    })
    .filter((entry) => entry.sharedSyllables.length > 0)
    .sort((left, right) => {
      if (right.pressureScore !== left.pressureScore) return right.pressureScore - left.pressureScore;
      if (right.competingTargets.length !== left.competingTargets.length) {
        return right.competingTargets.length - left.competingTargets.length;
      }
      return left.targetName.localeCompare(right.targetName);
    });
}

export function getDeckRelativeChecks(
  deck: DeckContentSource,
  catalog: DeckContentSource[],
): DeckRelativeCheck[] {
  if (catalog.length <= 1) return [];

  const metrics = getDeckContentMetrics(deck);
  const metricRows = catalog.map((entry) => ({
    deck: entry,
    metrics: getDeckContentMetrics(entry),
  }));
  const averageDamageAcrossCatalog = average(metricRows.map((entry) => entry.metrics.averageDamage));
  const averageCopiesAcrossCatalog = average(
    metricRows.map((entry) => entry.metrics.averageCopiesPerSyllable),
  );
  const maximumTargetLength = Math.max(...metricRows.map((entry) => entry.metrics.longestTargetLength));
  const highestDamageDeck = metricRows.reduce((best, entry) =>
    entry.metrics.averageDamage > best.metrics.averageDamage ? entry : best,
  );
  const lowestRedundancyDeck = metricRows.reduce((best, entry) =>
    entry.metrics.averageCopiesPerSyllable < best.metrics.averageCopiesPerSyllable ? entry : best,
  );
  const checks: DeckRelativeCheck[] = [];

  if (
    metrics.averageDamage >= averageDamageAcrossCatalog + 0.4 &&
    getDeckId(highestDamageDeck.deck) === getDeckId(deck)
  ) {
    checks.push({
      id: "relative-damage",
      severity: "warning",
      title: "Deck com pressao de dano acima do catalogo",
      detail: `${getDeckName(deck)} lidera a media de dano (${metrics.averageDamage}) contra ${round(averageDamageAcrossCatalog)} no catalogo atual.`,
    });
  }

  if (
    metrics.averageCopiesPerSyllable <= averageCopiesAcrossCatalog - 0.35 &&
    getDeckId(lowestRedundancyDeck.deck) === getDeckId(deck)
  ) {
    checks.push({
      id: "relative-redundancy",
      severity: "warning",
      title: "Deck com redundancia abaixo da media do catalogo",
      detail: `${getDeckName(deck)} esta em ${metrics.averageCopiesPerSyllable} copias medias por silaba, abaixo da media do catalogo (${round(averageCopiesAcrossCatalog)}).`,
    });
  }

  if (metrics.longestTargetLength === maximumTargetLength && maximumTargetLength >= 4) {
    checks.push({
      id: "relative-target-length",
      severity: "info",
      title: "Deck entre os mais exigentes em comprimento de target",
      detail: `${getDeckName(deck)} divide o maior target do catalogo com ${maximumTargetLength} silabas.`,
    });
  }

  if (metrics.uniqueSyllables >= average(metricRows.map((entry) => entry.metrics.uniqueSyllables)) + 1) {
    checks.push({
      id: "relative-variety",
      severity: "info",
      title: "Deck com cobertura mais diversa que a media",
      detail: `${getDeckName(deck)} trabalha com ${metrics.uniqueSyllables} silabas unicas, acima da cobertura media do catalogo.`,
    });
  }

  return checks;
}

export function compareDeckMetrics(
  baseDeck: DeckContentSource,
  compareDeck: DeckContentSource,
): DeckMetricComparison[] {
  const baseMetrics = getDeckContentMetrics(baseDeck);
  const compareMetrics = getDeckContentMetrics(compareDeck);

  return comparisonMetricDefinitions.map((definition) => {
    const baseValue = round(definition.getValue(baseMetrics));
    const compareValue = round(definition.getValue(compareMetrics));
    const delta = round(baseValue - compareValue);

    return {
      id: definition.id,
      label: definition.label,
      baseValue,
      compareValue,
      delta,
      baseDisplay: formatMetricValue(baseValue),
      compareDisplay: formatMetricValue(compareValue),
      deltaDisplay: formatDelta(delta),
    };
  });
}

export function inspectDeckContent(
  deck: DeckContentSource,
  catalog: DeckContentSource[] = [deck],
  runtimeDecksById: Record<string, Deck> = {},
): DeckContentInspection {
  const metrics = getDeckContentMetrics(deck);

  return {
    deckModel: isDeckModel(deck) ? deck : null,
    deck: isDeckModel(deck) ? runtimeDecksById[deck.id] ?? null : deck,
    metrics,
    warnings: getDeckContentWarnings(deck),
    bottlenecks: getDeckSyllableBottlenecks(deck),
    targetCompetition: getDeckTargetCompetition(deck),
    relativeChecks: getDeckRelativeChecks(deck, catalog),
  };
}

export function inspectDeckCatalog(
  decks: DeckContentSource[],
  runtimeDecksById: Record<string, Deck> = {},
): DeckContentInspection[] {
  return decks.map((deck) => inspectDeckContent(deck, decks, runtimeDecksById));
}

export function formatRarityBreakdown(rarityCounts: Record<Rarity, number>) {
  return rarityOrder
    .filter((rarity) => rarityCounts[rarity] > 0)
    .map((rarity) => `${rarity.toUpperCase()}: ${rarityCounts[rarity]}`)
    .join(" • ");
}
