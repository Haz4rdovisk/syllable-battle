import { RawDeckDefinition } from "../types";

export const fazendaDeck: RawDeckDefinition = {
  id: "fazenda",
  name: "Fazenda",
  description: "Animais comuns. Ideal para começar.",
  emoji: "🚜",
  superclass: "animal",
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
  targetIds: ["vaca", "porco", "galinha", "pato", "ovelha", "cavalo"]
};
