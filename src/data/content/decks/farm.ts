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
    LO: 3,
  },
  targets: [
    { id: "vaca", name: "VACA", syllables: ["VA", "CA"], rarity: "comum", emoji: "🐮" },
    { id: "porco", name: "PORCO", syllables: ["POR", "CO"], rarity: "comum", emoji: "🐷" },
    { id: "galinha", name: "GALINHA", syllables: ["GA", "LI", "NHA"], rarity: "raro", emoji: "🐔" },
    { id: "pato", name: "PATO", syllables: ["PA", "TO"], rarity: "comum", emoji: "🦆" },
    { id: "ovelha", name: "OVELHA", syllables: ["O", "VE", "LHA"], rarity: "raro", emoji: "🐑" },
    { id: "cavalo", name: "CAVALO", syllables: ["CA", "VA", "LO"], rarity: "raro", emoji: "🐴" },
  ],
};
