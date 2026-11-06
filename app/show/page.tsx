"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Eye,
  EyeOff,
  Maximize2,
  X,
  Target,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Sliders,
} from "lucide-react";
import { BOARDS_DATA, GameBoard, TEAMS_DATA } from "@/lib/game-data";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import {
  fetchSubmissionsFromSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";

// Crest Ornament with silver wings and cyan/turquoise jewel (matching example image)
const BoardCrest = () => (
  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center">
    <svg
      width="100"
      height="26"
      viewBox="0 0 100 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="crestWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <radialGradient id="crestGemGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="35%" stopColor="#06b6d4" />
          <stop offset="85%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#0e7490" />
        </radialGradient>
        <linearGradient id="crestSilverRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Left Wing */}
      <path
        d="M 50 14 L 38 6 L 22 7 L 12 11 L 4 17 L 18 15 L 30 16 L 50 17 Z"
        fill="url(#crestWingGrad)"
        stroke="#1e293b"
        strokeWidth="1"
      />
      <path
        d="M 44 9 L 28 8 L 16 12 L 26 13 L 42 12 Z"
        fill="#ffffff"
        opacity="0.6"
      />

      {/* Right Wing */}
      <path
        d="M 50 14 L 62 6 L 78 7 L 88 11 L 96 17 L 82 15 L 70 16 L 50 17 Z"
        fill="url(#crestWingGrad)"
        stroke="#1e293b"
        strokeWidth="1"
      />
      <path
        d="M 56 9 L 72 8 L 84 12 L 74 13 L 58 12 Z"
        fill="#ffffff"
        opacity="0.6"
      />

      {/* Center Jewel Outer Bezel */}
      <ellipse
        cx="50"
        cy="13"
        rx="9.5"
        ry="8.5"
        fill="url(#crestSilverRing)"
        stroke="#0f172a"
        strokeWidth="1"
      />

      {/* Center Turquoise Gem */}
      <ellipse cx="50" cy="13" rx="7.5" ry="6.5" fill="url(#crestGemGrad)" />

      {/* Jewel Gloss Highlight */}
      <ellipse
        cx="48"
        cy="10.5"
        rx="2.8"
        ry="1.4"
        fill="#ffffff"
        opacity="0.9"
      />
    </svg>
  </div>
);

// Bottom Bracket Accent (matching example image)
const BoardBottomAccent = () => (
  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
    <svg
      width="54"
      height="12"
      viewBox="0 0 54 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 8 0 L 22 4 L 27 10 L 32 4 L 46 0 L 27 3 Z"
        fill="#94a3b8"
        stroke="#334155"
        strokeWidth="1"
      />
      <circle cx="27" cy="4" r="1.2" fill="#ffffff" />
    </svg>
  </div>
);

export default function ShowPapanPage() {
  const [showSolutions, setShowSolutions] = useState<boolean>(false);
  const [activeModalBoard, setActiveModalBoard] = useState<GameBoard | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Leaderboard progress state
  const [teamProgress, setTeamProgress] = useState<
    Record<
      string,
      {
        solvedBoards: number[];
        totalScore: number;
        boardTimes: Record<number, number>;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        solvedBoards: number[];
        totalScore: number;
        boardTimes: Record<number, number>;
      }
    > = {};
    TEAMS_DATA.forEach((t) => {
      initial[t.id] = {
        solvedBoards: [],
        totalScore: 0,
        boardTimes: {},
      };
    });
    return initial;
  });

  // Sync leaderboard with Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchSubmissionsFromSupabase().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setTeamProgress((prev) => {
          const updated = { ...prev };
          res.data.forEach((sub) => {
            if (!updated[sub.team_id]) {
              updated[sub.team_id] = {
                solvedBoards: [],
                totalScore: 0,
                boardTimes: {},
              };
            }
            if (sub.is_correct) {
              if (!updated[sub.team_id].solvedBoards.includes(sub.board_id)) {
                updated[sub.team_id].solvedBoards.push(sub.board_id);
                updated[sub.team_id].totalScore += sub.points_awarded;
              }
              if (
                !updated[sub.team_id].boardTimes[sub.board_id] ||
                sub.time_spent_seconds < updated[sub.team_id].boardTimes[sub.board_id]
              ) {
                updated[sub.team_id].boardTimes[sub.board_id] = sub.time_spent_seconds;
              }
            }
          });
          return updated;
        });
      }
    });
  }, []);

  // Set Timer State
  const [timerDuration, setTimerDuration] = useState<number>(300); // 5 menit default
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>("5");
  const [customSeconds, setCustomSeconds] = useState<string>("0");
  const [timeUpAlert, setTimeUpAlert] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Timer countdown effect without button/tick sounds
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setTimeUpAlert(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Click outside listener for Set Timer popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsConfigOpen(false);
      }
    };
    if (isConfigOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isConfigOpen]);

  const togglePlayPause = () => {
    if (timeLeft === 0) return;
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timerDuration);
    setTimeUpAlert(false);
  };

  const handleSetPreset = (seconds: number) => {
    setTimerDuration(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
    setTimeUpAlert(false);
    setCustomMinutes(Math.floor(seconds / 60).toString());
    setCustomSeconds((seconds % 60).toString());
    setIsConfigOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(customMinutes, 10) || 0;
    const s = parseInt(customSeconds, 10) || 0;
    const total = Math.max(10, m * 60 + s);
    setTimerDuration(total);
    setTimeLeft(total);
    setIsRunning(false);
    setTimeUpAlert(false);
    setIsConfigOpen(false);
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b14] bg-grid-pattern text-slate-100 flex flex-col select-none">
      {/* Top Navigation Bar with exact Trophy icon */}
      <header className="h-14 sm:h-16 shrink-0 border-b border-slate-800/90 bg-[#070b14]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30">
        {/* Left: Back to arena */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Kembali ke Arena</span>
            <span className="sm:hidden">Kembali</span>
          </Link>
        </div>

        {/* Center: Title with exact requested icon */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm lg:text-base tracking-wider text-white">
                PAPAN SOAL
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider hidden sm:inline-block">
                Battle of Faculties
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions (Set Timer & Buka Kunci) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Set Timer Widget */}
          <div className="relative" ref={popoverRef}>
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm">
              {/* Trigger Button: Opens Time Selector Popover */}
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isConfigOpen
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
                title="Atur Durasi Timer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold">Set Timer</span>
                <Sliders className="w-3 h-3 text-slate-400" />
              </button>

              {/* Digital Countdown Display */}
              <div
                className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-md transition-all ${
                  timeLeft === 0
                    ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse"
                    : timeLeft <= 10 && isRunning
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50 animate-pulse"
                    : isRunning
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-slate-950 text-slate-200 border border-slate-800"
                }`}
              >
                {formatTimerDisplay(timeLeft)}
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                onClick={togglePlayPause}
                disabled={timeLeft === 0}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isRunning
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                title={isRunning ? "Jeda Timer" : "Mulai Timer"}
              >
                {isRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>

              {/* Reset Timer Button */}
              <button
                onClick={handleResetTimer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset Timer ke Waktu Awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Set Timer Popover / Dropdown */}
            {isConfigOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 backdrop-blur-xl animate-fadeIn">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Pengaturan Durasi Timer</span>
                  </div>
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Pilihan Cepat (Preset):
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "1 Menit", sec: 60 },
                      { label: "2 Menit", sec: 120 },
                      { label: "3 Menit", sec: 180 },
                      { label: "5 Menit", sec: 300 },
                      { label: "7 Menit", sec: 420 },
                      { label: "10 Menit", sec: 600 },
                    ].map((preset) => {
                      const isActive = timerDuration === preset.sec;
                      return (
                        <button
                          key={preset.sec}
                          onClick={() => handleSetPreset(preset.sec)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3 text-white" />}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Time Input */}
                <form onSubmit={handleApplyCustom} className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Durasi Khusus:
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Menit</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-slate-500 font-bold mt-3">:</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Detik</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={customSeconds}
                        onChange={(e) => setCustomSeconds(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-600/30"
                  >
                    Terapkan Waktu
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Leaderboard Button - terletak di samping kiri button "Buka Kunci" */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 border border-amber-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Leaderboard</span>
            <span className="sm:hidden">Rank</span>
          </button>

          {/* Solution Toggle Button (Buka Kunci / Tutup Kunci) */}
          <button
            onClick={() => setShowSolutions(!showSolutions)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showSolutions
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {showSolutions ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Tutup Kunci</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Buka Kunci</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Floating Time Up Banner */}
      {timeUpAlert && (
        <div className="absolute top-16 right-4 sm:right-6 z-40 bg-rose-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-2xl border border-rose-400 flex items-center gap-2 animate-bounce">
          <span>⏰ WAKTU HABIS!</span>
          <button onClick={() => setTimeUpAlert(false)} className="ml-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container: 5 Boards Displayed Sejajar (Left to Right) with NO SCROLL */}
      <main className="flex-1 min-h-0 w-full p-2 sm:p-3 lg:p-4 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3.5 h-full w-full">
          {BOARDS_DATA.map((board: GameBoard) => {
            const isTargetLast = board.steps.length % 2 !== 0;

            return (
              <div
                key={board.id}
                onClick={() => setActiveModalBoard(board)}
                className="group relative h-full flex flex-col cursor-pointer transition-all duration-300 hover:scale-[1.012] select-none"
                title="Klik untuk memperbesar tampilan papan ini"
              >
                {/* Metallic Fantasy Frame (Outer Ring) */}
                <div className="relative h-full flex flex-col rounded-2xl bg-gradient-to-b from-slate-300 via-slate-500 to-slate-800 p-1.5 sm:p-2 shadow-2xl border-2 border-slate-400/90 overflow-hidden">
                  {/* Outer Bevel Highlight */}
                  <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/40 shadow-inner" />

                  {/* Top Ornate Wing & Turquoise Gem Crest */}
                  <BoardCrest />

                  {/* Bottom Ornate Metallic Accent */}
                  <BoardBottomAccent />

                  {/* Corner Rivet Details */}
                  <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 shadow-xs" />
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 shadow-xs" />
                  <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 shadow-xs" />
                  <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 shadow-xs" />

                  {/* Inner White Board Canvas (as in user's example image) */}
                  <div className="relative h-full w-full flex flex-col bg-white rounded-xl p-2 sm:p-2.5 overflow-hidden shadow-inner justify-between border border-slate-300">
                    {/* Board Title Header */}
                    <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-200 shrink-0">
                      <div>
                        <div className="font-black text-xs sm:text-sm text-slate-900 tracking-wider font-sans uppercase">
                          BOARD {board.id}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 truncate max-w-[120px] font-sans">
                          {board.title.replace(/^Papan \d+:\s*/, "")}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[9px] sm:text-[10px] font-black font-sans px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          +{board.points}
                        </span>
                        <div className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Question Cards Grid (matching style from example image) */}
                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2 flex-1 my-1 content-stretch overflow-hidden">
                      {board.steps.map((step, idx) => {
                        const isTarget = step.variable === board.targetVariable;
                        const spanTwo = isTargetLast && idx === board.steps.length - 1;

                        return (
                          <div
                            key={step.stepIndex}
                            className={`bg-white border border-slate-300 rounded-lg p-1 sm:p-1.5 flex flex-col items-center justify-center text-center shadow-xs transition-colors relative ${
                              spanTwo ? "col-span-2 bg-slate-50/60" : ""
                            }`}
                          >
                            {/* Target Variable Indicator */}
                            {isTarget && (
                              <span className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                <Target className="w-2.5 h-2.5" />
                              </span>
                            )}

                            {/* Top: Expression / Variable */}
                            <div className="font-serif font-black text-slate-900 text-xs sm:text-sm lg:text-base leading-none">
                              {step.variable}
                            </div>

                            {/* Middle: Equals Sign */}
                            <div className="font-serif font-black text-slate-700 text-xs sm:text-sm my-0.5 sm:my-1 leading-none">
                              =
                            </div>

                            {/* Bottom: Formula / Expression */}
                            <div className="font-serif font-bold text-slate-900 text-[10px] sm:text-xs lg:text-sm leading-tight text-center px-0.5">
                              {step.formula}
                            </div>

                            {/* Solution Pill (shown when toggled ON) */}
                            {showSolutions && (
                              <div className="mt-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] sm:text-[10px] font-mono font-bold">
                                = {step.result}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Fullscreen Inspection Modal for Single Board (Exact Replica of User's Example Image) */}
      {activeModalBoard && (
        <div
          onClick={() => setActiveModalBoard(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[460px] h-[92vh] max-h-[760px] flex flex-col rounded-3xl bg-gradient-to-b from-slate-200 via-slate-400 to-slate-700 p-2 sm:p-3 shadow-2xl border-4 border-slate-400 select-none"
          >
            {/* Ornate Wing & Jewel Crest */}
            <BoardCrest />

            {/* Bottom Accent */}
            <BoardBottomAccent />

            {/* Close Button */}
            <button
              onClick={() => setActiveModalBoard(null)}
              className="absolute -top-3 -right-3 z-30 w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-600 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Inner White Canvas (Exact Layout from Image) */}
            <div className="relative h-full w-full flex flex-col bg-white rounded-2xl p-4 sm:p-5 overflow-hidden shadow-inner justify-between border border-slate-300">
              {/* Top Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
                <div>
                  <div className="font-black text-base sm:text-lg text-slate-900 tracking-wider font-sans uppercase">
                    BOARD {activeModalBoard.id}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 font-sans">
                    {activeModalBoard.title}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-sans px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    +{activeModalBoard.points} PTS
                  </span>
                </div>
              </div>

              {/* Cards Grid (3x3 or 2-column centered layout) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 my-3 content-stretch overflow-hidden">
                {activeModalBoard.steps.map((step, idx) => {
                  const isTarget = step.variable === activeModalBoard.targetVariable;
                  const isLastOdd =
                    activeModalBoard.steps.length % 2 !== 0 &&
                    idx === activeModalBoard.steps.length - 1;

                  return (
                    <div
                      key={step.stepIndex}
                      className={`bg-white border border-slate-300 rounded-xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs relative ${
                        isLastOdd ? "col-span-2 bg-slate-50/50" : ""
                      }`}
                    >
                      {isTarget && (
                        <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 font-sans">
                          <Target className="w-3 h-3" />
                          <span>Target Akhir</span>
                        </span>
                      )}

                      <div className="font-serif font-black text-slate-900 text-base sm:text-lg">
                        {step.variable}
                      </div>

                      <div className="font-serif font-black text-slate-700 text-sm sm:text-base my-1">
                        =
                      </div>

                      <div className="font-serif font-bold text-slate-900 text-xs sm:text-sm lg:text-base text-center leading-snug">
                        {step.formula}
                      </div>

                      {showSolutions && (
                        <div className="mt-2 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold">
                          = {step.result} ({step.explanation})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Footer Disclaimer */}
              <div className="pt-2 border-t border-slate-100 shrink-0 text-center">
                <div className="text-[8px] sm:text-[9px] text-slate-400 font-sans tracking-tight">
                  * Dilarang menggunakan konten ini untuk kepentingan komersial.
                </div>
                <div className="text-[8px] sm:text-[9px] text-slate-400 font-sans tracking-tight">
                  Penggunaan non-komersial diizinkan dengan mencantumkan kredit @BOF
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        teamProgress={teamProgress}
        selectedTeamId={null}
      />
    </div>
  );
}
