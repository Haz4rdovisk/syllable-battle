import React from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { GameMode, PlayerProfile, normalizePlayerName } from "../../types/game";

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
  onClick?: () => void;
  disabled?: boolean;
}

const cabinetToneClassName: Record<CabinetButtonProps["tone"], { frame: string; icon: string; badge: string }> = {
  solo: {
    frame:
      "border-[#b77912] bg-[#d9a22b] text-[#fff8e8] shadow-[0_7px_0_#8f5f12,0_20px_28px_rgba(88,52,8,0.24)] hover:bg-[#e0ac37] hover:shadow-[0_10px_0_#8f5f12,0_24px_34px_rgba(88,52,8,0.28)] active:translate-y-[4px] active:shadow-[0_3px_0_#8f5f12,0_10px_16px_rgba(88,52,8,0.18)]",
    icon: "border-white/28 bg-white/38 text-[#8f5f12]",
    badge: "bg-[#f7e4b4] text-[#8f5f12]",
  },
  online: {
    frame:
      "border-[#1f7a46] bg-[#2f9a56] text-[#f6fff2] shadow-[0_7px_0_#22673f,0_20px_28px_rgba(20,83,45,0.24)] hover:bg-[#35a55d] hover:shadow-[0_10px_0_#22673f,0_24px_34px_rgba(20,83,45,0.28)] active:translate-y-[4px] active:shadow-[0_3px_0_#22673f,0_10px_16px_rgba(20,83,45,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#175632]",
    badge: "bg-[#d8f5e1] text-[#22673f]",
  },
  collection: {
    frame:
      "border-[#2b6d9a] bg-[#4c95c4] text-[#f5fbff] shadow-[0_7px_0_#28597d,0_20px_28px_rgba(35,74,110,0.22)] hover:bg-[#5aa1ce] hover:shadow-[0_10px_0_#28597d,0_24px_34px_rgba(35,74,110,0.26)] active:translate-y-[4px] active:shadow-[0_3px_0_#28597d,0_10px_16px_rgba(35,74,110,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#234f72]",
    badge: "bg-[#d9ecf9] text-[#28597d]",
  },
  packs: {
    frame:
      "border-[#8d5b86] bg-[#b882ac] text-[#fff7ff] shadow-[0_7px_0_#7d4f74,0_20px_28px_rgba(83,47,78,0.22)] hover:bg-[#c18ab4] hover:shadow-[0_10px_0_#7d4f74,0_24px_34px_rgba(83,47,78,0.26)] active:translate-y-[4px] active:shadow-[0_3px_0_#7d4f74,0_10px_16px_rgba(83,47,78,0.18)]",
    icon: "border-white/28 bg-white/32 text-[#6a4263]",
    badge: "bg-[#f5d9ee] text-[#7d4f74]",
  },
};

