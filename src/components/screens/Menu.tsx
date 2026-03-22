import React from "react";
import { Button } from "../ui/button";
import { GameMode } from "../../types/game";
import { motion } from "motion/react";
import { Sword, Users, Play, Settings, Scroll } from "lucide-react";

interface MenuProps {
  onSelectMode: (mode: GameMode) => void;
}

export const Menu: React.FC<MenuProps> = ({ onSelectMode }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full w-full gap-8 sm:gap-12 p-4 overflow-y-auto no-scrollbar"
    >
      <div className="text-center space-y-4 sm:space-y-6">
        <motion.div
          initial={{ scale: 0.8, rotate: -5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-amber-900/40 blur-3xl rounded-full" />
          <h1 className="relative text-6xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] font-serif">
            SYLLABLE<br />BATTLE
          </h1>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-[#3e2723] border-2 border-[#d4af37] rounded-full shadow-2xl">
            <span className="text-[10px] font-black tracking-[0.4em] text-amber-400 uppercase">Versão 1.0</span>
          </div>
        </motion.div>
        <p className="text-amber-100/60 font-serif italic tracking-widest text-sm sm:text-base max-w-md mx-auto">
          Complete as palavras para atacar seu oponente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl px-4">
        <Button 
          onClick={() => onSelectMode("bot")}
          className="h-28 rounded-[32px] bg-gradient-to-br from-[#5d4037] to-[#3e2723] hover:from-[#6d4c41] hover:to-[#4e342e] border-4 border-[#d4af37] shadow-[0_12px_24px_rgba(0,0,0,0.4)] active:translate-y-1 transition-all group"
        >
          <div className="flex flex-col items-center gap-2">
            <Sword className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-serif font-black text-xl text-amber-100">JOGAR SOLO</span>
          </div>
        </Button>

        <Button 
          onClick={() => onSelectMode("multiplayer")}
          className="h-28 rounded-[32px] bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] hover:from-[#388e3c] hover:to-[#2e7d32] border-4 border-[#d4af37] shadow-[0_12px_24px_rgba(0,0,0,0.4)] active:translate-y-1 transition-all group"
        >
          <div className="flex flex-col items-center gap-2">
            <Users className="w-10 h-10 text-emerald-300 group-hover:scale-110 transition-transform" />
            <span className="font-serif font-black text-xl text-emerald-50">JOGAR ONLINE</span>
          </div>
        </Button>

        <Button 
          onClick={() => onSelectMode("local")}
          className="h-28 rounded-[32px] bg-gradient-to-br from-[#4527a0] to-[#311b92] hover:from-[#512da8] hover:to-[#4527a0] border-4 border-[#d4af37] shadow-[0_12px_24px_rgba(0,0,0,0.4)] active:translate-y-1 transition-all group sm:col-span-2"
        >
          <div className="flex flex-col items-center gap-2">
            <Scroll className="w-10 h-10 text-purple-300 group-hover:scale-110 transition-transform" />
            <span className="font-serif font-black text-xl text-purple-50">TREINO NA TAVERNA</span>
          </div>
        </Button>
      </div>

      <div className="flex gap-8">
        <Button variant="ghost" className="text-amber-100/40 hover:text-amber-100 transition-colors font-serif italic">
          <Settings className="w-5 h-5 mr-2" />
          Configurações
        </Button>
      </div>
    </motion.div>
  );
};
