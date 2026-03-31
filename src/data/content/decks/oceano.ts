import { RawDeckDefinition } from "../types";

export const oceanoDeck: RawDeckDefinition = {
  id: "oceano",
  name: "Oceano",
  description: "Criaturas marinhas. Alto dano.",
  emoji: "🔱",
  visualTheme: "abyss",
  syllables: {
    BA: 4,
    LEI: 3,
    A: 3,
    PEI: 4,
    XE: 4,
    TU: 3,
    RAO: 3,
    PO: 3,
    LVO: 3,
    SI: 3,
    RI: 3,
    CA: 3,
    MA: 3
  },
  targets: [
    {
      id: "baleia",
      name: "BALEIA",
      emoji: "🐋",
      rarity: "raro",
      syllables: ["BA", "LEI", "A"]
    },
    {
      id: "peixe",
      name: "PEIXE",
      emoji: "🐟",
      rarity: "comum",
      syllables: ["PEI", "XE"]
    },
    {
      id: "tubarao",
      name: "TUBARAO",
      emoji: "🦈",
      rarity: "épico",
      syllables: ["TU", "BA", "RAO"]
    },
    {
      id: "polvo",
      name: "POLVO",
      emoji: "🐙",
      rarity: "raro",
      syllables: ["PO", "LVO"]
    },
    {
      id: "siri",
      name: "SIRI",
      emoji: "🦀",
      rarity: "comum",
      syllables: ["SI", "RI"]
    },
    {
      id: "camarao",
      name: "CAMARAO",
      emoji: "🦐",
      rarity: "raro",
      syllables: ["CA", "MA", "RAO"]
    }
  ]
};