const CabinetButton: React.FC<CabinetButtonProps> = ({
  label,
  detail,
  icon,
  tone,
  onClick,
  disabled = false,
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={`group relative h-[6.8rem] w-full overflow-hidden rounded-[1.85rem] border-[3px] px-5 py-4 text-left transition-all duration-150 ease-out hover:-translate-y-1 disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:translate-y-0 [@media(pointer:coarse)_and_(max-height:480px)]:!h-[5.15rem] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1.4rem] [@media(pointer:coarse)_and_(max-height:480px)]:!px-3.75 [@media(pointer:coarse)_and_(max-height:480px)]:!py-3 sm:h-[7.35rem] ${cabinetToneClassName[tone].frame}`}
  >
    <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-soft-light" />
    <div className="pointer-events-none absolute inset-x-4 top-0 z-0 h-[3px] rounded-b-full bg-white/22" />
    <span className="pointer-events-none absolute inset-0 z-0 rounded-[1.65rem] border border-black/10 [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1.4rem]" />
    <span className="pointer-events-none absolute inset-[6px] z-0 rounded-[1.5rem] border border-white/16 [@media(pointer:coarse)_and_(max-height:480px)]:!inset-[4px] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1.18rem] sm:inset-[7px] sm:rounded-[1.65rem]" />
    <div className="relative z-10 flex h-full w-full items-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:!gap-3">
      <span
        className={`relative flex h-[4.45rem] w-[4.45rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.45rem] border-[2.5px] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_24px_rgba(0,0,0,0.14)] [@media(pointer:coarse)_and_(max-height:480px)]:!h-[3.35rem] [@media(pointer:coarse)_and_(max-height:480px)]:!w-[3.35rem] [@media(pointer:coarse)_and_(max-height:480px)]:!rounded-[1.05rem] sm:h-[4.9rem] sm:w-[4.9rem] sm:rounded-[1.6rem] ${cabinetToneClassName[tone].icon}`}
      >
        <span className="pointer-events-none absolute inset-x-2 top-1.5 h-4 rounded-full bg-white/28 blur-sm" />
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-[1.7rem] font-black leading-none [@media(pointer:coarse)_and_(max-height:480px)]:!text-[1.28rem] sm:text-[1.95rem]">{label}</span>
        <span className="mt-2 block truncate text-[0.7rem] font-black uppercase tracking-[0.18em] text-current/78 [@media(pointer:coarse)_and_(max-height:480px)]:!mt-1 [@media(pointer:coarse)_and_(max-height:480px)]:!text-[0.56rem] [@media(pointer:coarse)_and_(max-height:480px)]:!tracking-[0.12em] sm:text-[0.74rem]">
          {detail}
        </span>
      </span>
      {disabled ? (
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.22em] [@media(pointer:coarse)_and_(max-height:480px)]:!right-2 [@media(pointer:coarse)_and_(max-height:480px)]:!top-2 [@media(pointer:coarse)_and_(max-height:480px)]:!px-1.75 [@media(pointer:coarse)_and_(max-height:480px)]:!py-0.75 [@media(pointer:coarse)_and_(max-height:480px)]:!text-[0.42rem] [@media(pointer:coarse)_and_(max-height:480px)]:!tracking-[0.12em] ${cabinetToneClassName[tone].badge}`}
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

export const Menu: React.FC<MenuProps> = ({ onSelectMode, onOpenCollection, profile, onEditProfile }) => {
  const displayName = normalizePlayerName(profile.name);
  const buildLabel = (__APP_BUILD__ || "local").slice(0, 7).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-[#ece3d3] p-3 text-[#31271e] no-scrollbar [@media(pointer:coarse)_and_(max-height:480px)]:items-start [@media(pointer:coarse)_and_(max-height:480px)]:p-2.5 sm:p-5"
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

        <div className="paper-panel relative z-10 overflow-hidden rounded-[2rem] border-[4px] border-[#4b3527]/25 px-4 py-5 shadow-[0_35px_80px_rgba(0,0,0,0.16)] [@media(pointer:coarse)_and_(max-height:480px)]:min-h-[calc(100dvh-20px)] [@media(pointer:coarse)_and_(max-height:480px)]:px-3 [@media(pointer:coarse)_and_(max-height:480px)]:py-3.5 sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-white/28" />
          <div className="absolute inset-y-[14px] left-[14px] right-[14px] rounded-[1.4rem] border border-[#d9c8a9] [@media(pointer:coarse)_and_(max-height:480px)]:top-[10px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[10px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[10px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[10px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.1rem] lg:left-[38px] lg:rounded-[1.6rem]" />
          <div className="pointer-events-none absolute bottom-[18px] left-[12px] right-[12px] top-[18px] rounded-[1.25rem] border border-white/32 [@media(pointer:coarse)_and_(max-height:480px)]:top-[14px] [@media(pointer:coarse)_and_(max-height:480px)]:bottom-[20px] [@media(pointer:coarse)_and_(max-height:480px)]:left-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:right-[8px] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1rem] lg:left-[34px] lg:right-[22px] lg:rounded-[1.45rem]" />

          <div className="relative flex flex-col gap-6 [@media(pointer:coarse)_and_(max-height:480px)]:gap-3.5">
            <div className="flex flex-col items-center text-center">
              <div className="flex w-full items-center justify-between gap-4 px-1 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:px-[0.95rem] lg:pl-[20px] lg:pr-0">
                <div className="flex items-center gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-2.5 text-left">
                  <span className="flex h-[5.2rem] w-[5.2rem] items-center justify-center rounded-[1.8rem] border-2 border-[#efcf78] bg-[#f7eac5] text-[2.6rem] shadow-[0_14px_24px_rgba(0,0,0,0.08)] transition-transform group-hover:-translate-y-0.5 [@media(pointer:coarse)_and_(max-height:480px)]:h-[4rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[4rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.3rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[2rem] sm:h-[5.8rem] sm:w-[5.8rem] sm:text-[3rem]">
                    {profile.avatar}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[0.68rem] font-black uppercase tracking-[0.34em] text-[#a96e43] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.56rem] [@media(pointer:coarse)_and_(max-height:480px)]:tracking-[0.22em]">
                      Duelista
                    </span>
                    <span className="mt-1 block font-serif text-[1.55rem] font-black uppercase leading-none text-[#5b2408] [@media(pointer:coarse)_and_(max-height:480px)]:text-[1.18rem] sm:text-[1.8rem]">
                      {displayName}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={onEditProfile}
                  className="group relative flex h-[4.6rem] w-[4.6rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[1.45rem] border-[2px] border-[#2d6b8f] bg-[#4f9fcc] px-0 text-[0.66rem] font-black uppercase tracking-[0.08em] text-[#f3fbff] shadow-[0_5px_0_#28597d,0_14px_22px_rgba(35,74,110,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#5ba8d4] hover:shadow-[0_7px_0_#28597d,0_18px_24px_rgba(35,74,110,0.22)] active:translate-y-[3px] active:shadow-[0_2px_0_#28597d,0_8px_12px_rgba(35,74,110,0.14)] [@media(pointer:coarse)_and_(max-height:480px)]:h-[3.7rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-[3.7rem] [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.15rem] [@media(pointer:coarse)_and_(max-height:480px)]:text-[0.56rem] sm:h-[4.95rem] sm:w-[4.95rem] sm:rounded-[1.6rem]"
                >
                  <span className="pointer-events-none absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-15 mix-blend-soft-light" />
                  <span className="pointer-events-none absolute inset-x-3 top-0 z-0 h-[3px] rounded-b-full bg-white/24" />
                  <span className="pointer-events-none absolute inset-[4px] z-0 rounded-[1.1rem] border border-white/18 [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[0.9rem] sm:rounded-[1.25rem]" />
                  <span className="relative z-10 text-[1.28rem] leading-none sm:text-[1.42rem]">✏️</span>
                  <span className="relative z-10 mt-1 leading-none">Perfil</span>
                </Button>
              </div>

              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="relative mt-5 flex flex-col items-center [@media(pointer:coarse)_and_(max-height:480px)]:mt-3"
              >
                <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 rounded-full bg-[#f1d07f]/18 blur-3xl" />
                    <h1 className="relative font-serif text-[3.3rem] font-black uppercase leading-[0.86] text-amber-950 drop-shadow-[0_2px_0_rgba(255,248,220,0.45)] [text-shadow:0_0_18px_rgba(238,196,94,0.18),0_4px_14px_rgba(214,165,63,0.16)] [@media(pointer:coarse)_and_(max-height:480px)]:text-[3.92rem] [@media(pointer:coarse)_and_(max-height:480px)]:leading-none sm:text-[4.8rem] lg:text-[5.7rem]">
                  <span className="block [@media(pointer:coarse)_and_(max-height:480px)]:inline">SYLLABLE</span>
                  <span className="hidden [@media(pointer:coarse)_and_(max-height:480px)]:inline"> </span>
                  <span className="block [@media(pointer:coarse)_and_(max-height:480px)]:inline">BATTLE</span>
                </h1>
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.35 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
                  className="relative mt-3 h-1.5 w-32 origin-center rounded-full bg-[#e2a438] shadow-[0_0_18px_rgba(226,164,56,0.28)] [@media(pointer:coarse)_and_(max-height:480px)]:mt-2"
                />
              </motion.div>
            </div>

            <div className="rounded-[1.9rem] border border-[#d8c9b0] bg-white/36 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [@media(pointer:coarse)_and_(max-height:480px)]:mx-[0.95rem] [@media(pointer:coarse)_and_(max-height:480px)]:w-auto [@media(pointer:coarse)_and_(max-height:480px)]:rounded-[1.3rem] [@media(pointer:coarse)_and_(max-height:480px)]:px-2.75 [@media(pointer:coarse)_and_(max-height:480px)]:pt-2.75 [@media(pointer:coarse)_and_(max-height:480px)]:pb-4.25 lg:ml-[20px] sm:p-5">
              <div className="grid gap-4 [@media(pointer:coarse)_and_(max-height:480px)]:gap-x-2.5 [@media(pointer:coarse)_and_(max-height:480px)]:gap-y-3.5 sm:grid-cols-2">
                <CabinetButton
                  label="Jogar Solo"
                  detail="Desafie o bot"
                  icon={<span className="text-[1.95rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] sm:text-[2.2rem]">⚔️</span>}
                  tone="solo"
                  onClick={() => onSelectMode("bot")}
                />
                <CabinetButton
                  label="Jogar Online"
                  detail="Enfrente outro duelista"
                  icon={<span className="text-[1.95rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] sm:text-[2.2rem]">🛡️</span>}
                  tone="online"
                  onClick={() => onSelectMode("multiplayer")}
                />
                <CabinetButton
                  label="Minha Colecao"
                  detail="Veja seus decks"
                  icon={<span className="text-[1.9rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] sm:text-[2.15rem]">📚</span>}
                  tone="collection"
                  onClick={onOpenCollection}
                />
                <CabinetButton
                  label="Open Packs"
                  detail="Novas cartas em breve"
                  icon={<span className="text-[1.9rem] drop-shadow-[0_4px_6px_rgba(255,255,255,0.2)] sm:text-[2.15rem]">🎴</span>}
                  tone="packs"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
