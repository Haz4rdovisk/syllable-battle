/// <reference types="vite/client" />

declare const __APP_BUILD__: string;

interface Window {
  __battleDev?: {
    snapshot: () => unknown;
    logSnapshot: () => void;
    damage: (side: "player" | "enemy", amount?: number) => void;
    damagePlayer: (amount?: number) => void;
    damageEnemy: (amount?: number) => void;
    kill: (side: "player" | "enemy") => void;
    help: () => string;
  };
}
