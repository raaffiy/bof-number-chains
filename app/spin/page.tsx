"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Dices,
  RotateCcw,
  Users,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  Shuffle,
  Shield,
} from "lucide-react";
import {
  fetchMembersFromSupabase,
  addMemberToSupabase,
  addBulkMembersToSupabase,
  deleteMemberFromSupabase,
  deleteAllMembersFromSupabase,
  saveAllGroupAssignmentsToSupabase,
  resetAllGroupAssignmentsInSupabase,
  resetAllSubmissionsInSupabase,
  fetchGroupSettingsFromSupabase,
  saveGroupSettingsToSupabase,
  MemberRecord,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { TEAMS_DATA } from "@/lib/game-data";
import { triggerConfetti } from "@/lib/confetti";

interface GroupDef {
  id: string;
  name: string;
  color: string;
  border: string;
  bg: string;
}

const DEFAULT_FACULTY_GROUPS: GroupDef[] = TEAMS_DATA.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.themeColor.primary,
  border: t.themeColor.border,
  bg: t.themeColor.bg,
}));

const WHEEL_COLORS = [
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#0891b2", // cyan-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#4f46e5", // indigo-600
  "#0d9488", // teal-600
  "#e11d48", // rose-600
  "#9333ea", // purple-600
];

export default function SpinPage() {
  // Members State
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Settings State
  const [membersPerGroup, setMembersPerGroup] = useState<number>(4);
  const [groupType, setGroupType] = useState<"faculty" | "custom">("faculty");
  const [customGroupCount, setCustomGroupCount] = useState<number>(4);
  const [distributionMode, setDistributionMode] = useState<"round_robin" | "sequential">("round_robin");

  // Input State
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [bulkInputText, setBulkInputText] = useState<string>("");
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"spin" | "manage" | "settings">("spin");

  // Spin Wheel State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [selectedWinner, setSelectedWinner] = useState<{
    member: MemberRecord;
    group: GroupDef;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Compute Active Groups
  const activeGroups: GroupDef[] = useMemo(() => {
    return groupType === "faculty"
      ? DEFAULT_FACULTY_GROUPS
      : Array.from({ length: customGroupCount }).map((_, i) => ({
          id: `custom_${i + 1}`,
          name: `Kelompok ${i + 1}`,
          color: "from-blue-600 to-indigo-600",
          border: "border-blue-500",
          bg: "bg-blue-950/40",
        }));
  }, [groupType, customGroupCount]);

  // Group members into assignments
  const { assignedByGroup, unassignedMembers } = useMemo(() => {
    const assigned: Record<string, MemberRecord[]> = {};
    activeGroups.forEach((g) => {
      assigned[g.id] = [];
    });

    const unassigned: MemberRecord[] = [];

    members.forEach((m) => {
      if (m.team_id && assigned[m.team_id]) {
        assigned[m.team_id].push(m);
      } else {
        unassigned.push(m);
      }
    });

    return { assignedByGroup: assigned, unassignedMembers: unassigned };
  }, [activeGroups, members]);

  // Determine which group is the next target for receiving a member
  const getNextTargetGroup = useCallback((): GroupDef | null => {
    if (unassignedMembers.length === 0) return null;

    if (distributionMode === "round_robin") {
      // Find group with lowest member count that is not yet full
      let minGroup: GroupDef | null = null;
      let minCount = Infinity;

      for (const g of activeGroups) {
        const count = assignedByGroup[g.id]?.length || 0;
        if (count < membersPerGroup && count < minCount) {
          minCount = count;
          minGroup = g;
        }
      }
      return minGroup;
    } else {
      // Sequential: Fill group 1, then group 2, etc.
      for (const g of activeGroups) {
        const count = assignedByGroup[g.id]?.length || 0;
        if (count < membersPerGroup) {
          return g;
        }
      }
      return null;
    }
  }, [unassignedMembers.length, distributionMode, activeGroups, assignedByGroup, membersPerGroup]);

  const nextTargetGroup = getNextTargetGroup();

  // Helper to persist members locally and trigger events
  const syncMembersState = useCallback((newMembers: MemberRecord[]) => {
    setMembers(newMembers);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bof_members_cache", JSON.stringify(newMembers));
        window.dispatchEvent(new Event("bof_data_updated"));
      } catch (e) {
        console.warn("Storage error", e);
      }
    }
  }, []);

  // Auto-save group settings to Supabase and cache locally
  const updateSettingsAndAutoSave = useCallback((
    newMembersPerGroup: number,
    newGroupType: "faculty" | "custom",
    newCustomCount: number
  ) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "bof_group_settings_cache",
          JSON.stringify({
            group_type: newGroupType,
            members_per_group: newMembersPerGroup,
            custom_groups: Array.from({ length: newCustomCount }).map((_, i) => ({
              id: `custom_${i + 1}`,
              name: `Kelompok ${i + 1}`,
            })),
          })
        );
        window.dispatchEvent(new Event("bof_data_updated"));
      } catch (e) {
        console.warn("Storage error", e);
      }
    }

    if (!isSupabaseConfigured) return;

    setSyncStatus("saving");
    saveGroupSettingsToSupabase({
      members_per_group: newMembersPerGroup,
      group_type: newGroupType,
      custom_groups: Array.from({ length: newCustomCount }).map((_, i) => ({
        id: `custom_${i + 1}`,
        name: `Kelompok ${i + 1}`,
      })),
    }).then((res) => {
      if (res.success) {
        setSyncStatus("saved");
        setSyncMessage("Pengaturan kelompok tersimpan otomatis ke database.");
      } else {
        setSyncStatus("error");
        setSyncMessage(res.error || "Gagal menyimpan pengaturan");
      }
    });
  }, []);

  // Load data from Supabase and cache on mount
  useEffect(() => {
    let isMounted = true;

    // Load from localStorage cache after mount to guarantee 0 SSR hydration mismatch
    Promise.resolve().then(() => {
      if (!isMounted) return;
      try {
        const cachedMembers = localStorage.getItem("bof_members_cache");
        if (cachedMembers) {
          const parsed = JSON.parse(cachedMembers);
          if (Array.isArray(parsed) && parsed.length > 0) setMembers(parsed);
        }
        const cachedSettings = localStorage.getItem("bof_group_settings_cache");
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          if (parsed.members_per_group) setMembersPerGroup(parsed.members_per_group);
          if (parsed.group_type) setGroupType(parsed.group_type);
          if (parsed.custom_groups?.length) setCustomGroupCount(parsed.custom_groups.length);
        }
      } catch {}
    });

    Promise.all([
      fetchMembersFromSupabase(),
      fetchGroupSettingsFromSupabase(),
    ]).then(([membersRes, settingsRes]) => {
      if (!isMounted) return;

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("bof_members_cache", JSON.stringify(membersRes.data));
        }
      }

      if (settingsRes.success && settingsRes.data) {
        setMembersPerGroup(settingsRes.data.members_per_group || 4);
        setGroupType(settingsRes.data.group_type || "faculty");
        if (settingsRes.data.custom_groups?.length) {
          setCustomGroupCount(settingsRes.data.custom_groups.length);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("bof_group_settings_cache", JSON.stringify(settingsRes.data));
        }
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Draw Roulette Wheel Canvas
  const drawWheel = useCallback(
    (currentAngle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 18;

      ctx.clearRect(0, 0, width, height);

      const items = unassignedMembers;
      const totalSlices = items.length;

      if (totalSlices === 0) {
        // Empty state wheel
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#334155";
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        return;
      }

      const sliceAngle = (2 * Math.PI) / totalSlices;

      // Draw each wedge
      for (let i = 0; i < totalSlices; i++) {
        const startAngle = currentAngle + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#0f172a";
        ctx.stroke();

        // Draw Label text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);

        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.font = totalSlices > 14 ? "bold 11px system-ui" : "bold 13px system-ui";

        // Truncate name if too long
        let text = items[i].name;
        if (text.length > 16) {
          text = text.slice(0, 14) + "…";
        }
        ctx.fillText(text, radius - 18, 0);
        ctx.restore();
      }

      // Outer Metallic Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#38bdf8";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#94a3b8";
      ctx.stroke();

      // Outer Decorative Dots
      const numDots = Math.max(12, totalSlices * 2);
      for (let d = 0; d < numDots; d++) {
        const dotAngle = (2 * Math.PI * d) / numDots;
        const dotX = centerX + (radius + 2) * Math.cos(dotAngle);
        const dotY = centerY + (radius + 2) * Math.sin(dotAngle);

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = d % 2 === 0 ? "#fef08a" : "#ffffff";
        ctx.fill();
      }

      // Center Hub Pin
      ctx.beginPath();
      ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
      const hubGrad = ctx.createRadialGradient(centerX - 8, centerY - 8, 4, centerX, centerY, 38);
      hubGrad.addColorStop(0, "#f8fafc");
      hubGrad.addColorStop(0.5, "#475569");
      hubGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();

      // Center Text "SPIN"
      ctx.fillStyle = "#38bdf8";
      ctx.font = "900 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SPIN", centerX, centerY);
    },
    [unassignedMembers]
  );

  // Redraw wheel whenever members or wheelAngle changes
  useEffect(() => {
    drawWheel(wheelAngle);
  }, [drawWheel, wheelAngle]);

  // Execute Spin Action
  const handleSpin = () => {
    if (isSpinning || unassignedMembers.length === 0 || !nextTargetGroup) return;

    setIsSpinning(true);
    setSelectedWinner(null);

    const totalSlices = unassignedMembers.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    // Pick a random winner index from unassigned pool
    const winnerIndex = Math.floor(Math.random() * totalSlices);
    const winningMember = unassignedMembers[winnerIndex];
    const targetGroup = nextTargetGroup;

    // Target pointer is at top (3*PI/2 = -PI/2)
    // Slice i midpoint is at: startAngle + sliceAngle / 2
    // We want: (wheelAngle + winnerIndex * sliceAngle + sliceAngle / 2) % 2PI = 3*PI/2
    const currentNorm = wheelAngle % (2 * Math.PI);
    const winnerMid = winnerIndex * sliceAngle + sliceAngle / 2;
    const desiredTarget = (3 * Math.PI) / 2;

    let delta = desiredTarget - (currentNorm + winnerMid);
    while (delta < 0) {
      delta += 2 * Math.PI;
    }

    // Add 6 to 8 full rotations for exciting spin effect
    const fullSpins = (6 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const totalRotation = fullSpins + delta;

    const startRot = wheelAngle;
    const startTime = performance.now();
    const duration = 3800; // 3.8 seconds

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRot + totalRotation * easeOut;

      setWheelAngle(currentRot);
      drawWheel(currentRot);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished
        setIsSpinning(false);
        setSelectedWinner({ member: winningMember, group: targetGroup });
        triggerConfetti();

        // Assign member to the target group in state
        const updatedMembers = members.map((m) =>
          m.id === winningMember.id
            ? {
                ...m,
                team_id: targetGroup.id,
                team_name: targetGroup.name,
                assigned_at: new Date().toISOString(),
              }
            : m
        );
        syncMembersState(updatedMembers);

        // Auto-save this assignment to Supabase
        if (isSupabaseConfigured) {
          setSyncStatus("saving");
          saveAllGroupAssignmentsToSupabase([
            {
              id: winningMember.id,
              name: winningMember.name,
              team_id: targetGroup.id,
              team_name: targetGroup.name,
            },
          ]).then((res) => {
            if (res.success) {
              setSyncStatus("saved");
              setSyncMessage(`${winningMember.name} masuk ke ${targetGroup.name} (Tersimpan otomatis)`);
            } else {
              setSyncStatus("error");
              setSyncMessage(res.error || "Gagal menyimpan hasil undian");
            }
          });
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Quick Randomize All (Bagi Semua Otomatis)
  const handleRandomizeAll = () => {
    if (unassignedMembers.length === 0) return;

    if (
      !confirm(
        `Bagikan seluruh ${unassignedMembers.length} anggota yang tersisa secara acak ke dalam kelompok?`
      )
    ) {
      return;
    }

    // Shuffle unassigned members
    const shuffled = [...unassignedMembers].sort(() => Math.random() - 0.5);
    const updated = [...members];

    let groupIdx = 0;
    const groupCapacities: Record<string, number> = {};
    activeGroups.forEach((g) => {
      groupCapacities[g.id] = assignedByGroup[g.id]?.length || 0;
    });

    const newAssignments: { id: string; name?: string; team_id: string; team_name: string }[] = [];

    shuffled.forEach((member) => {
      // Find next group that has space
      let attempts = 0;
      while (
        attempts < activeGroups.length &&
        groupCapacities[activeGroups[groupIdx].id] >= membersPerGroup
      ) {
        groupIdx = (groupIdx + 1) % activeGroups.length;
        attempts++;
      }

      const assignedGroup = activeGroups[groupIdx];
      groupCapacities[assignedGroup.id] = (groupCapacities[assignedGroup.id] || 0) + 1;

      newAssignments.push({
        id: member.id,
        name: member.name,
        team_id: assignedGroup.id,
        team_name: assignedGroup.name,
      });

      // Update in state
      const targetIdx = updated.findIndex((m) => m.id === member.id);
      if (targetIdx !== -1) {
        updated[targetIdx] = {
          ...updated[targetIdx],
          team_id: assignedGroup.id,
          team_name: assignedGroup.name,
          assigned_at: new Date().toISOString(),
        };
      }

      groupIdx = (groupIdx + 1) % activeGroups.length;
    });

    syncMembersState(updated);
    triggerConfetti();

    // Persist to Supabase
    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      saveAllGroupAssignmentsToSupabase(newAssignments).then((res) => {
        if (res.success) {
          setSyncStatus("saved");
          setSyncMessage("Seluruh anggota berhasil dibagikan dan tersimpan otomatis!");
        } else {
          setSyncStatus("error");
          setSyncMessage(res.error || "Gagal menyimpan ke Supabase");
        }
      });
    }
  };

  // Reset all assignments (kembalikan ke pool) dan seluruh skor papan tim ke 0
  const handleResetAssignments = () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin mereset seluruh pembagian kelompok dan mengatur ulang skor seluruh papan tim ke 0?"
      )
    ) {
      return;
    }

    const reset = members.map((m) => ({
      ...m,
      team_id: null,
      team_name: null,
      assigned_at: null,
    }));
    syncMembersState(reset);
    setSelectedWinner(null);

    // Kirim sinyal update ke halaman arena dan papan agar skor langsung sinkron ke 0
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bof_scores_reset_at", Date.now().toString());
        window.dispatchEvent(new Event("bof_data_updated"));
      } catch {}
    }

    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      Promise.all([
        resetAllGroupAssignmentsInSupabase(),
        resetAllSubmissionsInSupabase(),
      ]).then(([assignRes, submitRes]) => {
        if (assignRes.success && submitRes.success) {
          setSyncStatus("saved");
          setSyncMessage(
            "Pembagian kelompok & seluruh skor papan tim berhasil diatur ulang ke 0 (Tersimpan otomatis)!"
          );
        } else {
          setSyncStatus("error");
          setSyncMessage(
            assignRes.error || submitRes.error || "Gagal mereset data di Supabase"
          );
        }
      });
    }
  };

  // Remove single member from their group assignment
  const handleUnassignMember = (memberId: string) => {
    const updated = members.map((m) =>
      m.id === memberId
        ? { ...m, team_id: null, team_name: null, assigned_at: null }
        : m
    );
    syncMembersState(updated);

    const targetMember = members.find((m) => m.id === memberId);
    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      saveAllGroupAssignmentsToSupabase([
        { id: memberId, name: targetMember?.name || "", team_id: null, team_name: null },
      ]).then((res) => {
        if (res.success) {
          setSyncStatus("saved");
          setSyncMessage("Anggota berhasil dikembalikan ke pool (Tersimpan otomatis).");
        } else {
          setSyncStatus("error");
          setSyncMessage(res.error || "Gagal memperbarui status anggota");
        }
      });
    }
  };

  // Add single member
  const handleAddSingleMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      addMemberToSupabase(name).then((res) => {
        if (res.success && res.data) {
          syncMembersState([...members, res.data!]);
          setNewMemberName("");
          setSyncStatus("saved");
          setSyncMessage(`Anggota "${name}" berhasil ditambahkan dan tersimpan otomatis.`);
        } else {
          setSyncStatus("error");
          setSyncMessage(res.error || "Gagal menambah anggota");
        }
      });
    } else {
      // Local fallback
      const localMember: MemberRecord = {
        id: `local_${Date.now()}_${Math.random()}`,
        name,
        team_id: null,
        team_name: null,
        created_at: new Date().toISOString(),
      };
      syncMembersState([...members, localMember]);
      setNewMemberName("");
    }
  };

  // Add bulk members
  const handleAddBulkMembers = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkInputText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      addBulkMembersToSupabase(lines).then((res) => {
        if (res.success && res.data) {
          syncMembersState([...members, ...res.data!]);
          setBulkInputText("");
          setIsBulkOpen(false);
          setSyncStatus("saved");
          setSyncMessage(`Berhasil menambahkan ${res.data.length} anggota baru (Tersimpan otomatis)!`);
        } else {
          setSyncStatus("error");
          setSyncMessage(res.error || "Gagal menambahkan anggota bulk");
        }
      });
    } else {
      // Local fallback
      const newItems: MemberRecord[] = lines.map((name) => ({
        id: `local_${Date.now()}_${Math.random()}`,
        name,
        team_id: null,
        team_name: null,
        created_at: new Date().toISOString(),
      }));
      syncMembersState([...members, ...newItems]);
      setBulkInputText("");
      setIsBulkOpen(false);
    }
  };

  // Delete single member
  const handleDeleteMember = (memberId: string) => {
    if (!confirm("Hapus anggota ini dari daftar?")) return;

    syncMembersState(members.filter((m) => m.id !== memberId));
    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      deleteMemberFromSupabase(memberId).then((res) => {
        if (res.success) {
          setSyncStatus("saved");
          setSyncMessage("Anggota berhasil dihapus (Tersimpan otomatis).");
        } else {
          setSyncStatus("error");
          setSyncMessage(res.error || "Gagal menghapus anggota");
        }
      });
    }
  };

  // Delete all members
  const handleDeleteAllMembers = () => {
    if (!confirm("HAPUS SELURUH ANGGOTA? Tindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    syncMembersState([]);
    if (isSupabaseConfigured) {
      setSyncStatus("saving");
      deleteAllMembersFromSupabase().then(() => {
        setSyncStatus("saved");
        setSyncMessage("Seluruh anggota telah dihapus (Tersimpan otomatis).");
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] bg-grid-pattern text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-[#070b14]/95 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Kembali ke Arena</span>
            <span className="sm:hidden">Arena</span>
          </Link>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/30">
              <Dices className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
                  SPIN PEMBAGIAN KELOMPOK
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider hidden sm:inline-block">
                  Live Spin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">
                Undi anggota ke dalam kelompok secara acak 
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Tabs */}
        <div className="flex items-center gap-2">
          {/* Tab Navigation */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("spin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "spin"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Arena Spin</span>
            </button>

            <button
              onClick={() => setActiveTab("manage")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "manage"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Anggota ({members.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pengaturan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Database Sync Notification Toast */}
      {syncStatus !== "idle" && (
        <div
          className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-between border-b transition-all ${
            syncStatus === "saving"
              ? "bg-blue-950/80 border-blue-500/40 text-blue-300"
              : syncStatus === "saved"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncStatus === "saving" && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
              {syncStatus === "saved" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {syncStatus === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                {syncStatus === "saving"
                  ? "Menyimpan data ke database Supabase..."
                  : syncMessage || "Data berhasil disinkronkan ke Supabase!"}
              </span>
            </div>
            <button
              onClick={() => setSyncStatus("idle")}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* TAB 1: ARENA SPIN */}
        {activeTab === "spin" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Control Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Target Kelompok Berikutnya:</div>
                  <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    {nextTargetGroup ? (
                      <>
                        <span className="text-purple-400">{nextTargetGroup.name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                          Slot: {assignedByGroup[nextTargetGroup.id]?.length || 0} /{" "}
                          {membersPerGroup}
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Semua Kelompok Telah Penuh!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRandomizeAll}
                  disabled={unassignedMembers.length === 0 || isSpinning}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bagi Semua Otomatis</span>
                </button>

                <button
                  onClick={handleResetAssignments}
                  disabled={isSpinning || members.every((m) => !m.team_id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Pembagian</span>
                </button>
              </div>
            </div>

            {/* Split View: Wheel on Left, Groups on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Spin Wheel (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
                {/* Pointer Flapper at Top */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_4px_10px_rgba(239,68,68,0.5)]">
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-rose-500" />
                </div>

                {/* Canvas Wheel */}
                <div className="relative my-4 flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="max-w-full w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full drop-shadow-[0_0_35px_rgba(168,85,247,0.25)] transition-all"
                  />

                  {/* Clickable Center Spin Trigger */}
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning || unassignedMembers.length === 0 || !nextTargetGroup}
                    className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-purple-700 to-pink-500 hover:from-purple-600 hover:to-pink-400 text-white font-black text-sm flex flex-col items-center justify-center shadow-2xl border-4 border-slate-900 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>SPIN!</span>
                  </button>
                </div>

                {/* Spin Controls & Status */}
                <div className="w-full mt-2 text-center space-y-3">
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning || unassignedMembers.length === 0 || !nextTargetGroup}
                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                      isSpinning
                        ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                        : unassignedMembers.length === 0
                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                    <span>
                      {isSpinning
                        ? "Sedang Memutar Roda..."
                        : unassignedMembers.length === 0
                        ? "Seluruh Anggota Telah Terbagi"
                        : `PUTAR UNTUK ${nextTargetGroup?.name || "KELOMPOK"}`}
                    </span>
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                    <span>Sisa di Roda:</span>
                    <span className="font-bold text-white font-mono">
                      {unassignedMembers.length} Orang
                    </span>
                  </div>
                </div>

                {/* Pool of Unassigned Members Preview */}
                {unassignedMembers.length > 0 && (
                  <div className="w-full mt-4 pt-4 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Daftar Anggota Belum Diundi ({unassignedMembers.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {unassignedMembers.map((m) => (
                        <span
                          key={m.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Group Cards (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      Hasil Pembagian Kelompok
                    </h2>
                    <p className="text-xs text-slate-400">
                      Kapasitas maksimal: {membersPerGroup} anggota per kelompok
                    </p>
                  </div>

                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30 font-mono">
                    {members.filter((m) => m.team_id).length} / {members.length} Terbagi
                  </span>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeGroups.map((group) => {
                    const membersInGroup = assignedByGroup[group.id] || [];
                    const isTarget = nextTargetGroup?.id === group.id;
                    const isFull = membersInGroup.length >= membersPerGroup;

                    return (
                      <div
                        key={group.id}
                        className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                          isTarget
                            ? "bg-slate-900 border-2 border-purple-500 shadow-xl shadow-purple-500/15 scale-[1.01]"
                            : isFull
                            ? "bg-slate-900/60 border-slate-800/80"
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
                            <div>
                              <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                                <span>{group.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {isFull ? "Kelompok Lengkap" : `${membersPerGroup - membersInGroup.length} slot tersisa`}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isTarget && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                                  TARGET
                                </span>
                              )}
                              <span
                                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                                  isFull
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {membersInGroup.length} / {membersPerGroup}
                              </span>
                            </div>
                          </div>

                          {/* Members List */}
                          <div className="space-y-1.5 min-h-[90px]">
                            {membersInGroup.length > 0 ? (
                              membersInGroup.map((member, idx) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 group"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="font-semibold">{member.name}</span>
                                  </div>

                                  <button
                                    onClick={() => handleUnassignMember(member.id)}
                                    className="text-slate-500 hover:text-rose-400 transition-colors p-1 opacity-60 hover:opacity-100 cursor-pointer"
                                    title="Keluarkan dari kelompok"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="h-full flex items-center justify-center text-center text-xs text-slate-600 italic py-6">
                                Belum ada anggota
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isFull
                                  ? "bg-emerald-500"
                                  : "bg-gradient-to-r from-purple-500 to-pink-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  (membersInGroup.length / membersPerGroup) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA ANGGOTA */}
        {activeTab === "manage" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            {/* Input Form Header */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white">Input Anggota Baru</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Anggota yang ditambahkan akan tersimpan otomatis 
                  </p>
                </div>

                <button
                  onClick={() => setIsBulkOpen(!isBulkOpen)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  {isBulkOpen ? "Tutup Input Banyak" : "Tempel Banyak Nama Sekaligus"}
                </button>
              </div>

              {/* Single Member Input */}
              <form onSubmit={handleAddSingleMember} className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Ketik nama anggota (contoh: Muhammad Rizky)..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!newMemberName.trim()}
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Bulk Input Drawer */}
              {isBulkOpen && (
                <form
                  onSubmit={handleAddBulkMembers}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn"
                >
                  <div className="text-xs font-bold text-slate-300">
                    Tempel daftar nama (pisahkan dengan baris baru atau koma):
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Budi Santoso&#10;Siti Rahma&#10;Ahmad Fauzi&#10;Dewi Lestari&#10;Kevin Pratama"
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Format: 1 nama per baris
                    </span>
                    <button
                      type="submit"
                      disabled={!bulkInputText.trim()}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-40"
                    >
                      Impor Semua Nama
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List of Saved Members in Database */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-black text-white">
                    Data Anggota di Supabase ({members.length})
                  </span>
                </div>

                {members.length > 0 && (
                  <button
                    onClick={handleDeleteAllMembers}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Seluruh Data</span>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Memuat data anggota dari database...
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>Belum ada data anggota di database Supabase.</div>
                  <div className="text-slate-600 text-[11px]">
                    Tambahkan nama anggota pada form di atas untuk memulai undian.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {members.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">{idx + 1}.</span>
                          <span className="text-xs font-bold text-white truncate block">
                            {m.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {m.team_name ? (
                            <span className="text-purple-300">Masuk: {m.team_name}</span>
                          ) : (
                            <span className="text-slate-500">Belum terbagi</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Hapus anggota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN KELOMPOK */}
        {activeTab === "settings" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-xl font-black text-white">Pengaturan Pembagian Kelompok</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Atur kapasitas setiap kelompok dan jenis kelompok yang diinginkan
                </p>
              </div>

              {/* Members Per Group Setting */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">
                      Jumlah Anggota per Kelompok
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Setiap kelompok akan menampung maksimal sejumlah anggota ini
                    </div>
                  </div>

                  {/* Number Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = Math.max(1, membersPerGroup - 1);
                        setMembersPerGroup(next);
                        updateSettingsAndAutoSave(next, groupType, customGroupCount);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-black text-lg text-purple-400">
                      {membersPerGroup}
                    </span>
                    <button
                      onClick={() => {
                        const next = Math.min(20, membersPerGroup + 1);
                        setMembersPerGroup(next);
                        updateSettingsAndAutoSave(next, groupType, customGroupCount);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Group Type Selection */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div>
                  <div className="text-sm font-bold text-white">Jenis Kelompok</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Pilih apakah menggunakan 5 Tim Fakultas resmi BOF atau Kelompok Dinamis
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setGroupType("faculty");
                      updateSettingsAndAutoSave(membersPerGroup, "faculty", customGroupCount);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      groupType === "faculty"
                        ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm text-white mb-1">
                      5 Tim Fakultas BOF
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Fakultas Teknik, Fasilkom, Kedokteran, FMIPA, dan FEB. Hasil pembagian langsung tampil di halaman beranda.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setGroupType("custom");
                      updateSettingsAndAutoSave(membersPerGroup, "custom", customGroupCount);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      groupType === "custom"
                        ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm text-white mb-1">
                      Kelompok Dinamis (Kustom)
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Kelompok 1, Kelompok 2, Kelompok 3, dst. Jumlah kelompok dapat disesuaikan bebas.
                    </p>
                  </div>
                </div>

                {groupType === "custom" && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Jumlah Kelompok Dinamis:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const next = Math.max(2, customGroupCount - 1);
                          setCustomGroupCount(next);
                          updateSettingsAndAutoSave(membersPerGroup, groupType, next);
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-white">
                        {customGroupCount}
                      </span>
                      <button
                        onClick={() => {
                          const next = Math.min(12, customGroupCount + 1);
                          setCustomGroupCount(next);
                          updateSettingsAndAutoSave(membersPerGroup, groupType, next);
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Distribution Strategy */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div>
                  <div className="text-sm font-bold text-white">Metode Distribusi Undian</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Cara pembagian slot kelompok saat anggota terpilih di roda
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDistributionMode("round_robin")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      distributionMode === "round_robin"
                        ? "bg-purple-950/40 border-purple-500"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs text-white">
                      Merata (Round-Robin)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Setiap kelompok mendapat 1 anggota bergantian hingga merata.
                    </div>
                  </div>

                  <div
                    onClick={() => setDistributionMode("sequential")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      distributionMode === "sequential"
                        ? "bg-purple-950/40 border-purple-500"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs text-white">
                      Sekuensial (Penuhkan Kelompok)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Penuhkan kelompok 1 terlebih dahulu, lalu kelompok 2, dst.
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Save Notice */}
              {/* <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pengaturan kelompok tersimpan otomatis ke database Supabase setiap kali diubah.</span>
              </div> */}
            </div>
          </div>
        )}
      </main>

      {/* Winner Celebration Modal */}
      {selectedWinner && (
        <div
          onClick={() => setSelectedWinner(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-purple-950/40 to-slate-950 p-6 sm:p-8 border-2 border-purple-500 shadow-2xl text-center space-y-5 animate-scaleUp"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-500/30 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                HASIL SPIN ANGGOTA
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {selectedWinner.member.name}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30">
              <div className="text-xs text-slate-400">Dimasukkan ke dalam:</div>
              <div className="text-lg font-black text-purple-300 mt-1">
                {selectedWinner.group.name}
              </div>
            </div>

            <button
              onClick={() => setSelectedWinner(null)}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-purple-600/40"
            >
              Lanjutkan Pengundian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
