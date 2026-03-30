import { RawDeckDefinition } from "../types";

export const farmDeck: RawDeckDefinition = {
  id: "farm",
  name: "Fazenda",
  description: "Animais comuns. Ideal para começar.",
  emoji: "🚜",
  visualTheme: "harvest",
  syllables: {
    VA: 4,
    CA: 4,
    POR: 3,
    CO: 3,
    GA: 4,
    LI: 3,
    NHA: 3,
    PA: 4,
    TO: 4,
    O: 3,
    VE: 3,
    LHA: 3,
    LO: 3
  },
  targets: [
    {
      id: "vaca",
      name: "VACA",
      emoji: "🐮",
      rarity: "comum",
      syllables: ["VA", "CA"]
    },
    {
      id: "porco",
      name: "PORCO",
      emoji: "🐷",
      rarity: "comum",
      syllables: ["POR", "CO"]
    },
    {
      id: "galinha",
      name: "GALINHA",
      emoji: "🐔",
      rarity: "raro",
      syllables: ["GA", "LI", "NHA"]
    },
    {
      id: "pato",
      name: "PATO",
      emoji: "🦆",
      rarity: "comum",
      syllables: ["PA", "TO"]
    },
    {
      id: "ovelha",
      name: "OVELHA",
      emoji: "🐑",
      rarity: "raro",
      syllables: ["O", "VE", "LHA"]
    },
    {
      id: "cavalo",
      name: "CAVALO",
      emoji: "🐴",
      rarity: "raro",
      syllables: ["CA", "VA", "LO"]
    }
  ]
};
