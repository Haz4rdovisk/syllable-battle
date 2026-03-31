import { RawDeckDefinition } from "../types";

export const desertoDeck: RawDeckDefinition = {
  id: "deserto",
  name: "Deserto",
  description: "Criaturas do deserto. Precisas e resistentes.",
  emoji: "🏜️",
  visualTheme: "dune",
  syllables: {
    CA: 4,
    ME: 3,
    LO: 3,
    CO: 4,
    BRA: 3,
    A: 3,
    BU: 3,
    TRE: 3,
    FE: 3,
    NE: 3,
    ES: 3,
    COR: 3,
    PI: 3,
    AO: 3,
    LA: 3,
    GAR: 3,
    TO: 4
  },
  targetIds: ["camelo", "cobra", "abutre", "feneco", "escorpiao", "lagarto"]
};
