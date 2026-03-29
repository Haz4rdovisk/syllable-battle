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

export interface RawTargetDefinition {
  id: string;
  name: string;
  emoji: string;
  syllables: string[];
  rarity: string;
  description?: string;
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
