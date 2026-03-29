import { CONFIG } from "../logic/gameLogic";
import { Deck, RARITY_DAMAGE, Rarity, normalizeRarity } from "../types/game";

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
  deck: Deck;
  metrics: DeckContentMetrics;
  warnings: DeckContentWarning[];
  bottlenecks: DeckSyllableBottleneck[];
  targetCompetition: DeckTargetCompetition[];
  relativeChecks: DeckRelativeCheck[];
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

function getSyllableUsage(deck: Deck) {
  const usage = new Map<string, string[]>();

  deck.targets.forEach((target) => {
    const uniqueSyllables = new Set(target.syllables);
    uniqueSyllables.forEach((syllable) => {
      const current = usage.get(syllable) ?? [];
      usage.set(syllable, [...current, target.name]);
    });
  });

  return usage;
}

export function getDeckContentMetrics(deck: Deck): DeckContentMetrics {
  const syllableCounts = Object.values(deck.syllables);
  const targetLengths = deck.targets.map((target) => target.syllables.length);
  const rarityCounts = deck.targets.reduce<Record<Rarity, number>>((acc, target) => {
    const rarity = normalizeRarity(target.rarity);
    acc[rarity] += 1;
    return acc;
  }, createEmptyRarityCounts());
  const totalSyllables = syllableCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalSyllables,
    uniqueSyllables: syllableCounts.length,
    averageCopiesPerSyllable: round(totalSyllables / Math.max(1, syllableCounts.length)),
    averageTargetLength: round(average(targetLengths)),
    longestTargetLength: Math.max(0, ...targetLengths),
    averageDamage: round(
      average(deck.targets.map((target) => RARITY_DAMAGE[normalizeRarity(target.rarity)])),
    ),
    singleUseSyllableCount: syllableCounts.filter((count) => count === 1).length,
    highestSyllableCount: Math.max(0, ...syllableCounts),
    rarityCounts,
  };
}

