import React, { useState } from "react";
import { Button } from "../ui/button";
import { motion } from "motion/react";
import { ChevronLeft, Copy, Check, Play, Loader2, ScrollText, Swords, Crown, DoorOpen, Star } from "lucide-react";
import { nanoid } from "nanoid";
import { GameMode, BattleSide, PlayerProfile, normalizePlayerName } from "../../types/game";
import { BattleRoomState } from "../../lib/battleRoomSession";
import { DECK_LOBBY_THEME_ART } from "../../data/content/themes";
import { DeckVisualThemeId } from "../../data/content/types";

interface LobbyProps {
  mode?: GameMode;
  onBack: () => void;
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  localProfile: PlayerProfile;
  activeRoomId?: string;
  localSide?: BattleSide;
  roomState?: BattleRoomState | null;
  onStartRoom?: () => void;
  onOpenDeckSelection?: (side: "player" | "enemy") => void;
  localDeckId?: string | null;
  remoteDeckId?: string | null;
  localDeckName?: string;
  remoteDeckName?: string;
  localDeckEmoji?: string;
  remoteDeckEmoji?: string;
  localDeckTheme?: DeckVisualThemeId;
  remoteDeckTheme?: DeckVisualThemeId;
}

interface ParticipantCardProps {
  avatar: React.ReactNode;
  name: string;
  role: string;
  tone: "local" | "remote";
  muted?: boolean;
  layout?: "horizontal" | "vertical";
  mobileInline?: boolean;
  desktopInline?: boolean;
  showLevelBadge?: boolean;
  theme?: DeckVisualThemeId;
}

type LobbyButtonId = "back" | "copy" | "create" | "join" | "start";


const participantToneClassName: Record<ParticipantCardProps["tone"], string> = {
  local: "border-[#2e7d32]/22 bg-[#f4fbf4] text-[#5b2408]",
  remote: "border-[#8f5f12]/18 bg-[#fff8ef] text-[#6b4723]",
};

const participantThemeClasses: Record<DeckVisualThemeId, string> = {
  harvest: "border-[#d89a35]/24 bg-[#d89a35]/12 text-[#5b2408]",
  abyss: "border-[#4c95c4]/24 bg-[#4c95c4]/12 text-[#1f4a66]",
  canopy: "border-[#2f9a56]/24 bg-[#2f9a56]/12 text-[#5b2408]",
  dune: "border-[#d9a22b]/24 bg-[#d9a22b]/12 text-[#5b2408]",
};

const lobbyTouchPressedClassName = {
  gold:
    "[@media(pointer:coarse)]:translate-y-[4px] [@media(pointer:coarse)]:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)]",
  green:
    "[@media(pointer:coarse)]:translate-y-[4px] [@media(pointer:coarse)]:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]",
  amber:
    "[@media(pointer:coarse)]:translate-y-[4px] [@media(pointer:coarse)]:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)]",
  blue:
    "[@media(pointer:coarse)]:translate-y-[4px] [@media(pointer:coarse)]:shadow-[0_3px_0_#28597d,0_10px_16px_rgba(35,74,110,0.18)]",
  paper:
    "[@media(pointer:coarse)]:translate-y-[3px] [@media(pointer:coarse)]:shadow-[0_1px_0_#cdb68b,0_5px_8px_rgba(0,0,0,0.05)]",
} as const;

