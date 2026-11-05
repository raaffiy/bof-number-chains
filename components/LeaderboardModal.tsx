"use client";

import React from "react";
import { Trophy, X, Medal, Clock, Award, Users } from "lucide-react";
import { TEAMS_DATA, BOARDS_DATA, Team } from "@/lib/game-data";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamProgress: Record<
    string,
    {
      solvedBoards: number[];
      totalScore: number;
      boardTimes: Record<number, number>;
    }
  >;
  selectedTeamId: string | null;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  teamProgress,
  selectedTeamId,
}) => {
  if (!isOpen) return null;

  // Compute standings
  const leaderboardList = TEAMS_DATA.map((team) => {
    const progress = teamProgress[team.id] || {
      solvedBoards: [],
      totalScore: 0,
      boardTimes: {},
    };
    const solvedCount = progress.solvedBoards.length;
    const totalTime = Object.values(progress.boardTimes || {}).reduce(
      (a, b) => a + b,
      0
    );

    return {
      team,
      solvedCount,
      totalScore: progress.totalScore,
      totalTime,
    };
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.totalTime - b.totalTime;
  });

  const formatTotalTime = (sec: number) => {
    if (!sec) return "-";
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                Papan Peringkat Fakultas (Leaderboard)
              </h3>
              <p className="text-xs text-slate-400">
                Battle of Faculties • Total Akumulasi Skor & Waktu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Standings Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="py-3 px-3 font-semibold">Rank</th>
                <th className="py-3 px-4 font-semibold">Fakultas</th>
                <th className="py-3 px-3 font-semibold text-center">Papan Selesai</th>
                <th className="py-3 px-4 font-semibold text-right">Total Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {leaderboardList.map((item, index) => {
                const isCurrent = selectedTeamId === item.team.id;
                const rank = index + 1;

                return (
                  <tr
                    key={item.team.id}
                    className={`transition-colors ${
                      isCurrent ? "bg-blue-600/15" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-3 px-3 font-bold">
                      {rank === 1 ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Medal className="w-4 h-4 fill-amber-400" /> #1
                        </span>
                      ) : rank === 2 ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Medal className="w-4 h-4 fill-slate-300" /> #2
                        </span>
                      ) : rank === 3 ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Medal className="w-4 h-4 fill-amber-600" /> #3
                        </span>
                      ) : (
                        <span className="text-slate-500 pl-2">#{rank}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-white flex items-center gap-2">
                        <span>{item.team.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Tim Anda
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-sans text-slate-400">
                        {item.team.alias}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                        {item.solvedCount} / 5
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-base font-black text-amber-400">
                        {item.totalScore}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">pts</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Peringkat diperbarui secara otomatis saat papan diselesaikan.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
