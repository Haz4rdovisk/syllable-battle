import { RawDeckDefinition } from "../types";

export const forestDeck: RawDeckDefinition = {
  id: "forest",
  name: "Floresta",
  description: "Animais ágeis. Equilibrado.",
  emoji: "🌿",
  visualTheme: "canopy",
  syllables: {
    LO: 4,
    BO: 4,
    RA: 4,
    PO: 4,
    SA: 3,
    ES: 3,
    QUI: 3,
    UR: 3,
    SO: 3,
    CO: 3,
    RU: 3,
    JA: 3,
    CA: 3,
    RE: 3,
  },
  targets: [
    { id: "lobo", name: "LOBO", syllables: ["LO", "BO"], rarity: "comum", emoji: "🐺" },
    { id: "raposa", name: "RAPOSA", syllables: ["RA", "PO", "SA"], rarity: "raro", emoji: "🦊" },
    { id: "esquilo", name: "ESQUILO", syllables: ["ES", "QUI", "LO"], rarity: "raro", emoji: "🐿️" },
    { id: "urso", name: "URSO", syllables: ["UR", "SO"], rarity: "raro", emoji: "🐻" },
    { id: "coruja", name: "CORUJA", syllables: ["CO", "RU", "JA"], rarity: "raro", emoji: "🦉" },
    { id: "jacare", name: "JACARE", syllables: ["JA", "CA", "RE"], rarity: "raro", emoji: "🐊" },
  ],
};
