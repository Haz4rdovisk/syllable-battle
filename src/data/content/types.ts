export type DeckVisualThemeId = "harvest" | "abyss" | "canopy" | "dune";

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
