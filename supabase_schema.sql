-- ====================================================================
-- SKRIP DATABASE SUPABASE LENGKAP: ARENA SUBMISSIONS & FITUR SPIN
-- Jalankan skrip ini langsung pada Supabase SQL Editor
-- ====================================================================

-- 1. Buat Tabel 'submissions' untuk mencatat jawaban & skor permainan
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL,
    board_id INT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    user_answers JSONB DEFAULT '{}'::jsonb,
    step_results JSONB DEFAULT '{}'::jsonb,
    time_spent_seconds INT DEFAULT 0,
    points_awarded INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan kolom yang diperlukan tersedia jika tabel sudah pernah dibuat sebelumnya
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='team_id') THEN
        ALTER TABLE public.submissions ADD COLUMN team_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='board_id') THEN
        ALTER TABLE public.submissions ADD COLUMN board_id INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='is_correct') THEN
        ALTER TABLE public.submissions ADD COLUMN is_correct BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='user_answers') THEN
        ALTER TABLE public.submissions ADD COLUMN user_answers JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='step_results') THEN
        ALTER TABLE public.submissions ADD COLUMN step_results JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='time_spent_seconds') THEN
        ALTER TABLE public.submissions ADD COLUMN time_spent_seconds INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='submissions' AND column_name='points_awarded') THEN
        ALTER TABLE public.submissions ADD COLUMN points_awarded INT DEFAULT 0;
    END IF;
END $$;

-- Hapus foreign key constraint 'submissions_team_id_fkey' agar mendukung id kelompok kustom/dinamis
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_team_id_fkey;
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS check_team_id;

-- 2. Buat Tabel 'members' untuk menyimpan nama anggota & penugasan kelompok
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    team_id TEXT,             -- ID tim/kelompok (misal: 'ft', 'fasilkom', 'fk', 'fmipa', 'feb', atau 'custom_1')
    team_name TEXT,           -- Nama tim/kelompok (misal: 'Fakultas Teknik', 'Kelompok 1')
    assigned_at TIMESTAMPTZ,  -- Waktu pengundian anggota ke kelompok
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan kolom yang diperlukan tersedia jika tabel sudah pernah dibuat sebelumnya
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='members' AND column_name='team_id') THEN
        ALTER TABLE public.members ADD COLUMN team_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='members' AND column_name='team_name') THEN
        ALTER TABLE public.members ADD COLUMN team_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='members' AND column_name='assigned_at') THEN
        ALTER TABLE public.members ADD COLUMN assigned_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Buat Tabel 'group_settings' untuk menyimpan konfigurasi jumlah anggota per kelompok
CREATE TABLE IF NOT EXISTS public.group_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    members_per_group INT DEFAULT 4,
    group_type TEXT DEFAULT 'faculty',
    custom_groups JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Akses Publik (Anon & Authenticated) untuk Tabel 'submissions'
DROP POLICY IF EXISTS "Public Read on submissions" ON public.submissions;
CREATE POLICY "Public Read on submissions" 
    ON public.submissions FOR SELECT 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Public Insert on submissions" ON public.submissions;
CREATE POLICY "Public Insert on submissions" 
    ON public.submissions FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update on submissions" ON public.submissions;
CREATE POLICY "Public Update on submissions" 
    ON public.submissions FOR UPDATE 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Public Delete on submissions" ON public.submissions;
CREATE POLICY "Public Delete on submissions" 
    ON public.submissions FOR DELETE 
    TO anon, authenticated 
    USING (true);

-- 6. Kebijakan Akses Publik (Anon & Authenticated) untuk Tabel 'members'
DROP POLICY IF EXISTS "Public Read on members" ON public.members;
CREATE POLICY "Public Read on members" 
    ON public.members FOR SELECT 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Public Insert on members" ON public.members;
CREATE POLICY "Public Insert on members" 
    ON public.members FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update on members" ON public.members;
CREATE POLICY "Public Update on members" 
    ON public.members FOR UPDATE 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Public Delete on members" ON public.members;
CREATE POLICY "Public Delete on members" 
    ON public.members FOR DELETE 
    TO anon, authenticated 
    USING (true);

-- 7. Kebijakan Akses Publik untuk Tabel 'group_settings'
DROP POLICY IF EXISTS "Public All on group_settings" ON public.group_settings;
CREATE POLICY "Public All on group_settings" 
    ON public.group_settings FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Inisialisasi baris konfigurasi default jika belum ada
INSERT INTO public.group_settings (id, members_per_group, group_type, custom_groups)
VALUES ('default', 4, 'faculty', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
