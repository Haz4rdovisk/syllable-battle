import { RawDeckDefinition } from "../types";

export const oceanDeck: RawDeckDefinition = {
  id: "ocean",
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
    MA: 3,
  },
  targets: [
    { id: "baleia", name: "BALEIA", syllables: ["BA", "LEI", "A"], rarity: "raro", emoji: "🐋" },
    { id: "peixe", name: "PEIXE", syllables: ["PEI", "XE"], rarity: "comum", emoji: "🐟" },
    { id: "tubarao", name: "TUBARAO", syllables: ["TU", "BA", "RAO"], rarity: "épico", emoji: "🦈" },
    { id: "polvo", name: "POLVO", syllables: ["PO", "LVO"], rarity: "raro", emoji: "🐙" },
    { id: "siri", name: "SIRI", syllables: ["SI", "RI"], rarity: "comum", emoji: "🦀" },
    { id: "camarao", name: "CAMARAO", syllables: ["CA", "MA", "RAO"], rarity: "raro", emoji: "🦐" },
  ],
};
