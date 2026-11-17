"use client";

import React from "react";
import Link from "next/link";
import { Users, CheckCircle2, Award, Dices } from "lucide-react";
import { Team, TEAMS_DATA } from "@/lib/game-data";

interface TeamSelectorProps {
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  teamProgress: Record<string, { solvedBoards: number[]; totalScore: number }>;
  teams?: Team[];
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  onSelectTeam,
  teamProgress,
  teams,
}) => {
  const displayTeams = teams && teams.length > 0 ? teams : TEAMS_DATA;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn pb-28">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Pilih Tim / Kelompok Anda
        </h1>
        <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
          Pilih salah satu kelompok yang telah dibagikan untuk memulai pengerjaan arena papan.
        </p>
      </div>

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {displayTeams.map((team: Team) => {
          const isSelected = selectedTeamId === team.id;
          const progress = teamProgress[team.id] || { solvedBoards: [], totalScore: 0 };
          const solvedCount = progress.solvedBoards.length;

          return (
            <div
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              className={`relative group cursor-pointer rounded-2xl p-6 transition-all duration-300 border flex flex-col justify-between ${
                isSelected
                  ? `bg-slate-900/90 border-2 ${team.themeColor.border} shadow-2xl scale-[1.02]`
                  : "bg-slate-900/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80 hover:scale-[1.01]"
              }`}
              style={{
                boxShadow: isSelected ? `0 0 30px ${team.themeColor.glow}` : undefined,
              }}
            >
              {/* Top Accent Ribbon */}
              <div
                className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${team.themeColor.primary} ${
                  isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-75"
                } transition-opacity`}
              />

              <div>
                {/* Header Info */}
                <div className="flex items-start justify-between gap-3 mb-4 mt-1">
                  <div>
                    <h3 suppressHydrationWarning className="text-xl font-bold text-white mt-1.5 group-hover:text-blue-300 transition-colors">
                      {team.name}
                    </h3>
                  </div>

                  {/* Selected Indicator Badge */}
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>TERPILIH</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-slate-600 group-hover:border-slate-500">
                      <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-slate-600 transition-colors" />
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="space-y-2 mb-5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>Daftar Anggota Kelompok</span>
                    </span>
                  </div>

                  {team.members.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      {team.members.map((member, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-200 truncate">
                              {member.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 p-3.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 flex flex-col items-center justify-center gap-1.5 text-center">
                      <span className="text-slate-400">Belum ada anggota di kelompok ini</span>
                      <Link
                        href="/spin"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Dices className="w-3.5 h-3.5 text-pink-400" />
                        <span>Bagi Kelompok di Halaman Spin</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Progress status */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-2">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>
                    Skor: <strong className="text-white font-semibold">{progress.totalScore} pts</strong>
                  </span>
                </div>
                <div>
                  Status:{" "}
                  <strong
                    className={solvedCount === 5 ? "text-emerald-400 font-bold" : "text-slate-300 font-medium"}
                  >
                    {solvedCount}/5 Selesai
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
