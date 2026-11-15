import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    !supabaseUrl.includes("placeholder")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export interface SubmissionPayload {
  teamId: string;
  boardId: number;
  isCorrect: boolean;
  userAnswers: Record<string, string>;
  stepResults: Record<string, boolean>;
  timeSpentSeconds: number;
  pointsAwarded: number;
}

export interface SupabaseSubmissionRow {
  id: string;
  team_id: string;
  board_id: number;
  is_correct: boolean;
  user_answers: Record<string, string>;
  step_results: Record<string, boolean>;
  time_spent_seconds: number;
  points_awarded: number;
  created_at: string;
}

/**
 * Kirim hasil jawaban pengerjaan ke database Supabase (tabel public.submissions)
 */
export async function submitGameResultToSupabase(payload: SubmissionPayload): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  if (!supabase) {
    console.warn("[Supabase] URL atau Anon Key belum terkonfigurasi di environment variables.");
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const submissionRow = {
      team_id: payload.teamId,
      board_id: payload.boardId,
      is_correct: payload.isCorrect,
      user_answers: payload.userAnswers,
      step_results: payload.stepResults,
      time_spent_seconds: payload.timeSpentSeconds,
      points_awarded: payload.pointsAwarded,
    };

    const { data, error } = await supabase
      .from("submissions")
      .insert([submissionRow])
      .select();

    if (error) {
      // Jika terjadi error foreign key constraint 23503 (team_id belum terdaftar di tabel teams)
      if (error.code === "23503") {
        try {
          const teamName = payload.teamId.startsWith("custom_")
            ? `Kelompok ${payload.teamId.replace("custom_", "")}`
            : payload.teamId;

          // Coba daftarkan tim ke tabel teams agar constraint terpenuhi
          await supabase
            .from("teams")
            .upsert({ id: payload.teamId, name: teamName });

          // Coba ulangi insert submission
          const retryRes = await supabase
            .from("submissions")
            .insert([submissionRow])
            .select();

          if (!retryRes.error && retryRes.data) {
            console.log("[Supabase] Berhasil menyimpan submission setelah registrasi tim:", retryRes.data);
            return { success: true, data: retryRes.data };
          }
        } catch {
          // Lanjutkan penanganan error default
        }
      }

      const errorMsg = error.message || error.details || error.hint || error.code || "Gagal menyimpan submission ke database";
      console.warn("[Supabase] Gagal menyimpan submission:", errorMsg, {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { success: false, error: errorMsg };
    }

    console.log("[Supabase] Berhasil menyimpan submission ke database:", data);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan koneksi";
    console.warn("[Supabase] Exception saat submit:", message);
    return { success: false, error: message };
  }
}

/**
 * Ambil seluruh riwayat pengerjaan dari database untuk sinkronisasi skor & papan selesai
 */
export async function fetchSubmissionsFromSupabase(): Promise<{
  success: boolean;
  data: SupabaseSubmissionRow[];
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: [] };
  }

  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data as SupabaseSubmissionRow[]) || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data dari Supabase";
    return { success: false, data: [], error: message };
  }
}

export interface MemberRecord {
  id: string;
  name: string;
  team_id: string | null;
  team_name: string | null;
  assigned_at?: string | null;
  created_at?: string;
}

export interface GroupSettingsRecord {
  id?: string;
  members_per_group: number;
  group_type: "faculty" | "custom";
  custom_groups: { id: string; name: string }[];
  updated_at?: string;
}

/**
 * Mengambil seluruh data anggota dari tabel 'members'
 */
export async function fetchMembersFromSupabase(): Promise<{
  success: boolean;
  data: MemberRecord[];
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: [], error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[Supabase] Gagal mengambil data anggota:", error.message);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data as MemberRecord[]) || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, data: [], error: message };
  }
}

/**
 * Menambahkan satu anggota baru ke Supabase
 */
export async function addMemberToSupabase(name: string): Promise<{
  success: boolean;
  data?: MemberRecord;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { data, error } = await supabase
      .from("members")
      .insert([{ name: name.trim() }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MemberRecord };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Menambahkan banyak anggota sekaligus (bulk) ke Supabase
 */
export async function addBulkMembersToSupabase(names: string[]): Promise<{
  success: boolean;
  data?: MemberRecord[];
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  const cleanedNames = names
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (cleanedNames.length === 0) {
    return { success: false, error: "Daftar nama tidak boleh kosong" };
  }

  try {
    const rows = cleanedNames.map((name) => ({ name }));
    const { data, error } = await supabase
      .from("members")
      .insert(rows)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as MemberRecord[]) || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Menghapus satu anggota dari Supabase
 */
export async function deleteMemberFromSupabase(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Menghapus seluruh anggota dari Supabase
 */
export async function deleteAllMembersFromSupabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { error } = await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Menyimpan / memperbarui hasil penugasan kelompok untuk banyak anggota
 */
export async function saveAllGroupAssignmentsToSupabase(
  assignments: { id: string; team_id: string | null; team_name: string | null }[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const updatePromises = assignments.map((item) =>
      supabase!
        .from("members")
        .update({
          team_id: item.team_id,
          team_name: item.team_name,
          assigned_at: item.team_id ? new Date().toISOString() : null,
        })
        .eq("id", item.id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.find((r) => r.error);
    if (hasError && hasError.error) {
      return { success: false, error: hasError.error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Mereset seluruh pembagian kelompok (mengembalikan semua anggota menjadi unassigned)
 */
export async function resetAllGroupAssignmentsInSupabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { error } = await supabase
      .from("members")
      .update({
        team_id: null,
        team_name: null,
        assigned_at: null,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Mengambil konfigurasi pembagian kelompok
 */
export async function fetchGroupSettingsFromSupabase(): Promise<{
  success: boolean;
  data?: GroupSettingsRecord;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { data, error } = await supabase
      .from("group_settings")
      .select("*")
      .eq("id", "default")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as GroupSettingsRecord };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}

/**
 * Menyimpan konfigurasi pembagian kelompok
 */
export async function saveGroupSettingsToSupabase(
  settings: Partial<GroupSettingsRecord>
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase belum terkonfigurasi" };
  }

  try {
    const { error } = await supabase
      .from("group_settings")
      .upsert({
        id: "default",
        members_per_group: settings.members_per_group ?? 4,
        group_type: settings.group_type ?? "faculty",
        custom_groups: settings.custom_groups ?? [],
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan koneksi";
    return { success: false, error: message };
  }
}
