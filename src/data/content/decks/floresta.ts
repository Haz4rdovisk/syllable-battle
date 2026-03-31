import { RawDeckDefinition } from "../types";

export const florestaDeck: RawDeckDefinition = {
  id: "floresta",
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
    RE: 3
  },
  targets: [
    {
      id: "lobo",
      name: "LOBO",
      emoji: "🐺",
      rarity: "comum",
      syllables: ["LO", "BO"]
    },
    {
      id: "raposa",
      name: "RAPOSA",
      emoji: "🦊",
      rarity: "raro",
      syllables: ["RA", "PO", "SA"]
    },
    {
      id: "esquilo",
      name: "ESQUILO",
      emoji: "🐿️",
      rarity: "raro",
      syllables: ["ES", "QUI", "LO"]
    },
    {
      id: "urso",
      name: "URSO",
      emoji: "🐻",
      rarity: "raro",
      syllables: ["UR", "SO"]
    },
    {
      id: "coruja",
      name: "CORUJA",
      emoji: "🦉",
      rarity: "raro",
      syllables: ["CO", "RU", "JA"]
    },
    {
      id: "jacare",
      name: "JACARE",
      emoji: "🐊",
      rarity: "raro",
      syllables: ["JA", "CA", "RE"]
    }
  ]
};