export function getDeckContentWarnings(deck: Deck): DeckContentWarning[] {
  const metrics = getDeckContentMetrics(deck);
  const warnings: DeckContentWarning[] = [];
  const uncommonOrHigher = deck.targets.filter(
    (target) => RARITY_DAMAGE[normalizeRarity(target.rarity)] >= RARITY_DAMAGE.raro,
  ).length;
  const lowCoverageTargets = deck.targets.filter((target) =>
    target.syllables.some((syllable) => (deck.syllables[syllable] ?? 0) <= 2),
  ).length;

  if (metrics.longestTargetLength >= 4) {
    warnings.push({
      id: "long-target",
      severity: "warning",
      title: "Target longo no catalogo",
      detail: `O deck tem target de ${metrics.longestTargetLength} silabas. Isso costuma aumentar atrito de conclusao e dependencia de compra.`,
    });
  }

  if (metrics.averageDamage >= 2.5 || uncommonOrHigher >= Math.ceil(deck.targets.length * 0.66)) {
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

  if (lowCoverageTargets >= Math.ceil(deck.targets.length / 2)) {
    warnings.push({
      id: "tight-coverage",
      severity: "info",
      title: "Cobertura apertada em varios targets",
      detail: `${lowCoverageTargets} targets dependem de silabas com ate 2 copias no deck. Isso pode pressionar compra e reposicao.`,
    });
  }

  if (deck.targets.length === CONFIG.targetsInPlay) {
    warnings.push({
      id: "minimum-target-count",
      severity: "info",
      title: "Deck no minimo estrutural de targets",
      detail: `O deck tem exatamente ${CONFIG.targetsInPlay} targets, sem folga de rotacao para substituicao em campo.`,
    });
  }

  return warnings;
}

export function getDeckSyllableBottlenecks(deck: Deck): DeckSyllableBottleneck[] {
  const usage = getSyllableUsage(deck);

  return [...usage.entries()]
    .map(([syllable, affectedTargets]) => {
      const availableCopies = deck.syllables[syllable] ?? 0;
      const requiredAcrossTargets = deck.targets.reduce(
        (total, target) => total + countSyllableOccurrences(target.syllables, syllable),
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

export function getDeckTargetCompetition(deck: Deck): DeckTargetCompetition[] {
  return deck.targets
    .map((target) => {
      const uniqueSyllables = [...new Set(target.syllables)];
      const sharedSyllables = uniqueSyllables.filter((syllable) =>
        deck.targets.some(
          (otherTarget) => otherTarget.id !== target.id && otherTarget.syllables.includes(syllable),
        ),
      );
      const competingTargets = deck.targets
        .filter(
          (otherTarget) =>
            otherTarget.id !== target.id &&
            sharedSyllables.some((syllable) => otherTarget.syllables.includes(syllable)),
        )
        .map((otherTarget) => otherTarget.name);
      const pressureScore = round(
        average(
          sharedSyllables.map((syllable) => {
            const availableCopies = deck.syllables[syllable] ?? 0;
            const requiredAcrossTargets = deck.targets.reduce(
              (total, entry) => total + countSyllableOccurrences(entry.syllables, syllable),
              0,
            );
            return requiredAcrossTargets / Math.max(1, availableCopies);
          }),
        ),
      );

      return {
        targetId: target.id,
        targetName: target.name,
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

export function getDeckRelativeChecks(deck: Deck, catalog: Deck[]): DeckRelativeCheck[] {
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
    highestDamageDeck.deck.id === deck.id
  ) {
    checks.push({
      id: "relative-damage",
      severity: "warning",
      title: "Deck com pressao de dano acima do catalogo",
      detail: `${deck.name} lidera a media de dano (${metrics.averageDamage}) contra ${round(averageDamageAcrossCatalog)} no catalogo atual.`,
    });
  }

  if (
    metrics.averageCopiesPerSyllable <= averageCopiesAcrossCatalog - 0.35 &&
    lowestRedundancyDeck.deck.id === deck.id
  ) {
    checks.push({
      id: "relative-redundancy",
      severity: "warning",
      title: "Deck com redundancia abaixo da media do catalogo",
      detail: `${deck.name} esta em ${metrics.averageCopiesPerSyllable} copias medias por silaba, abaixo da media do catalogo (${round(averageCopiesAcrossCatalog)}).`,
    });
  }

  if (metrics.longestTargetLength === maximumTargetLength && maximumTargetLength >= 4) {
    checks.push({
      id: "relative-target-length",
      severity: "info",
      title: "Deck entre os mais exigentes em comprimento de target",
      detail: `${deck.name} divide o maior target do catalogo com ${maximumTargetLength} silabas.`,
    });
  }

  if (metrics.uniqueSyllables >= average(metricRows.map((entry) => entry.metrics.uniqueSyllables)) + 1) {
    checks.push({
      id: "relative-variety",
      severity: "info",
      title: "Deck com cobertura mais diversa que a media",
      detail: `${deck.name} trabalha com ${metrics.uniqueSyllables} silabas unicas, acima da cobertura media do catalogo.`,
    });
  }

  return checks;
}

export function compareDeckMetrics(baseDeck: Deck, compareDeck: Deck): DeckMetricComparison[] {
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

export function inspectDeckContent(deck: Deck, catalog: Deck[] = [deck]): DeckContentInspection {
  const metrics = getDeckContentMetrics(deck);

  return {
    deck,
    metrics,
    warnings: getDeckContentWarnings(deck),
    bottlenecks: getDeckSyllableBottlenecks(deck),
    targetCompetition: getDeckTargetCompetition(deck),
    relativeChecks: getDeckRelativeChecks(deck, catalog),
  };
}

export function inspectDeckCatalog(decks: Deck[]): DeckContentInspection[] {
  return decks.map((deck) => inspectDeckContent(deck, decks));
}

export function formatRarityBreakdown(rarityCounts: Record<Rarity, number>) {
  return rarityOrder
    .filter((rarity) => rarityCounts[rarity] > 0)
    .map((rarity) => `${rarity.toUpperCase()}: ${rarityCounts[rarity]}`)
    .join(" • ");
}
