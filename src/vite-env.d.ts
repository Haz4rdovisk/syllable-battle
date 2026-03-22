/// <reference types="vite/client" />

interface Window {
  __battleDev?: {
    damage: (side: "player" | "enemy", amount?: number) => void;
    damagePlayer: (amount?: number) => void;
    damageEnemy: (amount?: number) => void;
    kill: (side: "player" | "enemy") => void;
    help: () => string;
  };
}
