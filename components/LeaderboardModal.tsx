"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  X,
  Medal,
  Clock,
  Award,
  Users,
  RefreshCw,
  CheckCircle2,
  Database,
  Sparkles,
} from "lucide-react";
import { TEAMS_DATA, BOARDS_DATA, Team, buildDynamicTeams } from "@/lib/game-data";
import {
  fetchMembersFromSupabase,
  fetchGroupSettingsFromSupabase,
  fetchSubmissionsFromSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";

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
  selectedTeamId?: string | null;
  teams?: Team[];
  groupType?: "faculty" | "custom" | string;
  onRefresh?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  teamProgress,
  selectedTeamId = null,
  teams,
  groupType,
  onRefresh,
}) => {
  const [internalTeams, setInternalTeams] = useState<Team[]>(() => {
    if (teams && teams.length > 0) return teams;
    if (typeof window !== "undefined") {
      try {
        const cachedMembers = localStorage.getItem("bof_members_cache");
        const cachedSettings = localStorage.getItem("bof_group_settings_cache");
        if (cachedMembers) {
          const parsedM = JSON.parse(cachedMembers);
          const parsedS = cachedSettings ? JSON.parse(cachedSettings) : null;
          const dynamic = buildDynamicTeams(parsedM, parsedS);
          if (dynamic.length > 0) return dynamic;
        }
      } catch {}
    }
    return TEAMS_DATA;
  });

  const [internalGroupType, setInternalGroupType] = useState<string>(() => {
    if (groupType) return groupType;
    if (typeof window !== "undefined") {
      try {
        const cachedSettings = localStorage.getItem("bof_group_settings_cache");
        if (cachedSettings) {
          const parsedS = JSON.parse(cachedSettings);
          if (parsedS?.group_type) return parsedS.group_type;
        }
      } catch {}
    }
    return "faculty";
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("id-ID"));
  }, []);

  // Sync with props
  useEffect(() => {
    if (teams && teams.length > 0) {
      setInternalTeams(teams);
    }
  }, [teams]);

  useEffect(() => {
    if (groupType) {
      setInternalGroupType(groupType);
    }
  }, [groupType]);

  // Function to refresh Supabase data directly
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }

    if (isSupabaseConfigured) {
      try {
        const [memRes, setRes] = await Promise.all([
          fetchMembersFromSupabase(),
          fetchGroupSettingsFromSupabase(),
        ]);

        const membersData = memRes.success && memRes.data ? memRes.data : [];
        const settingsData = setRes.success && setRes.data ? setRes.data : null;

        if (settingsData?.group_type) {
          setInternalGroupType(settingsData.group_type);
        }

        if (membersData.length > 0 || settingsData) {
          const dynamic = buildDynamicTeams(membersData, settingsData);
          if (dynamic.length > 0) {
            setInternalTeams(dynamic);
          }
        }
        setLastUpdated(new Date().toLocaleTimeString("id-ID"));
      } catch (err) {
        console.warn("[LeaderboardModal] Refresh error:", err);
      }
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, [onRefresh]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Compute standings with Supabase condition
  const leaderboardList = useMemo(() => {
    const activeTeams = internalTeams.length > 0 ? internalTeams : TEAMS_DATA;
    const teamsMap = new Map<string, Team>();
    activeTeams.forEach((t) => teamsMap.set(t.id, t));

    // Ensure any team with submissions recorded in Supabase is included
    Object.keys(teamProgress || {}).forEach((teamId) => {
      if (!teamsMap.has(teamId)) {
        const fallbackName = teamId.startsWith("custom_")
          ? `Kelompok ${teamId.replace("custom_", "")}`
          : teamId.toUpperCase();
        teamsMap.set(teamId, {
          id: teamId,
          name: fallbackName,
          alias: teamId,
          themeColor: {
            primary: "from-slate-600 to-slate-800",
            border: "border-slate-600",
            bg: "bg-slate-900/40",
            glow: "rgba(148, 163, 184, 0.3)",
            badge: "bg-slate-700 text-slate-300 border-slate-600",
          },
          members: [],
        });
      }
    });

    return Array.from(teamsMap.values())
      .map((team) => {
        const progress = teamProgress[team.id] || {
          solvedBoards: [],
          totalScore: 0,
          boardTimes: {},
        };
        const solvedBoards = progress.solvedBoards || [];
        const solvedCount = solvedBoards.length;
        const totalTime = Object.values(progress.boardTimes || {}).reduce(
          (a, b) => a + b,
          0
        );

        return {
          team,
          solvedBoards,
          solvedCount,
          totalScore: progress.totalScore || 0,
          totalTime,
        };
      })
      .sort((a, b) => {
        // 1. Highest total score first
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        // 2. Most solved boards
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        // 3. Lowest total time for completed boards
        if (a.totalTime > 0 && b.totalTime > 0 && a.totalTime !== b.totalTime) {
          return a.totalTime - b.totalTime;
        }
        // 4. Alphabetical tiebreaker
        return a.team.name.localeCompare(b.team.name);
      });
  }, [internalTeams, teamProgress]);

  // Summary Metrics
  const totalSolvedCount = useMemo(() => {
    return leaderboardList.reduce((acc, curr) => acc + curr.solvedCount, 0);
  }, [leaderboardList]);

  const totalPointsAccumulated = useMemo(() => {
    return leaderboardList.reduce((acc, curr) => acc + curr.totalScore, 0);
  }, [leaderboardList]);

  const topLeader = useMemo(() => {
    if (leaderboardList.length === 0) return null;
    return leaderboardList[0].totalScore > 0 ? leaderboardList[0] : null;
  }, [leaderboardList]);

  if (!isOpen) return null;

  const formatTotalTime = (sec: number) => {
    if (!sec || sec <= 0) return "-";
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const isCustom = internalGroupType === "custom";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xl bg-black/80 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-300/40 shrink-0">
              <Trophy className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Papan Peringkat (Leaderboard)
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Sinkronisasi Ulang Data Supabase"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Menyinkronkan..." : "Refresh"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Standings Table (Scrollable Body) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
              <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-bold text-center w-14">Rank</th>
                <th className="py-3 px-4 font-bold">
                  {isCustom ? "Kelompok / Tim" : "Fakultas / Tim"}
                </th>
                <th className="py-3 px-3 font-bold text-center">Progres Papan</th>
                <th className="py-3 px-4 font-bold text-right">Total Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboardList.map((item, index) => {
                const isCurrent = selectedTeamId === item.team.id;
                const rank = index + 1;
                const isTopThree = rank <= 3 && item.totalScore > 0;

                return (
                  <tr
                    key={item.team.id}
                    className={`transition-colors ${
                      isCurrent
                        ? "bg-blue-600/15"
                        : index % 2 === 0
                        ? "bg-slate-900/30 hover:bg-slate-800/50"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Rank Indicator */}
                    <td className="py-3 px-3 text-center font-bold">
                      {rank === 1 ? (
                        <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black shadow-xs">
                          <Medal className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>#1</span>
                        </div>
                      ) : rank === 2 ? (
                        <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-slate-400/20 text-slate-200 border border-slate-400/40 font-black shadow-xs">
                          <Medal className="w-4 h-4 fill-slate-300 text-slate-300" />
                          <span>#2</span>
                        </div>
                      ) : rank === 3 ? (
                        <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-amber-700/20 text-amber-500 border border-amber-700/40 font-black shadow-xs">
                          <Medal className="w-4 h-4 fill-amber-600 text-amber-600" />
                          <span>#3</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono font-bold">#{rank}</span>
                      )}
                    </td>

                    {/* Team Information & Members */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">

                        <div className="min-w-0 flex-1">
                          <div className="font-sans font-bold text-white flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base hover:text-blue-300 transition-colors">
                              {item.team.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Tim Anda
                              </span>
                            )}
                          </div>

                          {item.team.alias && item.team.alias !== item.team.name && (
                            <div className="text-[11px] font-sans text-slate-400">
                              {item.team.alias}
                            </div>
                          )}

                          {/* Member List Preview from Supabase */}
                          {item.team.members && item.team.members.length > 0 ? (
                            <div className="mt-1 text-[11px] text-slate-400 font-sans flex items-center gap-1.5 flex-wrap">
                              <Users className="w-3 h-3 text-purple-400 shrink-0" />
                              <span
                                className="text-slate-300 truncate max-w-[260px] sm:max-w-md"
                                title={item.team.members.map((m) => m.name).join(", ")}
                              >
                                {item.team.members.map((m) => m.name).join(", ")}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-0.5 text-[10px] text-slate-500 italic font-sans">
                              Belum ada anggota terdaftar
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Solved Boards Progress & Visual Dots */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-bold font-mono text-xs border border-slate-700/80">
                          {item.solvedCount} / {BOARDS_DATA.length}
                        </span>

                        {/* Visual Board Dots (1 to 5) */}
                        <div className="flex items-center gap-1">
                          {BOARDS_DATA.map((board) => {
                            const isSolved = item.solvedBoards.includes(board.id);
                            return (
                              <span
                                key={board.id}
                                title={`Papan 0${board.id}: ${
                                  isSolved ? "Selesai ✓" : "Belum Selesai"
                                }`}
                                className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold transition-all ${
                                  isSolved
                                    ? "bg-emerald-500 text-slate-950 font-black shadow-xs shadow-emerald-500/40"
                                    : "bg-slate-800/90 text-slate-500 border border-slate-700/60"
                                }`}
                              >
                                {isSolved ? "✓" : board.id}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Total Score */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-baseline gap-1">
                        <span
                          className={`text-base sm:text-lg font-black font-mono ${
                            item.totalScore > 0 ? "text-amber-400" : "text-slate-400"
                          }`}
                        >
                          {item.totalScore}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          pts
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty Notification if total points are 0 */}
          {totalPointsAccumulated === 0 && (
            <div className="p-4 text-center border-t border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                Pertandingan Siap Dimulai
              </span>
              <p className="text-[11px] text-slate-500">
                Data klasemen di atas tersinkronisasi langsung dengan database Supabase.
                Skor dan waktu akan terupdate otomatis begitu kelompok berhasil menyelesaikan papan soal.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
