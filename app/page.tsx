"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { TeamSelector } from "@/components/TeamSelector";
import { BoardSelector } from "@/components/BoardSelector";
import { GameBoardArena } from "@/components/GameBoardArena";
import { ResultOverlay } from "@/components/ResultOverlay";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { TEAMS_DATA, BOARDS_DATA, Team, GameBoard } from "@/lib/game-data";
import { playSound } from "@/lib/sound";
import { Trophy, Info, Sparkles, HelpCircle } from "lucide-react";

export default function Home() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"team_select" | "board_select" | "playing">("team_select");
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

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
    // Initial dummy data with some friendly starting status or clean empty slate
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

  // Result overlay state
  const [overlayState, setOverlayState] = useState<{
    isOpen: boolean;
    isCorrect: boolean;
    boardId: number;
    submittedValue: string;
    timeSpentSeconds: number;
  } | null>(null);

  // Selected team object
  const selectedTeam: Team | null =
    TEAMS_DATA.find((t) => t.id === selectedTeamId) || null;

  // Active board object
  const activeBoard: GameBoard | null =
    BOARDS_DATA.find((b) => b.id === activeBoardId) || null;

  // Current team stats
  const currentTeamStats = selectedTeamId
    ? teamProgress[selectedTeamId] || { solvedBoards: [], totalScore: 0, boardTimes: {} }
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

  // Handler: Answer submission
  const handleSubmitAnswer = (userAnswer: string, timeSpentSeconds: number) => {
    if (!activeBoard || !selectedTeamId) return;

    const parsedUserAnswer = parseInt(userAnswer, 10);
    const isCorrect = parsedUserAnswer === activeBoard.correctAnswer;

    if (isCorrect) {
      playSound.success(isMuted);

      // Update team progress if not already recorded
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
          : teamData.totalScore + activeBoard.points;

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

    // Trigger full screen overlay
    setOverlayState({
      isOpen: true,
      isCorrect,
      boardId: activeBoard.id,
      submittedValue: userAnswer,
      timeSpentSeconds,
    });
  };

  // Handler: Continue from result overlay (e.g. to next board)
  const handleContinueNextBoard = () => {
    if (!overlayState) return;
    const currentId = overlayState.boardId;
    const nextBoard = BOARDS_DATA.find((b) => b.id === currentId + 1);

    setOverlayState(null);
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
    playSound.click(isMuted);
  };

  // Handler: Return to board list from overlay
  const handleOverlayGoToBoardList = () => {
    setOverlayState(null);
    playSound.click(isMuted);
    setCurrentStep("board_select");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Reset all progress
  const handleResetAll = () => {
    if (window.confirm("Apakah Anda yakin ingin me-reset seluruh progres permainan?")) {
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

      {/* Main Single Page Content Area */}
      <main className="flex-1 pb-16">
        {/* Step 1: Team Selection */}
        {currentStep === "team_select" && (
          <TeamSelector
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
            onProceedToBoards={handleProceedToBoards}
            teamProgress={teamProgress}
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
            isAlreadySolved={currentTeamStats.solvedBoards.includes(activeBoard.id)}
          />
        )}
      </main>

      {/* Floating Action Button for Faculty Leaderboard */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => {
            playSound.click(isMuted);
            setShowLeaderboard(true);
          }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-500/25 border border-amber-300/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Trophy className="w-5 h-5 fill-slate-950" />
          <span>Leaderboard Fakultas</span>
        </button>
      </div>

      {/* Full Screen Overlay for Answers */}
      {overlayState && activeBoard && selectedTeam && (
        <ResultOverlay
          isOpen={overlayState.isOpen}
          isCorrect={overlayState.isCorrect}
          board={activeBoard}
          team={selectedTeam}
          submittedValue={overlayState.submittedValue}
          timeSpentSeconds={overlayState.timeSpentSeconds}
          onContinue={handleContinueNextBoard}
          onRetry={handleRetryBoard}
          onGoToBoardList={handleOverlayGoToBoardList}
          hasNextBoard={overlayState.boardId < 5}
        />
      )}

      {/* Faculty Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        teamProgress={teamProgress}
        selectedTeamId={selectedTeamId}
      />
    </div>
  );
}
