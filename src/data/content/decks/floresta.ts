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
  targetIds: ["lobo", "raposa", "esquilo", "urso", "coruja", "jacare"]
};
