-- ==========================================
-- 1. CREATE PROFILES TABLE (Extends auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. CREATE CLAIMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'recovered', 'failed')),
  details TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. HIGH-TRAFFIC PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_claims_client_id ON public.claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

-- ==========================================
-- 4. AUTOMATIC PROFILE SYNC TRIGGER
-- ==========================================
-- This function runs automatically whenever a user signs up via your Auth endpoints
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, kyc_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone_number',
    'unverified'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Profiles Security Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins have total profile access"
  ON public.profiles FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Claims Security Policies
CREATE POLICY "Clients can view their own claims"
  ON public.claims FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own claims"
  ON public.claims FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can alter their own pending claims"
  ON public.claims FOR UPDATE USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins have total claims access"
  ON public.claims FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');