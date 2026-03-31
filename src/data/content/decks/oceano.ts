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
  targetIds: ["baleia", "peixe", "tubarao", "polvo", "siri", "camarao"]
};
