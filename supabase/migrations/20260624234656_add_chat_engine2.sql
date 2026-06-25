-- ==========================================================
-- FEATURE: CHAT ENGINE INFRASTRUCTURE (UPDATED)
-- ==========================================================

-- 1. CREATE CHAT THREADS TABLE
-- Tracks the overarching support context tied to a specific claim
-- Updated chat_threads schema matching a strict 1:1 dependency mapping
CREATE TABLE public.chat_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL,
  complaint_title text NOT NULL,
  complaint_description text NOT NULL,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
  CONSTRAINT chat_threads_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE,
  CONSTRAINT chat_threads_claim_id_unique UNIQUE (claim_id) -- Enforces strict 1:1 relationship
);

-- 2. CREATE CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HIGH-TRAFFIC PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_chat_threads_claim_id ON public.chat_threads(claim_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON public.chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Threads Security Policies
CREATE POLICY "Clients can view threads linked to their claims"
  ON public.chat_threads FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE claims.id = chat_threads.claim_id AND claims.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create threads for their own claims"
  ON public.chat_threads FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE claims.id = claim_id AND claims.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins have total threads access"
  ON public.chat_threads FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Chat Messages Security Policies
CREATE POLICY "Users can view messages if they belong to the thread"
  ON public.chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads 
      JOIN public.claims ON claims.id = chat_threads.claim_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND (claims.client_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

CREATE POLICY "Users can insert messages if they belong to the thread"
  ON public.chat_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_threads 
      JOIN public.claims ON claims.id = thread_id 
      WHERE chat_threads.id = thread_id 
      AND (claims.client_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

-- 5. REALTIME BROADCAST ENGINE CONFIGURATION
-- Note: If already added to publication in your DB, this line might throw an informational notice, which is safe.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;