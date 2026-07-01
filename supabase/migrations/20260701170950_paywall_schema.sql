-- ============================================================================
-- Sistema Paywall: piani, feature, limiti, abbonamenti, admin
-- Gerarchia additiva: plans.tier (int) + features.min_tier / plan_limits
-- Una feature/limite si applica a un piano se plan.tier >= min_tier
-- ============================================================================

-- 1. PLANS ------------------------------------------------------------------
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  tier int NOT NULL UNIQUE,
  price_monthly_cents int NOT NULL DEFAULT 0,
  price_yearly_cents int NOT NULL DEFAULT 0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. FEATURES -----------------------------------------------------------------
CREATE TABLE public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  min_tier int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. PLAN LIMITS --------------------------------------------------------------
CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  limit_key text NOT NULL,
  limit_value int, -- NULL = illimitato
  UNIQUE (plan_id, limit_key)
);

-- 4. SUBSCRIPTIONS --------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete')),
  provider text NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('stripe', 'manual')),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  billing_interval text CHECK (billing_interval IN ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. PAYMENT EVENTS (audit log) -------------------------------------------------
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  subscription_id uuid REFERENCES public.subscriptions(id),
  source text NOT NULL CHECK (source IN ('stripe_webhook', 'admin_manual', 'admin_simulate')),
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ADMIN USERS ------------------------------------------------------------------
CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. HELPER FUNCTIONS (SECURITY DEFINER, evitano ricorsione RLS) ----------------
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;

CREATE OR REPLACE FUNCTION public.get_user_plan_tier(uid uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.tier
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = uid
        AND s.status IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY p.tier DESC
      LIMIT 1
    ),
    0
  );
$$;

-- Aggiorna updated_at automaticamente (pattern generico riusabile)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER features_set_updated_at BEFORE UPDATE ON public.features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. ROW LEVEL SECURITY ----------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- plans: lettura pubblica dei piani attivi, scrittura solo admin
CREATE POLICY "Anyone can view active plans"
ON public.plans FOR SELECT
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage plans"
ON public.plans FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- features: lettura per utenti autenticati (serve al frontend per il gating), scrittura solo admin
CREATE POLICY "Authenticated users can view features"
ON public.features FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage features"
ON public.features FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- plan_limits: stesso pattern di features
CREATE POLICY "Authenticated users can view plan limits"
ON public.plan_limits FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plan limits"
ON public.plan_limits FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- subscriptions: utente vede solo la propria, admin vede tutte. Nessuna scrittura da client
-- (solo service_role via edge functions puo' scrivere, bypassando RLS by design)
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- payment_events: solo admin puo' leggere, nessuna scrittura da client
CREATE POLICY "Admins can view payment events"
ON public.payment_events FOR SELECT
USING (public.is_admin(auth.uid()));

-- admin_users: un utente puo' verificare se stesso, un admin vede tutti. Nessuna scrittura da client
CREATE POLICY "Users can check own admin status"
ON public.admin_users FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 9. SEED: piani iniziali (Free / Plus / Pro) -------------------------------------
INSERT INTO public.plans (key, name, tier, price_monthly_cents, price_yearly_cents, description, sort_order) VALUES
  ('free', 'Free', 0, 0, 0, 'Perfetto per iniziare', 0),
  ('plus', 'Plus', 1, 900, 8600, 'Per la casa moderna', 1),
  ('pro', 'Pro', 2, 2900, 27800, 'Per chi vuole tutto senza limiti', 2);

-- Limiti numerici per piano
INSERT INTO public.plan_limits (plan_id, limit_key, limit_value)
SELECT id, l.limit_key, l.limit_value
FROM public.plans, LATERAL (VALUES
  ('max_dispense', CASE key WHEN 'free' THEN 1 WHEN 'plus' THEN 10 ELSE NULL END),
  ('max_prodotti', CASE key WHEN 'free' THEN 50 ELSE NULL END),
  ('max_scanner', CASE key WHEN 'free' THEN 1 WHEN 'plus' THEN 5 ELSE NULL END),
  ('max_membri_gruppo', CASE key WHEN 'free' THEN 1 WHEN 'plus' THEN 5 ELSE NULL END)
) AS l(limit_key, limit_value);

-- Feature booleane con min_tier (gerarchia additiva)
INSERT INTO public.features (key, name, description, min_tier) VALUES
  ('notifiche_base', 'Notifiche base', 'Notifiche standard su scadenze e scorte', 0),
  ('scanner_avanzato', 'Funzioni scanner avanzate', 'Gestione avanzata degli scanner fisici', 1),
  ('analytics_avanzati', 'Analytics avanzati', 'Grafici e statistiche estese', 1),
  ('liste_spesa_automatiche', 'Liste della spesa automatiche', 'Generazione automatica delle liste spesa', 1),
  ('export_dati', 'Export dati', 'Esportazione dati in CSV/Excel', 1),
  ('multi_utente_gruppi', 'Gruppi multi-utente estesi', 'Gruppi famiglia senza limiti di membri', 2),
  ('api_access', 'Accesso API', 'Accesso alle API per integrazioni personalizzate', 2),
  ('supporto_prioritario', 'Supporto prioritario', 'Supporto prioritario dedicato', 2);
