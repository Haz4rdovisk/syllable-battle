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

export interface DeckContentInspection {
  deck: Deck;
  metrics: DeckContentMetrics;
  warnings: DeckContentWarning[];
}

const rarityOrder: Rarity[] = ["comum", "raro", "épico", "lendário"];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createEmptyRarityCounts(): Record<Rarity, number> {
  return {
    comum: 0,
    raro: 0,
    épico: 0,
    lendário: 0,
  };
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
      title: "Target longo no catálogo",
      detail: `O deck tem target de ${metrics.longestTargetLength} sílabas. Isso costuma aumentar atrito de conclusão e dependência de compra.`,
    });
  }

  if (metrics.averageDamage >= 2.5 || uncommonOrHigher >= Math.ceil(deck.targets.length * 0.66)) {
    warnings.push({
      id: "damage-profile",
      severity: "warning",
      title: "Perfil de dano acima da média básica",
      detail: `A média de dano por target ficou em ${metrics.averageDamage}, com forte concentração em raridades raras ou superiores.`,
    });
  }

  if (metrics.averageCopiesPerSyllable <= 3.1) {
    warnings.push({
      id: "thin-syllable-pool",
      severity: "warning",
      title: "Pool de sílabas pouco redundante",
      detail: `A média está em ${metrics.averageCopiesPerSyllable} cópias por sílaba. Pools mais finos tendem a gerar mais mão travada.`,
    });
  }

  if (metrics.highestSyllableCount >= 5) {
    warnings.push({
      id: "heavy-concentration",
      severity: "info",
      title: "Concentração alta em uma sílaba",
      detail: `A maior sílaba aparece ${metrics.highestSyllableCount} vezes. Vale revisar se isso é identidade intencional ou excesso de consistência.`,
    });
  }

  if (lowCoverageTargets >= Math.ceil(deck.targets.length / 2)) {
    warnings.push({
      id: "tight-coverage",
      severity: "info",
      title: "Cobertura apertada em vários targets",
      detail: `${lowCoverageTargets} targets dependem de sílabas com até 2 cópias no deck. Isso pode pressionar compra e reposição.`,
    });
  }

  if (deck.targets.length === CONFIG.targetsInPlay) {
    warnings.push({
      id: "minimum-target-count",
      severity: "info",
      title: "Deck no mínimo estrutural de targets",
      detail: `O deck tem exatamente ${CONFIG.targetsInPlay} targets, sem folga de rotação para substituição em campo.`,
    });
  }

  return warnings;
}

export function inspectDeckContent(deck: Deck): DeckContentInspection {
  return {
    deck,
    metrics: getDeckContentMetrics(deck),
    warnings: getDeckContentWarnings(deck),
  };
}

export function inspectDeckCatalog(decks: Deck[]): DeckContentInspection[] {
  return decks.map((deck) => inspectDeckContent(deck));
}

export function formatRarityBreakdown(rarityCounts: Record<Rarity, number>) {
  return rarityOrder
    .filter((rarity) => rarityCounts[rarity] > 0)
    .map((rarity) => `${rarity.toUpperCase()}: ${rarityCounts[rarity]}`)
    .join(" • ");
}
