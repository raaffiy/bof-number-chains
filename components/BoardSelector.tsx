"use client";

import React from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Users,
  Play,
  RotateCcw,
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
      {/* Banner Tim Aktif */}
      <div className="mb-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {selectedTeam.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-300 mt-0.5">
              <Users className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
              <span>{selectedTeam.members.map((m) => m.name).join(" • ")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="text-right">
            <div className="text-xs text-slate-400">Progres Tim:</div>
            <div className="text-base font-bold text-amber-400 flex items-center gap-1 justify-end">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{totalPointsEarned} Pts</span>
              <span className="text-xs text-slate-400 font-normal">
                ({solvedBoardIds.length}/5 Selesai)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header Halaman */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Pilih Papan Soal Number Chains
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Pilih salah satu papan untuk memulai perhitungan berantai. Seluruh 5 variabel harus dihitung dengan benar.
        </p>
      </div>

      {/* Grid 5 Papan Soal - Desain Rapih dan Simetris */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {BOARDS_DATA.map((board: GameBoard) => {
          const isSolved = solvedBoardIds.includes(board.id);
          const solvedTime = boardTimes[board.id];

          return (
            <div
              key={board.id}
              className={`group relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between
                transition-all duration-300 hover:-translate-y-1 motion-reduce:transform-none ${isSolved
                  ? "bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
                  : "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10"
                }`}
            >
              {/* Garis aksen di atas kartu: hijau jika selesai, biru jika belum */}
              <div
                className={`absolute inset-x-0 top-0 h-1 ${isSolved
                    ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity"
                  }`}
              />

              <div className="relative">
                {/* Baris atas: kesulitan & poin */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${board.difficultyColor}`}
                  >
                    {board.difficulty}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-amber-500/20 to-orange-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                    <Award className="w-3.5 h-3.5" />
                    <span>+{board.points} Pts</span>
                  </div>
                </div>

                {/* Judul */}
                <h3 className="text-lg font-bold text-white mb-4 leading-snug">
                  {board.title}
                </h3>

                {/* Status */}
                <div className="mb-5">
                  {isSolved ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Selesai (Benar)</span>
                      </div>
                      {solvedTime && (
                        <span className="flex items-center gap-1 text-[11px] font-mono bg-emerald-950/70 px-2 py-0.5 rounded-md text-emerald-200">
                          <Clock className="w-3 h-3" />
                          {formatTime(solvedTime)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 text-slate-400 text-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/60 opacity-75 animate-ping motion-reduce:animate-none" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                      </span>
                      <span>Belum dikerjakan</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol aksi */}
              <button
                onClick={() => onSelectBoard(board.id)}
                className={`relative w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${isSolved
                    ? "bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 focus-visible:ring-emerald-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 focus-visible:ring-blue-400"
                  }`}
              >
                {isSolved ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-180 motion-reduce:transform-none" />
                    <span>Kerjakan Ulang</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Mulai Kerjakan Papan</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
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
