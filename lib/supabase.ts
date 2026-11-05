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
    const { data, error } = await supabase
      .from("submissions")
      .insert([
        {
          team_id: payload.teamId,
          board_id: payload.boardId,
          is_correct: payload.isCorrect,
          user_answers: payload.userAnswers,
          step_results: payload.stepResults,
          time_spent_seconds: payload.timeSpentSeconds,
          points_awarded: payload.pointsAwarded,
        },
      ])
      .select();

    if (error) {
      console.error("[Supabase] Gagal menyimpan submission:", error);
      return { success: false, error: error.message };
    }

    console.log("[Supabase] Berhasil menyimpan submission ke database:", data);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan koneksi";
    console.error("[Supabase] Exception saat submit:", message);
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
