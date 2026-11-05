"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  Send,
  Lightbulb,
  Edit3,
  Award,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react";
import { GameBoard, Team } from "@/lib/game-data";

interface GameBoardArenaProps {
  board: GameBoard;
  team: Team;
  onBackToBoards: () => void;
  onSubmitAnswer: (
    userAnswers: Record<string, string>,
    timeSpentSeconds: number
  ) => void;
  isAlreadySolved: boolean;
}

export const GameBoardArena: React.FC<GameBoardArenaProps> = ({
  board,
  team,
  onBackToBoards,
  onSubmitAnswer,
  isAlreadySolved,
}) => {
  // State for each of the 5 variables: A, B, C, D, E
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    board.steps.forEach((step) => {
      initial[step.variable] = "";
    });
    return initial;
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [showClue, setShowClue] = useState<boolean>(false);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleInputChange = (variable: string, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [variable]: value,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  // Count how many variables have been filled
  const filledCount = board.steps.filter(
    (step) => (userAnswers[step.variable] || "").trim() !== ""
  ).length;

  const totalVariables = board.steps.length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if ALL variables are filled
    const missingVars = board.steps
      .filter((step) => (userAnswers[step.variable] || "").trim() === "")
      .map((step) => step.variable);

    if (missingVars.length > 0) {
      setValidationError(
        `Seluruh ${totalVariables} variabel harus diisi! Variabel yang belum diisi: ${missingVars.join(
          ", "
        )}`
      );
      return;
    }

    setValidationError(null);
    onSubmitAnswer(userAnswers, secondsElapsed);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn pb-24">
      {/* Top Bar Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {board.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${board.difficultyColor}`}
              >
                {board.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Timer & Playing Team */}
        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-slate-400">Tim:</span>
            <span className="text-xs font-bold text-slate-200">{team.name}</span>
          </div>

        </div>
      </div>

      {/* Main Challenge Area */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Hitung dan Isi Nilai Seluruh 5 Variabel (A, B, C, D, E)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Semua variabel dari A hingga E wajib diisi. Jawaban dinyatakan <strong>BENAR</strong> jika kelima variabel tepat, dan <strong>SALAH</strong> jika salah satu variabel keliru.
            </p>
          </div>

        </div>

        {/* 5 Variable Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {board.steps.map((step) => {
            const val = userAnswers[step.variable] || "";
            const isFilled = val.trim() !== "";

            return (
              <div
                key={step.stepIndex}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${isFilled
                    ? "bg-slate-950/90 border-blue-500/50 shadow-md shadow-blue-500/10"
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                  }`}
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-2">

                    {isFilled ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                        <Check className="w-3 h-3" /> Terisi
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 font-mono">
                        Wajib Diisi
                      </span>
                    )}
                  </div>

                  {/* Formula Display */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-base font-black text-white shrink-0">
                      {step.variable}
                    </div>
                    <div className="text-lg font-black font-mono text-white tracking-wide truncate">
                      = {step.formula}
                    </div>
                  </div>
                  <br></br>
                </div>

                {/* Input for this Variable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Nilai Variabel [{step.variable}]:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={`Jawaban ${step.variable}`}
                      value={val}
                      onChange={(e) => handleInputChange(step.variable, e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl bg-slate-900 border text-center font-mono font-bold text-lg text-white placeholder:text-slate-600 focus:outline-none transition-all ${isFilled
                          ? "border-blue-500/80 bg-blue-950/20 text-blue-200"
                          : "border-slate-700 focus:border-blue-500"
                        }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      >
        <Send className="w-5 h-5" />
        <span>SUBMIT JAWABAN (PERIKSA HASIL)</span>
      </button>
    </div>
  );
};
