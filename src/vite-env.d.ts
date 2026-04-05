/// <reference types="vite/client" />

declare const __APP_BUILD__: string;

interface Window {
  __SPELLCAST_BUILD__?: string;
  __battleDev?: {
    snapshot: () => unknown;
    logSnapshot: () => void;
    dumpDebugCapture: () => void;
    clearDebugCapture: () => void;
    clearAnimationFallbacks: () => void;
    damage: (side: "player" | "enemy", amount?: number) => void;
    damagePlayer: (amount?: number) => void;
    damageEnemy: (amount?: number) => void;
    kill: (side: "player" | "enemy") => void;
    help: () => string;
  };
}
