"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { TeamSelector } from "@/components/TeamSelector";
import { BoardSelector } from "@/components/BoardSelector";
import { GameBoardArena } from "@/components/GameBoardArena";
import { ResultOverlay } from "@/components/ResultOverlay";
import { TEAMS_DATA, BOARDS_DATA, Team, GameBoard, buildDynamicTeams } from "@/lib/game-data";
import { playSound } from "@/lib/sound";
import {
  submitGameResultToSupabase,
  fetchSubmissionsFromSupabase,
  fetchMembersFromSupabase,
  fetchGroupSettingsFromSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Layers,
  Flame,
  Eye,
  Dices,
} from "lucide-react";

export default function Home() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "team_select" | "board_select" | "playing"
  >("team_select");
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [teams, setTeams] = useState<Team[]>(TEAMS_DATA);

  // Per-team progress tracker
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

  // Result overlay state with 5/6/7 variable verification
  const [overlayState, setOverlayState] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    boardId: number;
    userAnswers: Record<string, string>;
    stepResults: Record<string, boolean>;
    timeSpentSeconds: number;
  } | null>(null);

  // Load teams and member assignments from Supabase & cache
  const loadTeamsAndMembers = useCallback(() => {
    Promise.all([
      fetchMembersFromSupabase(),
      fetchGroupSettingsFromSupabase(),
    ]).then(([membersRes, settingsRes]) => {
      const membersData = membersRes.success && membersRes.data ? membersRes.data : [];
      const settingsData = settingsRes.success && settingsRes.data ? settingsRes.data : null;

      if (membersData.length > 0 || settingsData) {
        const dynamicTeams = buildDynamicTeams(membersData, settingsData);
        setTeams(dynamicTeams);

        // Update local cache
        if (typeof window !== "undefined") {
          try {
            if (membersData.length > 0) {
              localStorage.setItem("bof_members_cache", JSON.stringify(membersData));
            }
            if (settingsData) {
              localStorage.setItem("bof_group_settings_cache", JSON.stringify(settingsData));
            }
          } catch (e) {
            console.warn("Cache sync error", e);
          }
        }
      }
    });
  }, []);

  // Sync submissions and listen for member/team updates
  useEffect(() => {
    // Hydrate cached teams in microtask so SSR matches client initial render perfectly
    Promise.resolve().then(() => {
      try {
        const cachedMembers = localStorage.getItem("bof_members_cache");
        const cachedSettings = localStorage.getItem("bof_group_settings_cache");
        if (cachedMembers) {
          const parsedMembers = JSON.parse(cachedMembers);
          const parsedSettings = cachedSettings ? JSON.parse(cachedSettings) : null;
          const dynamicTeams = buildDynamicTeams(parsedMembers, parsedSettings);
          if (dynamicTeams.length > 0) {
            setTeams(dynamicTeams);
          }
        }
      } catch {}
    });

    loadTeamsAndMembers();

    // Re-sync when user returns to this tab or when data updates in another route
    const handleFocus = () => loadTeamsAndMembers();
    const handleStorage = () => loadTeamsAndMembers();
    const handleCustomUpdate = () => loadTeamsAndMembers();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("bof_data_updated", handleCustomUpdate);

    if (isSupabaseConfigured) {
      fetchSubmissionsFromSupabase().then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          console.log(`[Supabase] Memuat ${res.data.length} riwayat jawaban dari database.`);
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
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bof_data_updated", handleCustomUpdate);
    };
  }, [loadTeamsAndMembers]);

  // Selected team object
  const selectedTeam: Team | null =
    teams.find((t) => t.id === selectedTeamId) || null;

  // Active board object
  const activeBoard: GameBoard | null =
    BOARDS_DATA.find((b) => b.id === activeBoardId) || null;

  // Current team stats
  const currentTeamStats = selectedTeamId
    ? teamProgress[selectedTeamId] || {
        solvedBoards: [],
        totalScore: 0,
        boardTimes: {},
      }
    : { solvedBoards: [], totalScore: 0, boardTimes: {} };

  // Handler: Select team
  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    playSound.select(isMuted);
  };

  // Handler: Proceed to board list
  const handleProceedToBoards = () => {
    if (!selectedTeamId) return;
    playSound.click(isMuted);
    setCurrentStep("board_select");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Select specific board
  const handleSelectBoard = (boardId: number) => {
    setActiveBoardId(boardId);
    playSound.click(isMuted);
    setCurrentStep("playing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Answer submission with automatic Supabase persistence
  const handleSubmitAnswer = (
    userAnswers: Record<string, string>,
    timeSpentSeconds: number
  ) => {
    if (!activeBoard || !selectedTeamId) return;

    // Check each step: all variables must match exactly
    const stepResults: Record<string, boolean> = {};
    let allVariablesCorrect = true;

    activeBoard.steps.forEach((step) => {
      const parsedVal = parseInt((userAnswers[step.variable] || "").trim(), 10);
      const isStepCorrect = parsedVal === step.result;
      stepResults[step.variable] = isStepCorrect;

      if (!isStepCorrect) {
        allVariablesCorrect = false;
      }
    });

    const pointsAwarded = allVariablesCorrect ? activeBoard.points : 0;

    // 1. Audio feedback & local update for instantaneous UX
    if (allVariablesCorrect) {
      playSound.success(isMuted);

      setTeamProgress((prev) => {
        const teamData = prev[selectedTeamId] || {
          solvedBoards: [],
          totalScore: 0,
          boardTimes: {},
        };

        const alreadySolved = teamData.solvedBoards.includes(activeBoard.id);
        const newSolved = alreadySolved
          ? teamData.solvedBoards
          : [...teamData.solvedBoards, activeBoard.id];

        const newScore = alreadySolved
          ? teamData.totalScore
          : teamData.totalScore + pointsAwarded;

        const newTimes = {
          ...teamData.boardTimes,
          [activeBoard.id]: timeSpentSeconds,
        };

        return {
          ...prev,
          [selectedTeamId]: {
            solvedBoards: newSolved,
            totalScore: newScore,
            boardTimes: newTimes,
          },
        };
      });
    } else {
      playSound.error(isMuted);
    }

    // 2. Open result overlay
    setOverlayState({
      isOpen: true,
      isCorrect: allVariablesCorrect,
      boardId: activeBoard.id,
      userAnswers,
      stepResults,
      timeSpentSeconds,
    });

    // 3. Send submission data to Supabase
    if (isSupabaseConfigured) {
      setDbSyncStatus("saving");
      submitGameResultToSupabase({
        teamId: selectedTeamId,
        boardId: activeBoard.id,
        isCorrect: allVariablesCorrect,
        userAnswers,
        stepResults,
        timeSpentSeconds,
        pointsAwarded,
      }).then((res) => {
        if (res.success) {
          setDbSyncStatus("saved");
        } else {
          setDbSyncStatus("error");
          console.warn("[Supabase] Pengiriman status:", res.error);
        }
      });
    }
  };

  // Handler: Continue from result overlay to next board
  const handleContinueNextBoard = () => {
    if (!overlayState) return;
    const currentId = overlayState.boardId;
    const nextBoard = BOARDS_DATA.find((b) => b.id === currentId + 1);

    setOverlayState(null);
    setDbSyncStatus("idle");
    if (nextBoard) {
      setActiveBoardId(nextBoard.id);
      setCurrentStep("playing");
    } else {
      setCurrentStep("board_select");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Retry same board
  const handleRetryBoard = () => {
    setOverlayState(null);
    setDbSyncStatus("idle");
    playSound.click(isMuted);
  };

  // Handler: Return to board list from overlay
  const handleOverlayGoToBoardList = () => {
    setOverlayState(null);
    setDbSyncStatus("idle");
    playSound.click(isMuted);
    setCurrentStep("board_select");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Reset all progress
  const handleResetAll = () => {
    if (
      window.confirm("Apakah Anda yakin ingin me-reset seluruh progres permainan?")
    ) {
      const resetData: typeof teamProgress = {};
      TEAMS_DATA.forEach((t) => {
        resetData[t.id] = {
          solvedBoards: [],
          totalScore: 0,
          boardTimes: {},
        };
      });
      setTeamProgress(resetData);
      setSelectedTeamId(null);
      setActiveBoardId(null);
      setCurrentStep("team_select");
      setOverlayState(null);
      setDbSyncStatus("idle");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] bg-grid-pattern text-slate-100 relative selection:bg-blue-600 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        currentStep={currentStep}
        selectedTeam={selectedTeam}
        onStepChange={(step) => {
          playSound.click(isMuted);
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onResetAll={handleResetAll}
        solvedCount={currentTeamStats.solvedBoards.length}
        totalScore={currentTeamStats.totalScore}
      />

      {/* Main SPA Content */}
      <main className="flex-1">
        {/* Step 1: Team Selection */}
        {currentStep === "team_select" && (
          <TeamSelector
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
            teamProgress={teamProgress}
            teams={teams}
          />
        )}

        {/* Step 2: Board Selection */}
        {currentStep === "board_select" && selectedTeam && (
          <BoardSelector
            selectedTeam={selectedTeam}
            onSelectBoard={handleSelectBoard}
            onBackToTeams={() => {
              playSound.click(isMuted);
              setCurrentStep("team_select");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            solvedBoardIds={currentTeamStats.solvedBoards}
            boardTimes={currentTeamStats.boardTimes}
          />
        )}

        {/* Step 3: Game Board Arena */}
        {currentStep === "playing" && activeBoard && selectedTeam && (
          <GameBoardArena
            board={activeBoard}
            team={selectedTeam}
            onBackToBoards={() => {
              playSound.click(isMuted);
              setCurrentStep("board_select");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSubmitAnswer={handleSubmitAnswer}
            isAlreadySolved={currentTeamStats.solvedBoards.includes(
              activeBoard.id
            )}
          />
        )}
      </main>

      {/* Persistent Bottom Action / CTA Bar across all steps */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-2xl w-full mx-auto">
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-row items-center justify-between gap-3">
          {/* Kondisi 1: Step Pilih Tim */}
          {currentStep === "team_select" && (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] text-slate-400">Tim Terpilih:</div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {selectedTeam
                      ? selectedTeam.name
                      : "Belum Ada Tim Yang Dipilih"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToBoards}
                disabled={!selectedTeamId}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  selectedTeamId
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/40 hover:scale-105 active:scale-95"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <span>Pilih Papan Soal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Kondisi 2: Step Papan Soal */}
          {currentStep === "board_select" && selectedTeam && (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <button
                onClick={() => {
                  playSound.click(isMuted);
                  setCurrentStep("team_select");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            </>
          )}

          {/* Kondisi 3: Step Pengerjaan Soal */}
          {currentStep === "playing" && activeBoard && selectedTeam && (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
              </div>

              <button
                onClick={() => {
                  playSound.click(isMuted);
                  setCurrentStep("board_select");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Full Screen Overlay for Answers with Supabase DB Status */}
      {overlayState && activeBoard && selectedTeam && (
        <ResultOverlay
          isOpen={overlayState.isOpen}
          isCorrect={overlayState.isCorrect}
          board={activeBoard}
          team={selectedTeam}
          userAnswers={overlayState.userAnswers}
          stepResults={overlayState.stepResults}
          timeSpentSeconds={overlayState.timeSpentSeconds}
          dbSyncStatus={dbSyncStatus}
          onContinue={handleContinueNextBoard}
          onRetry={handleRetryBoard}
          onGoToBoardList={handleOverlayGoToBoardList}
          hasNextBoard={overlayState.boardId < 5}
        />
      )}
    </div>
  );
}
