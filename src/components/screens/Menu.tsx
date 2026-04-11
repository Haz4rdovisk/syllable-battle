import React from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { GameMode, PlayerProfile, normalizePlayerName } from "../../types/game";
import titleLogo from "../../assets/branding/SpellCast.webp";

interface MenuProps {
  onSelectMode: (mode: GameMode) => void;
  onOpenCollection: () => void;
  profile: PlayerProfile;
  onEditProfile: () => void;
}

interface CabinetButtonProps {
  label: string;
  detail: string;
  icon: React.ReactNode;
  tone: "solo" | "online" | "collection" | "packs";
  pressed?: boolean;
  onActivate?: React.MouseEventHandler<HTMLButtonElement>;
  onPressStart?: React.PointerEventHandler<HTMLButtonElement>;
  onPressEnd?: React.PointerEventHandler<HTMLButtonElement>;
  onPressCancel?: React.PointerEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

const cabinetToneClassName: Record<
  CabinetButtonProps["tone"],
  { frame: string; pressed: string; icon: string; badge: string }
> = {
  solo: {
    frame:
      "border-[#b77912] bg-[#d9a22b] text-[#fff8e8] shadow-[0_7px_0_#8f5f12,0_20px_28px_rgba(88,52,8,0.24)] [@media(hover:hover)]:hover:bg-[#e0ac37] [@media(hover:hover)]:hover:shadow-[0_10px_0_#8f5f12,0_24px_34px_rgba(88,52,8,0.28)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)]",
    pressed:
      "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)]",
    icon: "border-white/28 bg-white/38 text-[#8f5f12]",
    badge: "bg-[#f7e4b4] text-[#8f5f12]",
  },
  online: {
    frame:
      "border-[#1f7a46] bg-[#2f9a56] text-[#f6fff2] shadow-[0_7px_0_#22673f,0_20px_28px_rgba(20,83,45,0.24)] [@media(hover:hover)]:hover:bg-[#35a55d] [@media(hover:hover)]:hover:shadow-[0_10px_0_#22673f,0_24px_34px_rgba(20,83,45,0.28)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]",
    pressed:
      "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#175632]",
    badge: "bg-[#d8f5e1] text-[#22673f]",
  },
  collection: {
    frame:
      "border-[#2b6d9a] bg-[#4c95c4] text-[#f5fbff] shadow-[0_7px_0_#28597d,0_20px_28px_rgba(35,74,110,0.22)] [@media(hover:hover)]:hover:bg-[#5aa1ce] [@media(hover:hover)]:hover:shadow-[0_10px_0_#28597d,0_24px_34px_rgba(35,74,110,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#28597d,0_10px_16px_rgba(35,74,110,0.18)]",
    pressed:
      "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_3px_0_#28597d,0_10px_16px_rgba(35,74,110,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#234f72]",
    badge: "bg-[#d9ecf9] text-[#28597d]",
  },
  packs: {
    frame:
      "border-[#8d5b86] bg-[#b882ac] text-[#fff7ff] shadow-[0_7px_0_#7d4f74,0_20px_28px_rgba(83,47,78,0.22)] [@media(hover:hover)]:hover:bg-[#c18ab4] [@media(hover:hover)]:hover:shadow-[0_10px_0_#7d4f74,0_24px_34px_rgba(83,47,78,0.26)] [@media(hover:hover)]:active:translate-y-[4px] [@media(hover:hover)]:active:shadow-[0_3px_0_#7d4f74,0_10px_16px_rgba(83,47,78,0.18)]",
    pressed:
      "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_3px_0_#7d4f74,0_10px_16px_rgba(83,47,78,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#6a4263]",
    badge: "bg-[#f5d9ee] text-[#7d4f74]",
  },
};

const CabinetButton: React.FC<CabinetButtonProps> = ({
  label,
  detail,
  icon,
  tone,
  pressed = false,
  onActivate,
  onPressStart,
  onPressEnd,
  onPressCancel,
  disabled = false,
}) => (
  <Button
    onClick={onActivate}
    onPointerDown={onPressStart}
    onPointerUp={onPressEnd}
    onPointerCancel={onPressCancel}
    onPointerLeave={onPressCancel}
    disabled={disabled}
    className={`group relative h-[6.8rem] w-full touch-manipulation select-none overflow-hidden rounded-[1.85rem] border-[4px] px-5 py-4 text-left transition-all duration-150 ease-out [@media(hover:hover)]:hover:-translate-y-1 disabled:cursor-default disabled:opacity-70 disabled:[@media(hover:hover)]:hover:translate-y-0 disabled:[@media(hover:hover)]:active:translate-y-0 [@media(pointer:coarse)_and_(max-height:480px)]:!h-[3.9rem] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1rem] [@media(pointer:coarse)_and_(max-height:480px)]:!border-[3px] [@media(pointer:coarse)_and_(max-height:480px)]:!px-2.35 [@media(pointer:coarse)_and_(max-height:480px)]:!py-1.8 sm:h-[7.35rem] ${cabinetToneClassName[tone].frame} ${pressed ? cabinetToneClassName[tone].pressed : ""}`}
  >
    <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-soft-light" />
    <div className="pointer-events-none absolute inset-x-4 top-[1px] z-0 h-[4px] rounded-b-full bg-white/26 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-x-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!h-[1.5px] [@media(pointer:coarse)_and_(max-height:480px)]:!bg-white/18" />
    <div className="pointer-events-none absolute inset-x-5 bottom-[1px] z-0 h-[2px] rounded-t-full bg-white/16 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-x-2 [@media(pointer:coarse)_and_(max-height:480px)]:!h-px [@media(pointer:coarse)_and_(max-height:480px)]:!bg-white/10" />
    <span className="pointer-events-none absolute inset-0 z-0 rounded-[1.65rem] border border-black/10 [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1rem]" />
    <span className="pointer-events-none absolute inset-[5px] z-0 rounded-[1.52rem] border border-white/18 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-[3px] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[0.78rem] sm:inset-[6px] sm:rounded-[1.6rem]" />
    <div className="relative z-10 flex h-full w-full items-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:!gap-2">
      <span
        className={`relative flex h-[4.45rem] w-[4.45rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.45rem] border-[2.5px] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_24px_rgba(0,0,0,0.14)] [@media(pointer:coarse)_and_(max-height:480px)]:!h-[2.5rem] [@media(pointer:coarse)_and_(max-height:480px)]:!w-[2.5rem] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[0.82rem] sm:h-[4.9rem] sm:w-[4.9rem] sm:rounded-[1.6rem] ${cabinetToneClassName[tone].icon}`}
      >
        <span className="pointer-events-none absolute inset-x-2 top-1.5 h-4 rounded-full bg-white/28 blur-sm" />
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center pl-4 text-left [@media(pointer:coarse)_and_(max-height:480px)]:pl-6 sm:pl-4">
        <span className="block truncate font-serif text-[1.7rem] font-black leading-none [@media(pointer:coarse)_and_(max-height:480px)]:!text-[1.14rem] sm:text-[1.95rem]">{label}</span>
        <span className="mt-2 block truncate text-[0.7rem] font-black uppercase tracking-[0.18em] text-current/78 [@media(pointer:coarse)_and_(max-height:480px)]:!mt-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:!text-[0.52rem] [@media(pointer:coarse)_and_(max-height:480px)]:!tracking-[0.11em] sm:text-[0.74rem]">
          {detail}
        </span>
      </span>
      {disabled ? (
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.22em] [@media(pointer:coarse)_and_(max-height:480px)]:!right-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!top-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!px-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!py-0.55 [@media(pointer:coarse)_and_(max-height:480px)]:!text-[0.38rem] [@media(pointer:coarse)_and_(max-height:480px)]:!tracking-[0.08em] ${cabinetToneClassName[tone].badge}`}
        >
          Em Breve
        </span>
      ) : null}
    </div>
  </Button>
);

const BinderRings: React.FC = () => {
  const rings = Array.from({ length: 8 });
  const rowHeight = 52;
  const rowGap = 26;
  const connectorHeight = rowHeight + rowGap + rowHeight;
  const stackHeight = rowHeight * rings.length + rowGap * (rings.length - 1);

  return (
    <div className="pointer-events-none absolute bottom-8 left-[-14px] top-8 z-[120] hidden w-[64px] lg:flex">
      <div className="absolute inset-y-0 left-[18px] w-[34px] rounded-l-[28px] rounded-r-[16px] border border-[#d8ccb7] bg-[#f7f1e6] shadow-[inset_-2px_0_0_rgba(120,96,64,0.08),inset_0_1px_0_rgba(255,255,255,0.82)]" />

      <div
        className="absolute left-0 top-1/2 flex w-full -translate-y-1/2 flex-col"
        style={{ gap: rowGap, height: stackHeight }}
      >
        {rings.map((_, index) => (
          <div key={index} className="relative h-[52px] w-[64px] overflow-visible">
            {index < rings.length - 1 ? (
              <svg
                viewBox={`0 0 64 ${connectorHeight}`}
                className="absolute left-0 top-0 w-[64px] overflow-visible"
                style={{ height: connectorHeight }}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={`binderConnectorMetal-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#faeedc" />
                    <stop offset="28%" stopColor="#ddb176" />
                    <stop offset="62%" stopColor="#9f6b35" />
                    <stop offset="100%" stopColor="#f1ca91" />
                  </linearGradient>
                </defs>

                <path
                  d={`M21.5 26 C 8 32, 7 ${connectorHeight - 32}, 21.5 ${connectorHeight - 26}`}
                  fill="none"
                  stroke="rgba(124,92,58,0.18)"
                  strokeWidth="5.2"
                  strokeLinecap="round"
                />
                <path
                  d={`M21.5 26 C 10 34, 9 ${connectorHeight - 34}, 21.5 ${connectorHeight - 26}`}
                  fill="none"
                  stroke={`url(#binderConnectorMetal-${index})`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}

            <svg viewBox="0 0 64 52" className="relative z-10 h-[52px] w-[64px]" aria-hidden="true">
              <defs>
                <linearGradient id={`ringMetal-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#faeedc" />
                  <stop offset="28%" stopColor="#ddb176" />
                  <stop offset="62%" stopColor="#9f6b35" />
                  <stop offset="100%" stopColor="#f1ca91" />
                </linearGradient>

                <radialGradient id={`holeFill-${index}`} cx="40%" cy="42%" r="70%">
                  <stop offset="0%" stopColor="#f8f2e8" />
                  <stop offset="70%" stopColor="#efe5d6" />
                  <stop offset="100%" stopColor="#e2d2bf" />
                </radialGradient>

                <clipPath id={`holeClip-${index}`}>
                  <circle cx="33" cy="26" r="11.5" />
                </clipPath>
              </defs>

              <circle
                cx="33"
                cy="26"
                r="11.5"
                fill={`url(#holeFill-${index})`}
                stroke="#e6dcc8"
                strokeWidth="1.2"
              />

              <ellipse
                cx="35"
                cy="20"
                rx="4.5"
                ry="2.3"
                fill="rgba(255,255,255,0.42)"
              />

              <ellipse
                cx="30.5"
                cy="26"
                rx="5.6"
                ry="8.4"
                fill="rgba(130,100,70,0.10)"
              />

              <g clipPath={`url(#holeClip-${index})`}>
                <path
                  d="M29 13 A13 13 0 0 1 29 39"
                  fill="none"
                  stroke="rgba(79,49,21,0.16)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />

                <path
                  d="M30 14 A12 12 0 0 1 30 38"
                  fill="none"
                  stroke={`url(#ringMetal-${index})`}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

const SPELLCAST_NATIVE_LOADING_FINISHED_EVENT = "spellcast:native-loading-finished";

export const Menu: React.FC<MenuProps> = ({ onSelectMode, onOpenCollection, profile, onEditProfile }) => {
  const displayName = normalizePlayerName(profile.name);
  const buildLabel = (__APP_BUILD__ || "local").slice(0, 7).toUpperCase();
  const [pressedButtonId, setPressedButtonId] = React.useState<"solo" | "online" | "collection" | "packs" | "profile" | null>(null);
  const touchActivatedButtonRef = React.useRef<"solo" | "online" | "collection" | "packs" | "profile" | null>(null);
  const [canPlayTitleEntrance, setCanPlayTitleEntrance] = React.useState(
    () => window.__SPELLCAST_NATIVE_LOADING_PENDING__ !== true,
  );

  const clearPressedButton = React.useCallback(
    (buttonId?: "solo" | "online" | "collection" | "packs" | "profile") => {
      setPressedButtonId((current) => (buttonId === undefined || current === buttonId ? null : current));
    },
    [],
  );

  const createButtonPointerDownHandler = React.useCallback(
    (buttonId: "solo" | "online" | "collection" | "packs" | "profile"): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        touchActivatedButtonRef.current = null;
        setPressedButtonId(buttonId);
      },
    [],
  );

  const createButtonPointerUpHandler = React.useCallback(
    (
      buttonId: "solo" | "online" | "collection" | "packs" | "profile",
      action?: () => void,
    ): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        if (pressedButtonId === buttonId) {
          touchActivatedButtonRef.current = buttonId;
          action?.();
        }

        clearPressedButton(buttonId);
      },
    [clearPressedButton, pressedButtonId],
  );

  const createButtonPointerCancelHandler = React.useCallback(
    (buttonId: "solo" | "online" | "collection" | "packs" | "profile"): React.PointerEventHandler<HTMLButtonElement> =>
      (event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        clearPressedButton(buttonId);
      },
    [clearPressedButton],
  );

  const createButtonClickHandler = React.useCallback(
    (
      buttonId: "solo" | "online" | "collection" | "packs" | "profile",
      action?: () => void,
    ): React.MouseEventHandler<HTMLButtonElement> =>
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

  React.useEffect(() => {
    const isNativeApp = window.__SPELLCAST_NATIVE_APP__ === true;
    const isLoadingPending = window.__SPELLCAST_NATIVE_LOADING_PENDING__ === true;
    let firstAnimationFrameId = 0;

    if (!isNativeApp || !isLoadingPending) {
      window.__SPELLCAST_MENU_TITLE_READY__ = false;
      setCanPlayTitleEntrance(true);
      return;
    }

    const handleNativeLoadingFinished = () => {
      window.__SPELLCAST_NATIVE_LOADING_PENDING__ = false;
      document.documentElement.setAttribute('data-native-loading-pending', 'false');
      firstAnimationFrameId = window.requestAnimationFrame(() => {
        setCanPlayTitleEntrance(true);
      });
    };

    window.addEventListener(SPELLCAST_NATIVE_LOADING_FINISHED_EVENT, handleNativeLoadingFinished);
    window.__SPELLCAST_MENU_TITLE_READY__ = true;

    return () => {
      if (firstAnimationFrameId !== 0) {
        window.cancelAnimationFrame(firstAnimationFrameId);
      }
      window.removeEventListener(SPELLCAST_NATIVE_LOADING_FINISHED_EVENT, handleNativeLoadingFinished);
      window.__SPELLCAST_MENU_TITLE_READY__ = false;
    };
  }, []);

  const soloButton = (
    <CabinetButton
      pressed={pressedButtonId === "solo"}
      label="Jogar Solo"
      detail="Desafie o bot"
      icon={<span className="text-[1.95rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.65rem] sm:text-[2.2rem]">⚔️</span>}
      tone="solo"
      onActivate={createButtonClickHandler("solo", () => onSelectMode("bot"))}
      onPressStart={createButtonPointerDownHandler("solo")}
      onPressEnd={createButtonPointerUpHandler("solo", () => onSelectMode("bot"))}
      onPressCancel={createButtonPointerCancelHandler("solo")}
    />
  );
  const onlineButton = (
    <CabinetButton
      pressed={pressedButtonId === "online"}
      label="Jogar Online"
      detail="Enfrente outro duelista"
      icon={<span className="text-[1.95rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.65rem] sm:text-[2.2rem]">🛡️</span>}
      tone="online"
      onActivate={createButtonClickHandler("online", () => onSelectMode("multiplayer"))}
      onPressStart={createButtonPointerDownHandler("online")}
      onPressEnd={createButtonPointerUpHandler("online", () => onSelectMode("multiplayer"))}
      onPressCancel={createButtonPointerCancelHandler("online")}
    />
  );
  const collectionButton = (
    <CabinetButton
      pressed={pressedButtonId === "collection"}
      label="Minha Colecao"
      detail="Veja seus decks"
      icon={<span className="text-[1.9rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.6rem] sm:text-[2.15rem]">📚</span>}
      tone="collection"
      onActivate={createButtonClickHandler("collection", onOpenCollection)}
      onPressStart={createButtonPointerDownHandler("collection")}
      onPressEnd={createButtonPointerUpHandler("collection", onOpenCollection)}
      onPressCancel={createButtonPointerCancelHandler("collection")}
    />
  );
  const packsButton = (
    <CabinetButton
      pressed={pressedButtonId === "packs"}
      label="Open Packs"
      detail="Novas cartas em breve"
      icon={<span className="text-[1.9rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.6rem] sm:text-[2.15rem]">🎴</span>}
      tone="packs"
      onPressStart={createButtonPointerDownHandler("packs")}
      onPressEnd={createButtonPointerUpHandler("packs")}
      onPressCancel={createButtonPointerCancelHandler("packs")}
      disabled
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ece3d3] p-3 text-[#31271e] no-scrollbar [@media(pointer:coarse)_and_(max-height:480px)]:items-start [@media(pointer:coarse)_and_(max-height:480px)]:p-1.5 sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#ece3d3]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,155,176,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,155,176,0.1)_1px,transparent_1px)] bg-[size:120px_120px] opacity-45" />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-full border border-[#b8ab93] bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#6b5a47] shadow-[0_10px_18px_rgba(0,0,0,0.06)] [@media(pointer:coarse)_and_(max-height:480px)]:hidden">
        Build {buildLabel}
      </div>

      <div className="relative z-10 w-full max-w-[68rem]">
        <BinderRings />

        <div className="paper-panel relative z-10 overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-4 py-5 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[calc(100dvh-10px)] [@media(pointer:coarse)_and_(max-height:480px)]:min-h-0 [@media(pointer:coarse)_and_(max-height:480px)]:px-2 [@media(pointer:coarse)_and_(max-height:480px)]:py-2 sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-white/28" />
          <div className="absolute inset-y-[14px] left-[14px] right-[14px] rounded-[1.4rem] border border-[#d9c8a9] [@media(pointer:coarse)_and_(max-height:480px)]:top-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1rem] lg:left-[38px] lg:rounded-[1.6rem]" />
          <div className="pointer-events-none absolute bottom-[18px] left-[12px] right-[12px] top-[18px] rounded-[1.25rem] border border-white/32 [@media(pointer:coarse)_and_(max-height:480px)]:top-[11px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[14px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[6px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] lg:left-[34px] lg:right-[22px] lg:rounded-[1.45rem]" />

          <div className="relative flex flex-col gap-6 [@media(pointer:coarse)_and_(max-height:480px)]:h-full [@media(pointer:coarse)_and_(max-height:480px)]:gap-0">
            <div className="flex flex-col items-center text-center [@media(pointer:coarse)_and_(max-height:480px)]:gap-1">
              <div className="relative z-20 flex w-full items-center justify-between gap-4 px-1 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2 [@media(pointer:coarse)_and_(max-height:480px)]:px-[0.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:pt-[0.4rem] lg:pl-[20px] lg:pr-0">
                <div className="flex items-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2 text-left">
                  <span className="flex h-[5.2rem] w-[5.2rem] items-center justify-center rounded-[1.8rem] border-2 border-[#efcf78] bg-[#f7eac5] text-[2.6rem] shadow-[0_14px_24px_rgba(0,0,0,0.08)] transition-transform group-hover:-translate-y-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:h-[3.4rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[3.4rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.1rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.7rem] sm:h-[5.8rem] sm:w-[5.8rem] sm:text-[3rem]">
                    {profile.avatar}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[0.68rem] font-black uppercase tracking-[0.34em] text-[#a96e43] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.48rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.18em]">
                      Duelista
                    </span>
                    <span className="mt-1 block font-serif text-[1.55rem] font-black uppercase leading-none text-[#5b2408] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1rem] sm:text-[1.8rem]">
                      {displayName}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={createButtonClickHandler("profile", onEditProfile)}
                  onPointerDown={createButtonPointerDownHandler("profile")}
                  onPointerUp={createButtonPointerUpHandler("profile", onEditProfile)}
                  onPointerCancel={createButtonPointerCancelHandler("profile")}
                  onPointerLeave={createButtonPointerCancelHandler("profile")}
                  className={`group relative flex h-[4.1rem] w-[8.4rem] shrink-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden rounded-[1.35rem] border-[2px] border-[#2d6b8f] bg-[#4f9fcc] px-3 text-[0.72rem] font-black uppercase tracking-[0.08em] text-[#f3fbff] shadow-[0_5px_0_#28597d,0_14px_22px_rgba(35,74,110,0.18)] transition-all duration-150 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-[#5ba8d4] [@media(hover:hover)]:hover:shadow-[0_7px_0_#28597d,0_18px_24px_rgba(35,74,110,0.22)] [@media(hover:hover)]:active:translate-y-[3px] [@media(hover:hover)]:active:shadow-[0_2px_0_#28597d,0_8px_12px_rgba(35,74,110,0.14)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[2.9rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[6.7rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.95rem] [@media(pointer:coarse)_and_(max-height:480px)]:gap-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:px-2.25 [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.52rem] [@media(pointer:coarse)_and_(max-height:480px)]:touch-manipulation sm:h-[4.4rem] sm:w-[9rem] sm:rounded-[1.5rem] ${pressedButtonId === "profile" ? "[@media(pointer:coarse)_and_(max-height:480px)]:translate-y-[3px] [@media(pointer:coarse)_and_(max-height:480px)]:shadow-[0_2px_0_#28597d,0_8px_12px_rgba(35,74,110,0.14)]" : ""}`}
                >
                  <span className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-15 mix-blend-soft-light" />
                  <span className="pointer-events-none absolute inset-x-3 top-0 z-0 h-[3px] rounded-b-full bg-white/24 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-x-1.5 [@media(pointer:coarse)_and_(max-height:480px)]:!h-[2px] [@media(pointer:coarse)_and_(max-height:480px)]:!bg-white/24" />
                  <span className="pointer-events-none absolute inset-x-2 bottom-0 z-0 hidden h-[1.5px] rounded-t-full bg-white/14 [@media(pointer:coarse)_and_(max-height:480px)]:!block" />
                  <span className="pointer-events-none absolute inset-[4px] z-0 rounded-[1rem] border border-white/18 [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.85rem] sm:rounded-[1.15rem]" />
                  <span className="relative z-10 text-[1.2rem] leading-none [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.95rem] sm:text-[1.35rem]">✏️</span>
                  <span className="relative z-10 leading-none">Perfil</span>
                </Button>
              </div>

              <div className="relative z-0 flex w-full justify-center overflow-visible">
                <div className="relative h-[7.3rem] w-[46rem] max-w-none [@media(pointer:coarse)_and_(max-height:480px)]:h-[5.4rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[42rem] sm:h-[8.6rem] sm:w-[54rem] lg:h-[9.4rem] lg:w-[66rem]">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
                    {canPlayTitleEntrance ? (
                      <motion.div
                        key="title-entrance-ready"
                        initial={{ scale: 0.8, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 100 }}
                      className="relative top-[1.95rem] flex translate-x-[0.15rem] flex-col items-center [@media(pointer:coarse)_and_(max-height:480px)]:top-[1.3rem] [@media(pointer:coarse)_and_(max-height:480px)]:translate-x-[0.05rem] sm:top-[2.2rem] sm:translate-x-[0.45rem] lg:top-[2.55rem] lg:translate-x-[0.75rem]"
                      >
                        <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 rounded-full bg-[#f1d07f]/18 blur-3xl" />
                        <motion.img
                          src={titleLogo}
                          alt="Syllable Battle"
                          initial={{ opacity: 0, y: -18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
                        className="relative h-auto w-full max-w-none origin-center scale-[1] [@media(pointer:coarse)_and_(max-height:480px)]:scale-[0.94] drop-shadow-[0_0_18px_rgba(238,196,94,0.18)]"
                        />
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 mt-[5rem] [@media(pointer:coarse)_and_(max-height:480px)]:absolute [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[0.7rem] [@media(pointer:coarse)_and_(max-height:480px)]:left-[5.5rem] [@media(pointer:coarse)_and_(max-height:480px)]:right-[5.5rem] lg:ml-[20px]">
              <div className="grid items-stretch gap-y-4 gap-x-[3.8rem] [@media(pointer:coarse)_and_(max-height:480px)]:gap-x-[42px] [@media(pointer:coarse)_and_(max-height:480px)]:gap-y-3 sm:grid-cols-2">
                <div className="flex min-h-full flex-col rounded-[1.9rem] border border-[#d8c9b0] bg-white/36 px-3 pt-3 pb-[1.25rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-1.25 [@media(pointer:coarse)_and_(max-height:480px)]:pt-1.25 [@media(pointer:coarse)_and_(max-height:480px)]:pb-[0.8rem] sm:px-2.5 sm:pt-2.5 sm:pb-[1rem]">
                  <div className="flex h-full flex-col justify-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-3.5 sm:gap-3.5">
                    {soloButton}
                    {collectionButton}
                  </div>
                </div>
                <div className="flex min-h-full flex-col rounded-[1.9rem] border border-[#d8c9b0] bg-white/36 px-3 pt-3 pb-[1.25rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-1.25 [@media(pointer:coarse)_and_(max-height:480px)]:pt-1.25 [@media(pointer:coarse)_and_(max-height:480px)]:pb-[0.8rem] sm:px-2.5 sm:pt-2.5 sm:pb-[1rem]">
                  <div className="flex h-full flex-col justify-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-3.5 sm:gap-3.5">
                    {onlineButton}
                    {packsButton}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

