"use client";

import React, { useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
  Clock,
  Sparkles,
  HelpCircle,
  Layers,
  Check,
  X,
} from "lucide-react";
import { GameBoard, Team } from "@/lib/game-data";
import { triggerConfetti } from "@/lib/confetti";

interface ResultOverlayProps {
  isOpen: boolean;
  isCorrect: boolean;
  board: GameBoard;
  team: Team;
  userAnswers: Record<string, string>;
  stepResults: Record<string, boolean>;
  timeSpentSeconds: number;
  dbSyncStatus?: "idle" | "saving" | "saved" | "error";
  onContinue: () => void;
  onRetry: () => void;
  onGoToBoardList: () => void;
  hasNextBoard: boolean;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  isOpen,
  isCorrect,
  board,
  team,
  userAnswers,
  stepResults,
  timeSpentSeconds,
  dbSyncStatus = "idle",
  onContinue,
  onRetry,
  onGoToBoardList,
  hasNextBoard,
}) => {
  useEffect(() => {
    if (isOpen && isCorrect) {
      triggerConfetti();
    }
  }, [isOpen, isCorrect]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} menit ${secs} detik`;
  };

  const correctCount = Object.values(stepResults).filter(Boolean).length;
  const totalCount = board.steps.length;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 backdrop-blur-2xl overflow-y-auto ${
        isCorrect ? "bg-[#061e14]/90" : "bg-[#25080c]/90"
      }`}
    >
      {/* Background ambient light */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-40 ${
          isCorrect
            ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.3)_0%,transparent_70%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.3)_0%,transparent_70%)]"
        }`}
      />

      <div
        className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all duration-300 text-center z-10 my-auto ${
          isCorrect
            ? "bg-slate-950/95 border-emerald-500/60 shadow-emerald-500/20 animate-success-pulse"
            : "bg-slate-950/95 border-rose-500/60 shadow-rose-500/20 animate-shake"
        }`}
      >
        {/* Large Result Icon */}
        <div className="flex justify-center mb-4">
          {isCorrect ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-4 border-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/40">
              <XCircle className="w-12 h-12 text-rose-400 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Main Title Banner */}
        <h2
          className={`text-3xl sm:text-5xl font-black tracking-tight mb-2 ${
            isCorrect
              ? "text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              : "text-rose-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]"
          }`}
        >
          {isCorrect ? "JAWABAN BENAR!" : "JAWABAN SALAH!"}
        </h2>

        {/* Variable by Variable Result Verification */}
        <div
          className={`p-4 rounded-2xl border mb-6 text-left text-xs font-mono ${
            isCorrect
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-rose-950/20 border-rose-500/30"
          }`}
        >
          <div
            className={`flex items-center justify-between font-bold mb-3 pb-2 border-b ${
              isCorrect
                ? "text-emerald-300 border-emerald-900/60"
                : "text-rose-300 border-rose-900/60"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Hasil Pemeriksaan {totalCount} Variabel:</span>
            </span>
            <span>
              {correctCount} / {totalCount} Benar
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {board.steps.map((step) => {
              const isVarCorrect = !!stepResults[step.variable];
              const submitted = userAnswers[step.variable] || "-";

              return (
                <div
                  key={step.variable}
                  className={`flex-1 min-w-[75px] max-w-[120px] p-2.5 rounded-xl border flex flex-col justify-between items-center text-center ${
                    isVarCorrect
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/50 border-rose-500/50 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-xs mb-1">
                    <span>{step.variable}</span>
                    {isVarCorrect ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <div className="text-sm font-black font-mono">
                    {submitted}
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {isVarCorrect ? "Benar" : "Salah"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isCorrect ? (
            <>

              <button
                onClick={onGoToBoardList}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Kembali ke Daftar Papan</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onRetry}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 transition-all hover:scale-105 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Coba Kembali (Perbaiki Jawaban)</span>
              </button>

              <button
                onClick={onGoToBoardList}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Pilih Papan Lain</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