const PlayerLevelBadge: React.FC = () => (
  <div className="relative inline-flex min-h-[3.4rem] min-w-[9.9rem] shrink-0 items-center overflow-hidden rounded-full border border-[#d6b66e] bg-[linear-gradient(180deg,rgba(255,250,236,0.98),rgba(236,205,132,0.96))] px-4 py-2 text-[#7a5526] shadow-[0_12px_22px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] [@media(pointer:coarse)_and_(max-height:480px)]:min-h-[2.55rem] [@media(pointer:coarse)_and_(max-height:480px)]:min-w-[7rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:py-1.25">
    <span className="pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-white/70" />
    <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/28" />
    <div className="relative flex w-full items-center gap-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.75">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c99d46] bg-[radial-gradient(circle_at_top,#fff4cf,#e1b75d)] text-[#8a5c19] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] [@media(pointer:coarse)_and_(max-height:480px)]:h-6 [@media(pointer:coarse)_and_(max-height:480px)]:w-6">
        <Star className="h-4 w-4 fill-current [@media(pointer:coarse)_and_(max-height:480px)]:h-3 [@media(pointer:coarse)_and_(max-height:480px)]:w-3" />
      </span>
      <span className="flex min-w-0 flex-col justify-center self-center leading-none">
        <span className="text-[0.54rem] font-black uppercase tracking-[0.24em] text-[#9a6f2f]/80 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.42rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.14em]">
          Duelista
        </span>
        <span className="mt-[2px] text-[1rem] font-black uppercase tracking-[0.14em] leading-none [@media(pointer:coarse)_and_(max-height:480px)]:mt-[1px] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.08em]">
          Nivel 1
        </span>
      </span>
    </div>
  </div>
);

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  avatar,
  name,
  role,
  tone,
  muted = false,
  layout = "horizontal",
  mobileInline = false,
  desktopInline = false,
  showLevelBadge = false,
  theme,
}) => {
  const levelBadge = <PlayerLevelBadge />;
  const themeClasses = theme ? participantThemeClasses[theme] : participantToneClassName[tone];

  const textureOverlay = theme ? (
    <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-[0.22] mix-blend-soft-light" />
  ) : null;

  if (layout === "vertical" && mobileInline && showLevelBadge) {
    return (
      <div
        className={`mx-auto flex min-w-[11.5rem] flex-col items-center gap-2.5 rounded-[1.2rem] border px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)]:grid [@media(pointer:coarse)]:h-[3.55rem] [@media(pointer:coarse)]:w-full [@media(pointer:coarse)]:min-w-0 [@media(pointer:coarse)]:grid-cols-[auto_minmax(0,1fr)_auto] [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:gap-x-[0.6rem] [@media(pointer:coarse)]:gap-y-0 [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-[0.85rem] [@media(pointer:coarse)]:py-[0.55rem] ${participantToneClassName[tone]} ${muted ? "opacity-55" : ""}`}
      >
        <div className="flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center rounded-[1.15rem] border-2 border-current/18 bg-white/72 text-[2.55rem] shadow-[0_10px_18px_rgba(0,0,0,0.08)] [@media(pointer:coarse)]:h-[2.2rem] [@media(pointer:coarse)]:w-[2.2rem] [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:text-[1.8rem]">
          {avatar}
        </div>
        <div className="min-w-0 [@media(pointer:coarse)]:text-left">
          <div className="truncate font-serif text-[1.2rem] font-black uppercase tracking-[0.04em] [@media(pointer:coarse)]:text-[0.86rem] [@media(pointer:coarse)]:whitespace-nowrap">
            {name}
          </div>
        </div>
        <div className="w-full [@media(pointer:coarse)]:w-auto [@media(pointer:coarse)]:justify-self-end [@media(pointer:coarse)]:scale-[0.8] [@media(pointer:coarse)]:origin-right">
          {levelBadge}
        </div>
      </div>
    );
  }

  if (layout === "horizontal" && showLevelBadge && desktopInline) {
    return (
      <div
        className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)]:gap-2 [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-2 ${participantToneClassName[tone]} ${muted ? "opacity-55" : ""}`}
      >
        <div className="flex h-[3.7rem] w-[3.7rem] shrink-0 items-center justify-center rounded-[1.05rem] border-2 border-current/18 bg-white/72 text-[1.85rem] shadow-[0_10px_18px_rgba(0,0,0,0.08)] [@media(pointer:coarse)]:h-[2.55rem] [@media(pointer:coarse)]:w-[2.55rem] [@media(pointer:coarse)]:rounded-[0.82rem] [@media(pointer:coarse)]:text-[1.35rem]">
          {avatar}
        </div>
        <div className="min-w-0 text-left">
          <div className="truncate font-serif text-[1.05rem] font-black uppercase tracking-[0.04em] [@media(pointer:coarse)]:text-[0.9rem]">
            {name}
          </div>
          <div className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.24em] text-current/70 [@media(pointer:coarse)]:mt-0.2 [@media(pointer:coarse)]:text-[0.5rem] [@media(pointer:coarse)]:tracking-[0.12em]">
            {role}
          </div>
        </div>
        <div className="justify-self-end">
          {levelBadge}
        </div>
      </div>
    );
  }

  if (layout === "horizontal" && showLevelBadge) {
    return (
      <div
        className={`relative overflow-hidden flex min-w-0 flex-col items-center justify-center gap-2.5 rounded-[1.2rem] border px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)]:grid [@media(pointer:coarse)]:grid-cols-[auto_minmax(0,1fr)_auto] [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:gap-2 [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:text-left ${mobileInline ? "[@media(pointer:coarse)]:py-1.5" : "[@media(pointer:coarse)]:py-2"} ${themeClasses} ${muted ? "opacity-55" : ""}`}
      >
        {textureOverlay}
        <div className="flex h-[3.7rem] w-[3.7rem] shrink-0 items-center justify-center rounded-[1.05rem] border-2 border-current/18 bg-white/72 text-[1.85rem] shadow-[0_10px_18px_rgba(0,0,0,0.08)] [@media(pointer:coarse)]:h-[2.55rem] [@media(pointer:coarse)]:w-[2.55rem] [@media(pointer:coarse)]:rounded-[0.82rem] [@media(pointer:coarse)]:text-[1.35rem]">
          {avatar}
        </div>
        <div className="min-w-0 text-center [@media(pointer:coarse)]:text-left">
          <div className="truncate font-serif text-[1.05rem] font-black uppercase tracking-[0.04em] [@media(pointer:coarse)]:text-[0.9rem]">
            {name}
          </div>
          <div className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.24em] text-current/70 [@media(pointer:coarse)]:mt-0.2 [@media(pointer:coarse)]:text-[0.5rem] [@media(pointer:coarse)]:tracking-[0.12em]">
            {role}
          </div>
        </div>
        <div className="justify-self-center [@media(pointer:coarse)]:justify-self-end">
          {levelBadge}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 rounded-[1.2rem] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-2 ${participantToneClassName[tone]} ${muted ? "opacity-55" : ""} ${layout === "vertical"
        ? `mx-auto flex w-[11.4rem] flex-col items-center gap-3 py-4.5 text-center [@media(pointer:coarse)]:w-[5.7rem] [@media(pointer:coarse)]:gap-[0.7rem] [@media(pointer:coarse)]:py-[1rem] ${mobileInline
          ? "[@media(pointer:coarse)]:h-[3.55rem] [@media(pointer:coarse)]:w-fit [@media(pointer:coarse)]:min-w-[8.9rem] [@media(pointer:coarse)]:max-w-[9.4rem] [@media(pointer:coarse)]:flex-row [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:justify-center [@media(pointer:coarse)]:gap-[0.55rem] [@media(pointer:coarse)]:px-[0.95rem] [@media(pointer:coarse)]:py-[0.6rem]"
          : ""
        }`
        : "flex items-center gap-3 [@media(pointer:coarse)]:gap-2"
        }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center border-2 border-current/18 bg-white/72 text-[1.85rem] shadow-[0_10px_18px_rgba(0,0,0,0.08)] ${layout === "vertical"
          ? `h-[5.15rem] w-[5.15rem] rounded-[1.4rem] text-[3.15rem] [@media(pointer:coarse)]:h-[2.3rem] [@media(pointer:coarse)]:w-[2.3rem] [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:text-[1.85rem] ${mobileInline ? "[@media(pointer:coarse)]:h-[1.9rem] [@media(pointer:coarse)]:w-[1.9rem] [@media(pointer:coarse)]:rounded-[0.6rem] [@media(pointer:coarse)]:text-[1.55rem]" : ""
          }`
          : "h-[3.7rem] w-[3.7rem] rounded-[1.05rem] [@media(pointer:coarse)]:h-[2.55rem] [@media(pointer:coarse)]:w-[2.55rem] [@media(pointer:coarse)]:rounded-[0.82rem] [@media(pointer:coarse)]:text-[1.35rem]"
          }`}
      >
        {avatar}
      </div>
      <div className={`min-w-0 ${layout === "vertical" ? `w-full text-center ${mobileInline ? "[@media(pointer:coarse)]:w-auto [@media(pointer:coarse)]:text-left" : ""}` : "flex-1"}`}>
        <div
          className={`font-serif text-[1.05rem] font-black uppercase tracking-[0.04em] [@media(pointer:coarse)]:text-[0.9rem] ${layout === "vertical" ? `truncate text-center text-[1.2rem] [@media(pointer:coarse)]:text-[0.9rem] ${mobileInline ? "[@media(pointer:coarse)]:text-left [@media(pointer:coarse)]:text-[0.86rem] [@media(pointer:coarse)]:whitespace-nowrap" : ""}` : "truncate"
            }`}
        >
          {name}
        </div>
        {(role || showLevelBadge) ? (
          <div className={`mt-1 flex items-center gap-2 ${layout === "vertical" ? "justify-center" : "justify-between"} [@media(pointer:coarse)]:mt-0.2 [@media(pointer:coarse)]:gap-1`}>
            {role ? (
              <div className={`text-[0.58rem] font-black uppercase tracking-[0.24em] text-current/70 [@media(pointer:coarse)]:text-[0.5rem] [@media(pointer:coarse)]:tracking-[0.12em] ${layout === "vertical" ? "text-[0.62rem] [@media(pointer:coarse)]:text-[0.5rem]" : ""}`}>
                {role}
              </div>
            ) : <span />}
            {showLevelBadge ? levelBadge : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Lobby: React.FC<LobbyProps> = ({
  mode,
  onBack,
  onCreateRoom,
  onJoinRoom,
  localProfile,
  activeRoomId,
  localSide = "player",
  roomState = null,
  onStartRoom,
  onOpenDeckSelection,
  localDeckId,
  remoteDeckId,
  localDeckName,
  remoteDeckName,
  localDeckEmoji,
  remoteDeckEmoji,
  localDeckTheme,
  remoteDeckTheme,
}) => {
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pressedButtonId, setPressedButtonId] = React.useState<LobbyButtonId | null>(null);
  const pressedButtonRef = React.useRef<LobbyButtonId | null>(null);
  const touchActivatedButtonRef = React.useRef<LobbyButtonId | null>(null);

  const isHost = localSide === "player";
  const opponentConnected = localSide === "player" ? !!roomState?.guest.connected : !!roomState?.host.connected;
  const localDeckReady = !!localDeckId;
  const remoteDeckReady = !!remoteDeckId;
  const roomDecksReady = localDeckReady && remoteDeckReady;
  const canStartActiveRoom = isHost && opponentConnected && roomDecksReady;
  const roomStatusTitle = !localDeckReady
    ? "Escolha seu deck"
    : !opponentConnected
      ? "Aguardando oponente"
      : !remoteDeckReady
        ? "Aguardando deck"
        : "Duelo pronto";
  const roomStatusDotClassName = roomDecksReady && opponentConnected
    ? "bg-emerald-500"
    : localDeckReady
      ? "bg-amber-400"
      : "bg-slate-300";
  const roomStartLabel = !localDeckReady
    ? "Escolha seu deck"
    : !opponentConnected
      ? "Aguardando oponente"
      : !remoteDeckReady
        ? "Aguardando deck"
        : isHost
          ? "Iniciar Duelo"
          : "Aguardando Anfitriao";
  const opponentParticipant = localSide === "player" ? roomState?.guest : roomState?.host;
  const localRoleLabel = isHost ? "Anfitriao" : "Duelista local";
  const localName = normalizePlayerName(localProfile.name);
  const opponentName = opponentConnected ? normalizePlayerName(opponentParticipant?.name ?? "Adversario", "Adversario") : "Aguardando...";
  const opponentAvatar = opponentConnected ? opponentParticipant?.avatar ?? "\u{1F52E}" : <Loader2 className="h-6 w-6 animate-spin text-slate-500" />;
  const localLobbyTheme = mode === "bot" && localDeckTheme ? DECK_LOBBY_THEME_ART[localDeckTheme] : null;
  const remoteLobbyTheme = mode === "bot" && remoteDeckTheme ? DECK_LOBBY_THEME_ART[remoteDeckTheme] : null;
  const localRoomTheme = activeRoomId && localDeckTheme ? DECK_LOBBY_THEME_ART[localDeckTheme] : null;
  const remoteRoomTheme = activeRoomId && remoteDeckTheme && opponentConnected ? DECK_LOBBY_THEME_ART[remoteDeckTheme] : null;

  const clearPressedButton = React.useCallback((buttonId?: LobbyButtonId) => {
    if (buttonId === undefined || pressedButtonRef.current === buttonId) {
      pressedButtonRef.current = null;
    }

    setPressedButtonId((current) => (buttonId === undefined || current === buttonId ? null : current));
  }, []);

  const createButtonPointerDownHandler = React.useCallback(
    (buttonId: LobbyButtonId): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        touchActivatedButtonRef.current = null;
        pressedButtonRef.current = buttonId;
        setPressedButtonId(buttonId);
      },
    [],
  );

  const createButtonPointerUpHandler = React.useCallback(
    (buttonId: LobbyButtonId, action?: () => void): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        if (pressedButtonRef.current === buttonId) {
          touchActivatedButtonRef.current = buttonId;
          action?.();
        }

        clearPressedButton(buttonId);
      },
    [clearPressedButton],
  );

  const createButtonPointerCancelHandler = React.useCallback(
    (buttonId: LobbyButtonId): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        clearPressedButton(buttonId);
      },
    [clearPressedButton],
  );

  const createButtonClickHandler = React.useCallback(
    (buttonId: LobbyButtonId, action?: () => void): React.MouseEventHandler<HTMLButtonElement> =>
      (event) => {
        if (touchActivatedButtonRef.current === buttonId) {
          touchActivatedButtonRef.current = null;
          event.preventDefault();
          return;
        }

        clearPressedButton(buttonId);
        action?.();
      },
    [clearPressedButton],
  );

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      onCreateRoom(nanoid(6).toUpperCase());
      setIsCreating(false);
    }, 1500);
  };

  const handleJoin = () => {
    if (!roomId) return;
    setIsJoining(true);
    setTimeout(() => {
      onJoinRoom(roomId.toUpperCase());
      setIsJoining(false);
    }, 1500);
  };

  const copyRoomId = () => {
    if (!activeRoomId) return;
    navigator.clipboard.writeText(activeRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderRoomDuelistSetupCard = ({
    tone,
    avatar,
    name,
    role,
    deckName,
    deckEmoji,
    theme,
    ready,
    muted = false,
    isRemote = false,
  }: {
    tone: "local" | "remote";
    avatar: React.ReactNode;
    name: string;
    role: string;
    deckName?: string;
    deckEmoji?: string;
    theme: typeof localRoomTheme;
    ready: boolean;
    muted?: boolean;
    isRemote?: boolean;
  }) => {
    const fallbackTone = tone === "local"
      ? "border-[#2e7d32]/18 bg-[#f4fbf4] text-[#5b2408]"
      : "border-[#8f5f12]/18 bg-[#fff8ef] text-[#6b4723]";
    const remoteIsWaitingForConnection = isRemote && !opponentConnected;
    const statusLabel = ready
      ? deckName
      : isRemote
        ? opponentConnected
          ? "Aguardando deck"
          : "Aguardando"
        : "Escolher deck";
    const deckButtonTone = ready && theme
      ? theme.raisedButtonClassName
      : isRemote
        ? "border-[#8f5f12] bg-[#c88a32] text-amber-50 shadow-[0_7px_0_#8f5f12,0_18px_28px_rgba(88,52,8,0.2)]"
        : "border-[#1f7a46] bg-[#2f9a56] text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]";
    const localDeckPressedClassName = ready && theme
      ? lobbyTouchPressedClassName[theme.pressedClassName]
      : lobbyTouchPressedClassName.green;

    return (
      <div
        className={`relative flex h-full min-h-[10.8rem] min-w-0 flex-col justify-center gap-4 overflow-hidden rounded-[1.2rem] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] [@media(pointer:coarse)]:min-h-0 [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-2.25 [@media(pointer:coarse)]:gap-1.75 ${theme ? theme.panelClassName : fallbackTone} ${muted ? "opacity-65" : ""}`}
      >
        {theme ? (
          <>
            <div className="pointer-events-none absolute inset-0 opacity-62 mix-blend-multiply" style={theme.artStyle} />
            <div className={`pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-b-full ${theme.accentClassName}`} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.58),rgba(255,255,255,0.2)_62%,rgba(255,255,255,0.1))]" />
          </>
        ) : null}
        <div className="relative z-10 grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-current/10 bg-white/38 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] [@media(pointer:coarse)]:gap-2.5 [@media(pointer:coarse)]:rounded-[0.78rem] [@media(pointer:coarse)]:px-2.25 [@media(pointer:coarse)]:py-1.75">
          <div className="flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-[1.05rem] border-2 border-current/18 bg-white/72 text-[2rem] shadow-[0_10px_18px_rgba(0,0,0,0.08)] [@media(pointer:coarse)]:h-[2.55rem] [@media(pointer:coarse)]:w-[2.55rem] [@media(pointer:coarse)]:rounded-[0.78rem] [@media(pointer:coarse)]:text-[1.35rem]">
            {avatar}
          </div>
          <div className="min-w-0 text-left">
            <div className="[@media(pointer:coarse)]:truncate font-serif text-[1.12rem] font-black uppercase tracking-[0.04em] text-[#5b2408] [@media(pointer:coarse)]:text-[0.9rem]">
              {name}
            </div>
            <div className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.22em] text-current/65 [@media(pointer:coarse)]:mt-0 [@media(pointer:coarse)]:text-[0.48rem] [@media(pointer:coarse)]:tracking-[0.12em]">
              {role}
            </div>
          </div>
          <div className="origin-right scale-[0.82] justify-self-end [@media(pointer:coarse)]:scale-[0.74]">
            {!remoteIsWaitingForConnection ? <PlayerLevelBadge /> : null}
          </div>
        </div>
        <div className="relative z-10">
          {isRemote ? (
            <div
              className={`group relative flex h-[4rem] w-full select-none items-center justify-center overflow-hidden rounded-[1.2rem] border-[3px] px-5 font-serif text-[1.05rem] font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:rounded-[0.85rem] [@media(pointer:coarse)]:px-1.4 [@media(pointer:coarse)]:text-[0.82rem] ${deckButtonTone}`}
            >
              <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
              <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
              <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[0.95rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.72rem]" />
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-2">
                {ready && deckEmoji ? (
                  <span className="shrink-0 text-[1rem] leading-none [@media(pointer:coarse)]:text-[0.75rem]">{deckEmoji}</span>
                ) : (
                  <ScrollText className="h-5 w-5 shrink-0 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                )}
                <span className="truncate">{statusLabel}</span>
              </span>
            </div>
          ) : (
            <Button
              onClick={createButtonClickHandler("create", () => onOpenDeckSelection?.("player"))}
              onPointerDown={createButtonPointerDownHandler("create")}
              onPointerUp={createButtonPointerUpHandler("create", () => onOpenDeckSelection?.("player"))}
              onPointerCancel={createButtonPointerCancelHandler("create")}
              onPointerLeave={createButtonPointerCancelHandler("create")}
              className={`group relative h-[4rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.2rem] border-[3px] px-5 font-serif text-[1.05rem] font-black uppercase tracking-[0.04em] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:rounded-[0.85rem] [@media(pointer:coarse)]:px-1.4 [@media(pointer:coarse)]:text-[0.82rem] ${deckButtonTone} ${pressedButtonId === "create" ? localDeckPressedClassName : ""}`}
              aria-label={ready ? "Trocar deck multiplayer" : "Escolher deck multiplayer"}
            >
              <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
              <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
              <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[0.95rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.72rem]" />
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-2">
                {ready && deckEmoji ? (
                  <span className="shrink-0 text-[1rem] leading-none [@media(pointer:coarse)]:text-[0.75rem]">{deckEmoji}</span>
                ) : (
                  <ScrollText className="h-5 w-5 shrink-0 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                )}
                <span className="truncate">{statusLabel}</span>
              </span>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ece3d3] p-3 text-[#31271e] no-scrollbar [@media(pointer:coarse)]:p-1.5 sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#fff8ee_0%,#efe4d1_58%,#e2d2bb_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(120,92,64,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,92,64,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-45" />

      <div className="paper-panel relative z-10 h-[min(40rem,calc(100dvh-24px))] w-full max-w-[58rem] overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-4 py-5 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)]:h-[calc(100dvh-10px)] [@media(pointer:coarse)]:min-h-0 [@media(pointer:coarse)]:px-2 [@media(pointer:coarse)]:py-2 sm:px-7 sm:py-7">
        <div className="absolute inset-y-[14px] left-[14px] right-[14px] rounded-[1.4rem] border border-[#d9c8a9] [@media(pointer:coarse)]:top-[8px] [@media(pointer:coarse)]:bottom-[8px] [@media(pointer:coarse)]:left-[8px] [@media(pointer:coarse)]:right-[8px] [@media(pointer:coarse)]:rounded-[1rem] lg:rounded-[1.6rem]" />
        <div className="pointer-events-none absolute bottom-[18px] left-[12px] right-[12px] top-[18px] rounded-[1.25rem] border border-white/32 [@media(pointer:coarse)]:top-[11px] [@media(pointer:coarse)]:bottom-[14px] [@media(pointer:coarse)]:left-[6px] [@media(pointer:coarse)]:right-[6px] [@media(pointer:coarse)]:rounded-[0.9rem] lg:rounded-[1.45rem]" />

        <div className="relative flex h-full flex-col [@media(pointer:coarse)]:gap-1">
          <div className="flex items-center justify-between gap-3 [@media(pointer:coarse)]:translate-y-[0.45rem] [@media(pointer:coarse)]:gap-2 [@media(pointer:coarse)]:px-[0.55rem]">
            <Button
              variant="ghost"
              onClick={createButtonClickHandler("back", onBack)}
              onPointerDown={createButtonPointerDownHandler("back")}
              onPointerUp={createButtonPointerUpHandler("back", onBack)}
              onPointerCancel={createButtonPointerCancelHandler("back")}
              onPointerLeave={createButtonPointerCancelHandler("back")}
              className={`group relative flex h-[3.2rem] w-[8.6rem] shrink-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden rounded-[1.15rem] border-[2px] border-[#8f5f12] bg-[#f0dfc4] px-3 font-serif text-[0.74rem] font-black uppercase tracking-[0.08em] text-[#6b4723] shadow-[0_5px_0_#8f5f12,0_12px_22px_rgba(88,52,8,0.16)] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[0_7px_0_#8f5f12,0_16px_26px_rgba(88,52,8,0.2)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)] [@media(pointer:coarse)]:h-[2.08rem] [@media(pointer:coarse)]:w-[5.15rem] [@media(pointer:coarse)]:rounded-[0.78rem] [@media(pointer:coarse)]:gap-[0.42rem] [@media(pointer:coarse)]:px-[1.05rem] [@media(pointer:coarse)]:text-[0.4rem] ${pressedButtonId === "back" ? lobbyTouchPressedClassName.gold : ""}`}
            >
              <span className="pointer-events-none absolute inset-[4px] rounded-[0.9rem] border border-white/24 [@media(pointer:coarse)]:inset-[2px] [@media(pointer:coarse)]:rounded-[0.6rem]" />
              <ChevronLeft className="relative z-10 h-4 w-4 [@media(pointer:coarse)]:h-[0.7rem] [@media(pointer:coarse)]:w-[0.7rem]" />
              <span className="relative z-10">Voltar</span>
            </Button>

            <div className="flex flex-1 flex-col items-center text-center">
              <span className="mt-1 font-serif text-[2rem] font-black uppercase leading-none text-[#5b2408] [@media(pointer:coarse)]:mt-0.5 [@media(pointer:coarse)]:text-[1.45rem] sm:text-[2.25rem]">
                {activeRoomId ? "Sala de Duelo" : (mode === "bot" ? "Jogar Solo" : "Multiplayer")}
              </span>
            </div>

            <div
              className={`flex h-[3.2rem] shrink-0 items-center justify-center [@media(pointer:coarse)]:h-[2.55rem] ${activeRoomId
                ? "w-[10.2rem] [@media(pointer:coarse)]:w-[7.7rem]"
                : (mode === "bot" ? "w-[8.2rem] [@media(pointer:coarse)]:w-[6.2rem]" : "w-[7.2rem] [@media(pointer:coarse)]:w-[5.5rem]")
                }`}
            >
              <span className="inline-flex min-w-full items-center justify-center gap-2.5 rounded-full border border-[#c9b79a] bg-[#fff8ee] px-3.5 py-1.5 text-center text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#7a6146] shadow-[0_8px_16px_rgba(0,0,0,0.05)] [@media(pointer:coarse)]:gap-1.25 [@media(pointer:coarse)]:px-2.25 [@media(pointer:coarse)]:py-1 [@media(pointer:coarse)]:text-[0.42rem] [@media(pointer:coarse)]:tracking-[0.08em]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${activeRoomId ? roomStatusDotClassName : (mode === "bot" ? "bg-amber-500" : "bg-[#6aa36d]")}`} />
                {activeRoomId ? roomStatusTitle : (mode === "bot" ? "Singleplayer" : "Online")}
              </span>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 items-center [@media(pointer:coarse)]:mt-0 [@media(pointer:coarse)]:items-start [@media(pointer:coarse)]:pt-[0.9rem] [@media(pointer:coarse)]:pb-[0.25rem]">
            <div className="flex h-full w-full flex-col rounded-[1.55rem] border border-[#d8c9b0] bg-white/38 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] [@media(pointer:coarse)]:mx-auto [@media(pointer:coarse)]:h-[calc(100%-0.7rem)] [@media(pointer:coarse)]:w-[calc(100%-1rem)] [@media(pointer:coarse)]:rounded-[1rem] [@media(pointer:coarse)]:px-[1.2rem] [@media(pointer:coarse)]:py-[1rem] sm:px-6 sm:py-6">
              {activeRoomId ? (
                <div className="flex h-full flex-col justify-between gap-3 [@media(pointer:coarse)]:gap-2">
                  <div className="space-y-2 text-center [@media(pointer:coarse)]:space-y-1">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d8b97d] bg-[#fff5dd] px-3 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#8a6428] shadow-[0_10px_20px_rgba(0,0,0,0.05)] [@media(pointer:coarse)]:-translate-y-[0.5rem] [@media(pointer:coarse)]:gap-1.5 [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-1 [@media(pointer:coarse)]:text-[0.42rem]">
                      <Crown className="h-3.5 w-3.5 [@media(pointer:coarse)]:h-3 [@media(pointer:coarse)]:w-3" />
                      {isHost ? "Voce controla a sala" : "Aguardando anfitriao"}
                    </div>
                    <div className="rounded-[1.15rem] border border-[#ceb991] bg-[#fff6e8] px-4 py-2.5 shadow-inner [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-[2.25rem] [@media(pointer:coarse)]:flex-col [@media(pointer:coarse)]:justify-center [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:px-2.5 [@media(pointer:coarse)]:py-0">
                      <div className="text-[0.5rem] font-black uppercase tracking-[0.26em] text-[#9a7f5c] [@media(pointer:coarse)]:hidden">
                        Codigo da sala
                      </div>
                      <div className="mt-1.5 flex items-center justify-center gap-2.5 [@media(pointer:coarse)]:mt-0 [@media(pointer:coarse)]:gap-1.75">
                        <span className="font-serif text-[2.25rem] font-black tracking-[0.1em] text-[#5b2408] [@media(pointer:coarse)]:text-[1.1rem] [@media(pointer:coarse)]:tracking-[0.08em] sm:text-[2.55rem]">
                          {activeRoomId}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={createButtonClickHandler("copy", copyRoomId)}
                          onPointerDown={createButtonPointerDownHandler("copy")}
                          onPointerUp={createButtonPointerUpHandler("copy", copyRoomId)}
                          onPointerCancel={createButtonPointerCancelHandler("copy")}
                          onPointerLeave={createButtonPointerCancelHandler("copy")}
                          className={`h-[2.55rem] w-[2.55rem] touch-manipulation select-none rounded-full border border-[#cdb68b] bg-white/80 text-[#7a5c3f] shadow-[0_2px_0_#cdb68b,0_6px_10px_rgba(0,0,0,0.06)] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:shadow-[0_4px_0_#cdb68b,0_8px_14px_rgba(0,0,0,0.07)] [@media(hover:hover)]:active:translate-y-[3px] [@media(hover:hover)]:active:shadow-[0_1px_0_#cdb68b,0_5px_8px_rgba(0,0,0,0.05)] [@media(pointer:coarse)]:h-[1.55rem] [@media(pointer:coarse)]:w-[1.55rem] ${pressedButtonId === "copy" ? lobbyTouchPressedClassName.paper : ""}`}
                        >
                          {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 [@media(pointer:coarse)]:gap-1.75">
                    {renderRoomDuelistSetupCard({
                      tone: "local",
                      avatar: localProfile.avatar,
                      name: localName,
                      role: localRoleLabel,
                      deckName: localDeckName,
                      deckEmoji: localDeckEmoji,
                      theme: localRoomTheme,
                      ready: localDeckReady,
                    })}
                    <div className="relative flex h-full min-h-[10.8rem] w-[4.1rem] items-center justify-center [@media(pointer:coarse)]:min-h-0 [@media(pointer:coarse)]:w-[2.05rem]">
                      <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#8f5f12]/12 md:block" />
                      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#8f5f12]/12 md:hidden" />
                      <div className="relative z-10 flex h-[3.15rem] w-[3.15rem] items-center justify-center rounded-full border border-[#d7c19a] bg-[#f8ecd8] text-[#8a6428] shadow-inner [@media(pointer:coarse)]:h-[2.05rem] [@media(pointer:coarse)]:w-[2.05rem]">
                      <Swords className="h-5 w-5 [@media(pointer:coarse)]:h-3.5 [@media(pointer:coarse)]:w-3.5" />
                      </div>
                    </div>
                    {renderRoomDuelistSetupCard({
                      tone: "remote",
                      avatar: opponentAvatar,
                      name: opponentName,
                      role: opponentConnected ? "Conectado" : "Sem resposta",
                      deckName: remoteDeckName,
                      deckEmoji: remoteDeckEmoji,
                      theme: remoteRoomTheme,
                      ready: remoteDeckReady && opponentConnected,
                      muted: !opponentConnected,
                      isRemote: true,
                    })}
                  </div>

                  <div className="space-y-3 [@media(pointer:coarse)]:space-y-2">
                    <Button
                      onClick={createButtonClickHandler("start", onStartRoom)}
                      onPointerDown={createButtonPointerDownHandler("start")}
                      onPointerUp={createButtonPointerUpHandler("start", onStartRoom)}
                      onPointerCancel={createButtonPointerCancelHandler("start")}
                      onPointerLeave={createButtonPointerCancelHandler("start")}
                      disabled={!canStartActiveRoom}
                      className={`group relative h-[4.2rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.3rem] border-[3px] border-[#1f7a46] bg-[#2f9a56] px-5 font-serif text-[1.15rem] font-black text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:[@media(hover:hover)]:hover:translate-y-0 disabled:[@media(hover:hover)]:hover:bg-[#2f9a56] disabled:[@media(hover:hover)]:hover:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] disabled:[@media(hover:hover)]:active:translate-y-0 disabled:[@media(hover:hover)]:active:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] [@media(pointer:coarse)]:h-[2.95rem] [@media(pointer:coarse)]:rounded-[0.95rem] [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:text-[0.82rem] ${pressedButtonId === "start" ? lobbyTouchPressedClassName.green : ""}`}
                    >
                      <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
                      <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
                      <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[1rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.75rem]" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Play className="h-5 w-5 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                        {roomStartLabel}
                      </span>
                    </Button>
                    {!opponentConnected && !isHost ? (
                      <div className="text-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#8d7961] [@media(pointer:coarse)]:text-[0.5rem] [@media(pointer:coarse)]:tracking-[0.1em]">
                        Somente o anfitriao abre a proxima etapa.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className={`flex h-full flex-col justify-between gap-4 [@media(pointer:coarse)]:gap-3 ${mode === "bot" ? "[@media(pointer:coarse)]:justify-start [@media(pointer:coarse)]:gap-[0.8rem]" : ""}`}>
                  <div className={`grid flex-1 grid-cols-1 gap-5 [@media(pointer:coarse)]:gap-[0.8rem] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch ${mode === "bot" ? "[@media(pointer:coarse)]:gap-[0.7rem]" : ""}`}>
                    {/* Coluna 1: SEU LADO */}
                    <div className={`relative flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border transition-all duration-300 px-4 pt-4 pb-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:min-h-[10rem] [@media(pointer:coarse)]:rounded-[0.95rem] [@media(pointer:coarse)]:px-[1.1rem] [@media(pointer:coarse)]:pt-[0.7rem] [@media(pointer:coarse)]:pb-[0.9rem] ${localLobbyTheme
                      ? localLobbyTheme.panelClassName
                      : "border-[#d2c1a1] bg-[#fff9ef]"
                      } text-[#5b2408] ${mode === "bot" ? "[@media(pointer:coarse)]:min-h-[10.2rem] [@media(pointer:coarse)]:px-[0.9rem] [@media(pointer:coarse)]:pt-[0.7rem] [@media(pointer:coarse)]:pb-[1.2rem]" : ""}`}>
                      {localLobbyTheme ? (
                        <>
                          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply" style={localLobbyTheme.artStyle} />
                          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-soft-light" />
                          <div className={`pointer-events-none absolute inset-x-5 top-0 h-[3px] rounded-b-full ${localLobbyTheme.accentClassName}`} />
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.5),rgba(255,255,255,0.18)_58%,rgba(255,255,255,0.08))]" />
                        </>
                      ) : null}
                      <div className={`relative z-10 grid h-full grid-rows-[auto_1fr_auto] ${mode === "bot" ? "[@media(pointer:coarse)]:grid-rows-[auto_1fr_auto] [@media(pointer:coarse)]:content-start [@media(pointer:coarse)]:gap-[0.55rem]" : ""}`}>
                        <div className={`flex flex-row items-center justify-center gap-4 text-left ${mode === "bot" ? "md:flex-row md:items-center md:gap-4 md:text-left" : "md:flex-col md:items-center md:gap-2 md:text-center"} ${mode === "bot" ? "[@media(pointer:coarse)]:gap-[0.8rem]" : ""}`}>
                          <div className={`flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center rounded-[0.9rem] border-2 shadow-[0_12px_20px_rgba(0,0,0,0.07)] transition-all duration-300 [@media(pointer:coarse)]:h-[2.4rem] [@media(pointer:coarse)]:w-[2.4rem] [@media(pointer:coarse)]:rounded-[0.75rem] md:h-[3.9rem] md:w-[3.9rem] md:rounded-[1.1rem] ${localLobbyTheme
                            ? localLobbyTheme.avatarClassName
                            : "border-[#2f9a56]/25 bg-[#edf8ef] text-[#2f9a56]"
                            } ${mode === "bot" ? "[@media(pointer:coarse)]:h-[2.35rem] [@media(pointer:coarse)]:w-[2.35rem] [@media(pointer:coarse)]:rounded-[0.7rem]" : ""}`}>
                            {mode === "bot" && localDeckEmoji ? (
                              <span className={`text-[1.9rem] leading-none [@media(pointer:coarse)]:text-[1.45rem] md:text-[2.2rem] ${mode === "bot" ? "[@media(pointer:coarse)]:text-[1.35rem]" : ""}`}>{localDeckEmoji}</span>
                            ) : (
                              <ScrollText className="h-5.5 w-5.5 [@media(pointer:coarse)]:h-4.5 [@media(pointer:coarse)]:w-4.5 md:h-7 md:w-7" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className={`font-serif text-[1.2rem] font-black text-[#5b2408] leading-none [@media(pointer:coarse)]:text-[1.12rem] md:text-[1.4rem] md:leading-normal ${mode === "bot" ? "[@media(pointer:coarse)]:text-[1.12rem]" : ""}`}>
                              {mode === "bot" ? "Seu Lado" : "Criar Sala"}
                            </div>
                            <div className={`text-[0.68rem] font-serif italic text-[#7f664e] whitespace-nowrap overflow-hidden text-ellipsis [@media(pointer:coarse)]:text-[0.62rem] md:text-[0.78rem] ${mode === "bot" ? "[@media(pointer:coarse)]:text-[0.58rem]" : ""}`}>
                              {mode === "bot" ? (
                                localDeckId ? (
                                  <span className="not-italic">
                                    <span className="opacity-60 text-[0.62rem] font-black uppercase tracking-wider mr-1 [@media(pointer:coarse)]:text-[0.54rem]">Deck:</span>
                                    <span className="font-serif font-black uppercase tracking-tight text-[#5b2408] [@media(pointer:coarse)]:text-[0.74rem]">
                                      {localDeckName}
                                    </span>
                                  </span>
                                ) : "Mude para escolha seu deck"
                              ) : "Gere um codigo novo e envie para seu oponente."}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center [@media(pointer:coarse)]:min-h-0">
                          <div className={`w-full py-4 [@media(pointer:coarse)]:pt-[0.35rem] [@media(pointer:coarse)]:pb-0 ${mode === "bot" ? "[@media(pointer:coarse)]:pt-[0.1rem] [@media(pointer:coarse)]:pb-0 [@media(pointer:coarse)]:px-[0.35rem]" : ""}`}>
                            <ParticipantCard
                              avatar={localProfile.avatar}
                              name={localName}
                              role=""
                              tone="local"
                              layout="horizontal"
                              mobileInline={mode === "bot"}
                              showLevelBadge
                              theme={localDeckTheme ?? undefined}
                            />
                          </div>
                        </div>
                        <div className={`flex items-end [@media(pointer:coarse)]:pt-[0.18rem] ${mode === "bot" ? "[@media(pointer:coarse)]:justify-center [@media(pointer:coarse)]:pt-[0.02rem]" : ""}`}>
                          <Button
                            onClick={createButtonClickHandler("create", mode === "bot" ? () => onOpenDeckSelection?.("player") : handleCreate)}
                            onPointerDown={createButtonPointerDownHandler("create")}
                            onPointerUp={createButtonPointerUpHandler("create", mode === "bot" ? () => onOpenDeckSelection?.("player") : handleCreate)}
                            onPointerCancel={createButtonPointerCancelHandler("create")}
                            onPointerLeave={createButtonPointerCancelHandler("create")}
                            disabled={mode === "bot" ? false : isCreating}
                            className={`group relative h-[4rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.2rem] border-[3px] px-5 font-serif text-[1.05rem] font-black transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:rounded-[0.85rem] [@media(pointer:coarse)]:px-1.4 [@media(pointer:coarse)]:text-[1.04rem] ${mode === "bot" ? "[@media(pointer:coarse)]:mx-auto [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:w-[100%] [@media(pointer:coarse)]:text-[0.92rem]" : ""} ${mode === "bot" && localDeckId && localLobbyTheme
                              ? `${localLobbyTheme.raisedButtonClassName} ${pressedButtonId === "create" ? lobbyTouchPressedClassName[localLobbyTheme.pressedClassName] : ""}`
                              : `border-[#1f7a46] bg-[#2f9a56] text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] ${pressedButtonId === "create" ? lobbyTouchPressedClassName.green : ""}`
                              }`}
                          >
                            <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
                            <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
                            <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[0.95rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.72rem]" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {mode === "bot" ? <ScrollText className="h-5 w-5" /> : (isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScrollText className="h-5 w-5" />)}
                              {mode === "bot" ? (localDeckId ? "Trocar Deck" : "Selecionar Deck") : (isCreating ? "Criando..." : "Criar Sala")}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center py-2 [@media(pointer:coarse)]:py-0.5 md:py-0">
                      <div className="absolute inset-0 flex items-center md:hidden">
                        <div className="w-full border-t-2 border-amber-900/10" />
                      </div>
                      <div className="absolute inset-0 hidden md:flex justify-center">
                        <div className="h-full border-l-2 border-amber-900/10" />
                      </div>
                      <div className="relative flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-full border border-[#d7c19a] bg-[#f8ecd8] text-[#8a6428] shadow-[0_12px_20px_rgba(0,0,0,0.08)] [@media(pointer:coarse)]:h-[2.65rem] [@media(pointer:coarse)]:w-[2.65rem]">
                        <Swords className="h-5 w-5 [@media(pointer:coarse)]:h-4.5 [@media(pointer:coarse)]:w-4.5" />
                      </div>
                    </div>

                    {/* Coluna 2: ADVERSARIO */}
                    <div className={`relative flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border transition-all duration-300 px-4 pt-4 pb-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [@media(pointer:coarse)]:min-h-[10rem] [@media(pointer:coarse)]:rounded-[0.95rem] [@media(pointer:coarse)]:px-[1.1rem] [@media(pointer:coarse)]:pt-[0.7rem] [@media(pointer:coarse)]:pb-[0.9rem] ${remoteLobbyTheme
                      ? remoteLobbyTheme.panelClassName
                      : "border-[#d2c1a1] bg-[#fff9ef]"
                      } text-[#5b2408] ${mode === "bot" ? "[@media(pointer:coarse)]:min-h-[10.2rem] [@media(pointer:coarse)]:px-[0.9rem] [@media(pointer:coarse)]:pt-[1rem] [@media(pointer:coarse)]:pb-[1.2rem]" : ""}`}>
                      {remoteLobbyTheme ? (
                        <>
                          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply" style={remoteLobbyTheme.artStyle} />
                          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-soft-light" />
                          <div className={`pointer-events-none absolute inset-x-5 top-0 h-[3px] rounded-b-full ${remoteLobbyTheme.accentClassName}`} />
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.5),rgba(255,255,255,0.18)_58%,rgba(255,255,255,0.08))]" />
                        </>
                      ) : null}
                      <div className={`relative z-10 grid h-full grid-rows-[auto_1fr_auto] ${mode === "bot" ? "[@media(pointer:coarse)]:grid-rows-[auto_1fr_auto] [@media(pointer:coarse)]:content-start [@media(pointer:coarse)]:gap-[0.55rem]" : ""}`}>
                        <div className={`flex flex-row items-center justify-center gap-4 text-left ${mode === "bot" ? "md:flex-row md:items-center md:gap-4 md:text-left" : "md:flex-col md:items-center md:gap-2 md:text-center"} ${mode === "bot" ? "[@media(pointer:coarse)]:gap-[0.8rem]" : ""}`}>
                          <div className={`flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center rounded-[0.9rem] border-2 shadow-[0_12px_20px_rgba(0,0,0,0.07)] transition-all duration-300 [@media(pointer:coarse)]:h-[2.4rem] [@media(pointer:coarse)]:w-[2.4rem] [@media(pointer:coarse)]:rounded-[0.75rem] md:h-[3.9rem] md:w-[3.9rem] md:rounded-[1.1rem] ${remoteLobbyTheme
                            ? remoteLobbyTheme.avatarClassName
                            : "border-[#c88a32]/25 bg-[#fff4df] text-[#c88a32]"
                            } ${mode === "bot" ? "[@media(pointer:coarse)]:h-[2.35rem] [@media(pointer:coarse)]:w-[2.35rem] [@media(pointer:coarse)]:rounded-[0.7rem]" : ""}`}>
                            {mode === "bot" && remoteDeckEmoji ? (
                              <span className={`text-[1.9rem] leading-none [@media(pointer:coarse)]:text-[1.45rem] md:text-[2.2rem] ${mode === "bot" ? "[@media(pointer:coarse)]:text-[1.35rem]" : ""}`}>{remoteDeckEmoji}</span>
                            ) : (
                              mode === "bot" ? <Crown className="h-5.5 w-5.5 [@media(pointer:coarse)]:h-4.5 [@media(pointer:coarse)]:w-4.5 md:h-7 md:w-7" /> : <DoorOpen className="h-5.5 w-5.5 [@media(pointer:coarse)]:h-4.5 [@media(pointer:coarse)]:w-4.5 md:h-7 md:w-7" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className={`font-serif text-[1.2rem] font-black text-[#5b2408] leading-none [@media(pointer:coarse)]:text-[1.12rem] md:text-[1.4rem] md:leading-normal ${mode === "bot" ? "[@media(pointer:coarse)]:text-[1.12rem]" : ""}`}>
                              {mode === "bot" ? "Adversario" : "Entrar em Sala"}
                            </div>
                            <div className={`text-[0.68rem] font-serif italic text-[#7f664e] whitespace-nowrap overflow-hidden text-ellipsis [@media(pointer:coarse)]:text-[0.62rem] md:text-[0.78rem] ${mode === "bot" ? "[@media(pointer:coarse)]:text-[0.58rem]" : ""}`}>
                              {mode === "bot" ? (
                                remoteDeckId ? (
                                  <span className="not-italic">
                                    <span className="opacity-60 text-[0.62rem] font-black uppercase tracking-wider mr-1 [@media(pointer:coarse)]:text-[0.54rem]">Deck:</span>
                                    <span className="font-serif font-black uppercase tracking-tight text-[#5b2408] [@media(pointer:coarse)]:text-[0.74rem]">
                                      {remoteDeckName}
                                    </span>
                                  </span>
                                ) : "Determine o deck do bot."
                              ) : "Digite o codigo compartilhado pelo anfitriao."}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center [@media(pointer:coarse)]:min-h-0">
                          <div className={`w-full py-4 [@media(pointer:coarse)]:pt-[0.35rem] [@media(pointer:coarse)]:pb-0 ${mode === "bot" ? "[@media(pointer:coarse)]:pt-[0.1rem] [@media(pointer:coarse)]:pb-0 [@media(pointer:coarse)]:px-[0.35rem]" : ""}`}>
                            {mode === "bot" ? (
                              <ParticipantCard
                                avatar="👹"
                                name="BOT"
                                role=""
                                tone="remote"
                                layout="horizontal"
                                mobileInline={true}
                                showLevelBadge
                                theme={remoteDeckTheme ?? undefined}
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder="EX: XJ82KP"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                className="h-[4rem] w-full rounded-[1.2rem] border-2 border-amber-900/18 bg-amber-50/84 px-4 text-center font-serif text-[1.55rem] font-black tracking-[0.18em] text-amber-950 outline-none transition-all placeholder:text-amber-900/18 focus:border-amber-500 [@media(pointer:coarse)]:h-[3.55rem] [@media(pointer:coarse)]:rounded-[0.72rem] [@media(pointer:coarse)]:px-1.55 [@media(pointer:coarse)]:text-[1.12rem] [@media(pointer:coarse)]:tracking-[0.06em]"
                              />
                            )}
                          </div>
                        </div>
                        <div className={`flex items-end [@media(pointer:coarse)]:pt-[0.18rem] ${mode === "bot" ? "[@media(pointer:coarse)]:justify-center [@media(pointer:coarse)]:pt-[0.02rem]" : ""}`}>
                          <Button
                            onClick={createButtonClickHandler("join", mode === "bot" ? () => onOpenDeckSelection?.("enemy") : handleJoin)}
                            onPointerDown={createButtonPointerDownHandler("join")}
                            onPointerUp={createButtonPointerUpHandler("join", mode === "bot" ? () => onOpenDeckSelection?.("enemy") : handleJoin)}
                            onPointerCancel={createButtonPointerCancelHandler("join")}
                            onPointerLeave={createButtonPointerCancelHandler("join")}
                            disabled={mode === "bot" ? false : (isJoining || !roomId)}
                            className={`group relative h-[4rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.2rem] border-[3px] px-5 font-serif text-[1.05rem] font-black transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:rounded-[0.85rem] [@media(pointer:coarse)]:px-1.4 [@media(pointer:coarse)]:text-[1.04rem] ${mode === "bot" ? "[@media(pointer:coarse)]:mx-auto [@media(pointer:coarse)]:h-[2.8rem] [@media(pointer:coarse)]:w-[100%] [@media(pointer:coarse)]:text-[0.92rem]" : ""} ${mode === "bot" && remoteDeckId && remoteLobbyTheme
                              ? `${remoteLobbyTheme.raisedButtonClassName} ${pressedButtonId === "join" ? lobbyTouchPressedClassName[remoteLobbyTheme.pressedClassName] : ""}`
                              : `border-[#8f5f12] bg-[#c88a32] text-amber-50 shadow-[0_7px_0_#8f5f12,0_18px_28px_rgba(88,52,8,0.2)] [@media(hover:hover)]:hover:bg-[#d29134] [@media(hover:hover)]:hover:shadow-[0_10px_0_#8f5f12,0_22px_32px_rgba(88,52,8,0.24)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)] ${pressedButtonId === "join" ? lobbyTouchPressedClassName.amber : ""}`
                              }`}
                          >
                            <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
                            <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
                            <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[0.95rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.72rem]" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {mode === "bot" ? <ScrollText className="h-5 w-5" /> : (isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <DoorOpen className="h-5 w-5" />)}
                              {mode === "bot" ? (remoteDeckId ? "Trocar Deck" : "Selecionar Deck") : (isJoining ? "Entrando..." : "Entrar")}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {mode === "bot" ? (
                    <div className="mt-2 shrink-0 [@media(pointer:coarse)]:mt-[0.18rem]">
                      <Button
                        onClick={createButtonClickHandler("start", onStartRoom)}
                        onPointerDown={createButtonPointerDownHandler("start")}
                        onPointerUp={createButtonPointerUpHandler("start", onStartRoom)}
                        onPointerCancel={createButtonPointerCancelHandler("start")}
                        onPointerLeave={createButtonPointerCancelHandler("start")}
                        disabled={!localDeckId || !remoteDeckId}
                        className={`group relative h-[4.2rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.3rem] border-[3px] border-[#1f7a46] bg-[#2f9a56] px-5 font-serif text-[1.15rem] font-black text-emerald-50 shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] transition-all duration-150 ease-out [@media(hover:hover)]:-top-[0.65rem] [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_22px_32px_rgba(20,83,45,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60 disabled:[@media(hover:hover)]:hover:translate-y-0 disabled:[@media(hover:hover)]:hover:bg-[#2f9a56] disabled:[@media(hover:hover)]:hover:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] disabled:[@media(hover:hover)]:active:translate-y-0 disabled:[@media(hover:hover)]:active:shadow-[0_7px_0_#22673f,0_18px_28px_rgba(20,83,45,0.22)] [@media(pointer:coarse)]:h-[2.7rem] [@media(pointer:coarse)]:rounded-[0.9rem] [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:text-[0.76rem] ${pressedButtonId === "start" ? lobbyTouchPressedClassName.green : ""}`}
                      >
                        <span className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22 [@media(pointer:coarse)]:!inset-x-1.5 [@media(pointer:coarse)]:!h-[2px] [@media(pointer:coarse)]:!bg-white/24" />
                        <span className="pointer-events-none absolute inset-x-5 bottom-0 z-0 h-[2px] rounded-t-full bg-white/14 [@media(pointer:coarse)]:!inset-x-2 [@media(pointer:coarse)]:!h-[1.5px] [@media(pointer:coarse)]:!bg-white/14" />
                        <span className="pointer-events-none absolute inset-[3px] z-0 rounded-[1rem] border border-white/18 [@media(pointer:coarse)]:rounded-[0.75rem]" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <Play className="h-5 w-5 [@media(pointer:coarse)]:h-4 [@media(pointer:coarse)]:w-4" />
                          Iniciar Duelo
                        </span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
