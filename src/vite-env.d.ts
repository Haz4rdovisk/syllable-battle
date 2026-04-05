/// <reference types="vite/client" />

declare const __APP_BUILD__: string;

interface Window {
  __SPELLCAST_BUILD__?: string;
  __SPELLCAST_NATIVE_APP__?: boolean;
  __SPELLCAST_NATIVE_LOADING_PENDING__?: boolean;
  __SPELLCAST_MENU_TITLE_READY__?: boolean;
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
