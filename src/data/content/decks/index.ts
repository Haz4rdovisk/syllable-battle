import { desertDeck } from "./desert";
import { farmDeck } from "./farm";
import { forestDeck } from "./forest";
import { oceanDeck } from "./ocean";
import { RawDeckDefinition } from "../types";

export interface RawDeckCatalogEntry {
  id: string;
  exportName: string;
  filePath: string;
  deck: RawDeckDefinition;
}

export const rawDeckCatalogEntries: RawDeckCatalogEntry[] = [
  {
    id: "farm",
    exportName: "farmDeck",
    filePath: "src/data/content/decks/farm.ts",
    deck: farmDeck,
  },
  {
    id: "ocean",
    exportName: "oceanDeck",
    filePath: "src/data/content/decks/ocean.ts",
    deck: oceanDeck,
  },
  {
    id: "forest",
    exportName: "forestDeck",
    filePath: "src/data/content/decks/forest.ts",
    deck: forestDeck,
  },
  {
    id: "desert",
    exportName: "desertDeck",
    filePath: "src/data/content/decks/desert.ts",
    deck: desertDeck,
  },
];

export function getRawDeckCatalogEntry(deckId: string) {
  return rawDeckCatalogEntries.find((entry) => entry.id === deckId) ?? null;
}

export const rawDeckCatalog = rawDeckCatalogEntries.map((entry) => entry.deck);
