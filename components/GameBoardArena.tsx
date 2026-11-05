"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Clock,
  Send,
  HelpCircle,
  Lightbulb,
  Edit3,
  Award,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Flame,
  Delete,
} from "lucide-react";
import { GameBoard, Team } from "@/lib/game-data";

interface GameBoardArenaProps {
  board: GameBoard;
  team: Team;
  onBackToBoards: () => void;
  onSubmitAnswer: (userAnswer: string, timeSpentSeconds: number) => void;
  isAlreadySolved: boolean;
}

export const GameBoardArena: React.FC<GameBoardArenaProps> = ({
  board,
  team,
  onBackToBoards,
  onSubmitAnswer,
  isAlreadySolved,
}) => {
  const [answerInput, setAnswerInput] = useState<string>("");
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [showClue, setShowClue] = useState<boolean>(false);
  const [scratchNotes, setScratchNotes] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [board.id]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim()) return;
    onSubmitAnswer(answerInput.trim(), secondsElapsed);
  };

  const handleKeypadPress = (val: string) => {
    if (val === "BACKSPACE") {
      setAnswerInput((prev) => prev.slice(0, -1));
    } else if (val === "CLEAR") {
      setAnswerInput("");
    } else if (val === "-") {
      if (!answerInput.startsWith("-")) {
        setAnswerInput((prev) => "-" + prev);
      } else {
        setAnswerInput((prev) => prev.slice(1));
      }
    } else {
      setAnswerInput((prev) => prev + val);
    }
  };

  const handleScratchChange = (variable: string, val: string) => {
    setScratchNotes((prev) => ({
      ...prev,
      [variable]: val,
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToBoards}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Papan</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">{board.title}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${board.difficultyColor}`}>
                {board.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Timer & Playing Team */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs text-slate-400">Tim:</span>
            <span className="text-xs font-bold text-slate-200">{team.name}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-400 font-mono font-bold text-sm">
            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        </div>
      </div>

      {/* Main Chain Challenge Box */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Selesaikan Rantai Menuju Nilai Variabel [{board.targetVariable}]
            </h2>
          </div>
        </div>

        {/* Optional Clue Banner */}
        {showClue && board.clue && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-300">Petunjuk Strategi:</strong> {board.clue}
            </div>
          </div>
        )}

        {/* Visual Chain Nodes */}
        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {board.steps.map((step, idx) => {
              const isTarget = step.variable === board.targetVariable;

              return (
                <div
                  key={step.stepIndex}
                  className={`relative p-5 rounded-2xl border transition-all ${
                    isTarget
                      ? "bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-blue-500 shadow-xl shadow-blue-500/20 scale-[1.02]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Step Index Pill */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      Langkah {step.stepIndex}
                    </span>

                    {isTarget && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40 animate-pulse">
                        🎯 TARGET JAWABAN
                      </span>
                    )}
                  </div>

                  {/* Variable & Formula Display */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xl font-black text-white shrink-0 shadow-inner">
                      {step.variable}
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-wide">
                      = {step.formula}
                    </div>
                  </div>

                  {/* Context Explanation */}
                  <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                    {idx === 0
                      ? "Nilai awal rantai angka"
                      : `Gunakan hasil variabel sebelumnya untuk menyelesaikan ${step.variable}`}
                  </p>

                  {/* Scratchpad Quick Note per variable */}
                  {showScratchpad && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Coretan hasil {step.variable}:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 70"
                        value={scratchNotes[step.variable] || ""}
                        onChange={(e) => handleScratchChange(step.variable, e.target.value)}
                        className="w-full text-xs font-mono px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Scratchpad Drawer if expanded */}
        {showScratchpad && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
              <Edit3 className="w-4 h-4 text-blue-400" />
              <span>Papan Coretan Bersama (Scratchpad CoC)</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Catat kalkulasi silang seperti anggota tim di CoC agar tidak ada tanda bagi/tambah yang terlewat.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {board.steps.map((st) => (
                <div key={st.stepIndex} className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">{st.variable} =</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 truncate">
                    {scratchNotes[st.variable] || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Answer Submission Center */}
      <div className="max-w-2xl mx-auto rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wide uppercase mb-2">
            <Flame className="w-3.5 h-3.5 text-blue-400" />
            Final Answer Submission
          </div>
          <h3 className="text-2xl font-black text-white">
            Berapakah Nilai Akhir untuk Variabel [{board.targetVariable}]?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Masukkan angka bulat hasil perhitungan akhir rantai Number Chains di bawah ini.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Main Input Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <span className="font-mono text-2xl font-bold text-slate-500">
                {board.targetVariable} =
              </span>
            </div>

            <input
              ref={inputRef}
              type="number"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Ketik jawaban..."
              className="w-full pl-20 pr-6 py-4 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-white font-mono text-3xl font-black placeholder:text-slate-600 transition-all text-center tracking-wider focus:outline-none"
            />
          </div>

          {/* Quick On-Screen Touch / Click Keypad */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="grid grid-cols-4 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0"].map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => handleKeypadPress(k)}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 text-slate-200 font-mono font-bold text-lg transition-all cursor-pointer hover:border-slate-700"
                >
                  {k}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleKeypadPress("BACKSPACE")}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-rose-900 border border-slate-800 text-rose-400 font-mono font-bold text-sm flex items-center justify-center transition-all cursor-pointer"
                title="Hapus satu angka"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleKeypadPress("CLEAR")}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Reset Kolom Jawaban
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!answerInput.trim()}
            className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
              answerInput.trim()
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-slate-800 text-slate-500 border border-slate-700/80 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
            <span>SUBMIT JAWABAN (PERIKSA HASIL)</span>
          </button>
        </form>

      </div>
    </div>
  );
};
