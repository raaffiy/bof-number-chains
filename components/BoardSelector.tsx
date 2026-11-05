"use client";

import React from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Sparkles,
  Users,
  Play,
  RotateCcw,
  Flame,
} from "lucide-react";
import { GameBoard, Team, BOARDS_DATA } from "@/lib/game-data";

interface BoardSelectorProps {
  selectedTeam: Team;
  onSelectBoard: (boardId: number) => void;
  onBackToTeams: () => void;
  solvedBoardIds: number[];
  boardTimes: Record<number, number>;
}

export const BoardSelector: React.FC<BoardSelectorProps> = ({
  selectedTeam,
  onSelectBoard,
  onBackToTeams,
  solvedBoardIds,
  boardTimes,
}) => {
  const totalPointsEarned = BOARDS_DATA.filter((b) =>
    solvedBoardIds.includes(b.id)
  ).reduce((acc, curr) => acc + curr.points, 0);

  const formatTime = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Active Team Identity Banner */}
      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {selectedTeam.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Anggota:</span>
              <span className="font-medium text-slate-200">
                {selectedTeam.members.map((m) => m.name).join(" • ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Progres Tim:</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1 justify-end">
              <Award className="w-5 h-5 text-amber-400" />
              <span>{totalPointsEarned} Pts</span>
              <span className="text-xs text-slate-400 font-normal">
                ({solvedBoardIds.length}/5 Selesai)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Pilih Papan Soal Number Chains
          </h2>
        </div>

        {/* Completion Progress Bar */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 min-w-[260px]">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-400">Penyelesaian Papan:</span>
            <span className="text-emerald-400 font-mono">
              {Math.round((solvedBoardIds.length / 5) * 100)}% ({solvedBoardIds.length}/5)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${(solvedBoardIds.length / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of 5 Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {BOARDS_DATA.map((board: GameBoard) => {
          const isSolved = solvedBoardIds.includes(board.id);
          const solvedTime = boardTimes[board.id];

          return (
            <div
              key={board.id}
              className={`rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                isSolved
                  ? "bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 hover:scale-[1.01]"
              }`}
            >
              {/* Top Accent Line */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isSolved
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : board.id === 5
                    ? "bg-gradient-to-r from-rose-500 to-amber-500"
                    : "bg-gradient-to-r from-blue-600 to-indigo-500"
                }`}
              />

              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${board.difficultyColor}`}
                  >
                    {board.difficulty}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Award className="w-3.5 h-3.5" />
                    <span>+{board.points} Pts</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-1">{board.title}</h3>

                {/* Status Indicator Pill */}
                <div className="mb-4">
                  {isSolved ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>SELESAI (BENAR)</span>
                      </div>
                      {solvedTime && (
                        <span className="text-[11px] font-mono font-medium text-emerald-300">
                          ⏱ {formatTime(solvedTime)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span>BELUM DIKERJAKAN</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectBoard(board.id)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSolved
                    ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {isSolved ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Kerjakan Ulang Papan Ini</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai Kerjakan Papan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
