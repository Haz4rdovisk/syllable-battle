import { fazendaDeck } from "./fazenda";
import { oceanoDeck } from "./oceano";
import { florestaDeck } from "./floresta";
import { desertoDeck } from "./deserto";
import { RawDeckDefinition } from "../types";

export interface RawDeckCatalogEntry {
  id: string;
  exportName: string;
  filePath: string;
  deck: RawDeckDefinition;
}

export const rawDeckCatalogEntries: RawDeckCatalogEntry[] = [
  {
    id: "fazenda",
    exportName: "fazendaDeck",
    filePath: "src/data/content/decks/fazenda.ts",
    deck: fazendaDeck,
  },
  {
    id: "oceano",
    exportName: "oceanoDeck",
    filePath: "src/data/content/decks/oceano.ts",
    deck: oceanoDeck,
  },
  {
    id: "floresta",
    exportName: "florestaDeck",
    filePath: "src/data/content/decks/floresta.ts",
    deck: florestaDeck,
  },
  {
    id: "deserto",
    exportName: "desertoDeck",
    filePath: "src/data/content/decks/deserto.ts",
    deck: desertoDeck,
  },
];

export function getRawDeckCatalogEntry(deckId: string) {
  return rawDeckCatalogEntries.find((entry) => entry.id === deckId) ?? null;
}

export const rawDeckCatalog = rawDeckCatalogEntries.map((entry) => entry.deck);
