import type { Rarity } from "../../types/game";

export type DeckVisualThemeId = "harvest" | "abyss" | "canopy" | "dune";

export interface CardDefinition {
  id: string;
  syllable: string;
  label?: string;
}

export interface TargetDefinition {
  id: string;
  name: string;
  emoji: string;
  cardIds: string[];
  rarity: Rarity;
  description?: string;
}

export interface DeckDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckVisualThemeId;
  cardIds: string[];
  cardPool: Record<string, number>;
  targetIds: string[];
}

export interface ContentCatalog {
  cards: CardDefinition[];
  targets: TargetDefinition[];
  decks: DeckDefinition[];
}

export interface NormalizedContentCatalog extends ContentCatalog {
  cardsById: Record<string, CardDefinition>;
  targetsById: Record<string, TargetDefinition>;
  decksById: Record<string, DeckDefinition>;
}

export interface DeckModelCardEntry {
  cardId: string;
  card: CardDefinition;
  copiesInDeck: number;
  usedByTargets: TargetDefinition[];
}

export interface CardCatalogEntry {
  id: string;
  card: CardDefinition;
  deckIds: string[];
  targetIds: string[];
  copiesByDeckId: Record<string, number>;
  totalCopies: number;
}

export interface DeckModelTargetInstance {
  instanceKey: string;
  instanceIndex: number;
  targetId: string;
  target: TargetDefinition;
}

/**
 * Derived read model used outside the battle runtime.
 * The canonical truth still lives in the normalized catalog definitions.
 */
export interface DeckModel {
  id: string;
  definition: DeckDefinition;
  cards: DeckModelCardEntry[];
  targetDefinitions: TargetDefinition[];
  targetInstances: DeckModelTargetInstance[];
}

export interface RawTargetDefinition {
  id: string;
  name: string;
  emoji: string;
  syllables: string[];
  rarity: string;
  description?: string;
  copies?: number;
}

export interface RawDeckDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckVisualThemeId;
  syllables: Record<string, number>;
  targets: RawTargetDefinition[];
}
