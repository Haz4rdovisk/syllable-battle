import React from "react";
import { Button } from "../ui/button";
import { GameMode, PlayerProfile, normalizePlayerName } from "../../types/game";
import { motion } from "motion/react";
import { Sword, Users, Settings } from "lucide-react";

interface MenuProps {
  onSelectMode: (mode: GameMode) => void;
  profile: PlayerProfile;
  onEditProfile: () => void;
}

export const Menu: React.FC<MenuProps> = ({ onSelectMode, profile, onEditProfile }) => {
  const displayName = normalizePlayerName(profile.name);
  const buildLabel = (__APP_BUILD__ || "local").slice(0, 7).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full w-full flex-col items-center justify-center gap-8 overflow-y-auto p-4 no-scrollbar sm:gap-12"
    >
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-amber-200/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/30 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
        Build {buildLabel}
      </div>

      <div className="space-y-4 text-center sm:space-y-6">
        <motion.div
          initial={{ scale: 0.8, rotate: -5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-full bg-amber-900/40 blur-3xl" />
          <h1 className="relative bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text font-serif text-6xl font-black tracking-tighter text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] sm:text-8xl">
            SYLLABLE
            <br />
            BATTLE
          </h1>
        </motion.div>
        <p className="mx-auto max-w-md font-serif text-sm italic tracking-widest text-amber-100/60 sm:text-base">
          Complete as palavras para atacar seu oponente.
        </p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-6 px-4 sm:grid-cols-2">
        <Button
          onClick={() => onSelectMode("bot")}
          className="group h-28 rounded-[32px] border-4 border-[#d4af37] bg-gradient-to-br from-[#5d4037] to-[#3e2723] shadow-[0_12px_24px_rgba(0,0,0,0.4)] transition-all active:translate-y-1 hover:from-[#6d4c41] hover:to-[#4e342e]"
        >
          <div className="flex flex-col items-center gap-2">
            <Sword className="h-10 w-10 text-amber-400 transition-transform group-hover:scale-110" />
            <span className="font-serif text-xl font-black text-amber-100">JOGAR SOLO</span>
          </div>
        </Button>

        <Button
          onClick={() => onSelectMode("multiplayer")}
          className="group h-28 rounded-[32px] border-4 border-[#d4af37] bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] shadow-[0_12px_24px_rgba(0,0,0,0.4)] transition-all active:translate-y-1 hover:from-[#388e3c] hover:to-[#2e7d32]"
        >
          <div className="flex flex-col items-center gap-2">
            <Users className="h-10 w-10 text-emerald-300 transition-transform group-hover:scale-110" />
            <span className="font-serif text-xl font-black text-emerald-50">JOGAR ONLINE</span>
          </div>
        </Button>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/15 bg-black/20 px-4 py-2 shadow-[0_12px_24px_rgba(0,0,0,0.25)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/30 bg-amber-100/10 text-2xl shadow-inner">
            {profile.avatar}
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-100/40">Duelista</div>
            <div className="font-serif text-lg font-black tracking-tight text-amber-100">{displayName}</div>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onEditProfile}
          className="font-serif italic text-amber-100/40 transition-colors hover:text-amber-100"
        >
          <Settings className="mr-2 h-5 w-5" />
          Editar Perfil
        </Button>
      </div>
    </motion.div>
  );
};
