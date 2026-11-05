"use client";

import React from "react";
import { Trophy, Volume2, VolumeX, RotateCcw, Users, Layers, PlayCircle } from "lucide-react";
import { Team } from "@/lib/game-data";

interface NavbarProps {
  currentStep: "team_select" | "board_select" | "playing";
  selectedTeam: Team | null;
  onStepChange: (step: "team_select" | "board_select" | "playing") => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetAll: () => void;
  solvedCount: number;
  totalScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  selectedTeam,
  onStepChange,
  isMuted,
  onToggleMute,
  onResetAll,
  solvedCount,
  totalScore,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-white">BOF</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold tracking-wide">
                BATTLE OF FACULTIES
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Number Chains Arena
            </p>
          </div>
        </div>

        {/* Step Flow Indicators */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onStepChange("team_select")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              currentStep === "team_select"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Tim</span>
          </button>

          <span className="text-slate-600">/</span>

          <button
            onClick={() => {
              if (selectedTeam) onStepChange("board_select");
            }}
            disabled={!selectedTeam}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              currentStep === "board_select"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : !selectedTeam
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Papan Soal</span>
          </button>

          <span className="text-slate-600">/</span>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg ${
              currentStep === "playing"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-600"
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>3. Pengerjaan</span>
          </div>
        </nav>

      </div>
    </header>
  );
};
