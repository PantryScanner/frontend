import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/backend/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Plan = Tables<'plans'>;
export type Subscription = Tables<'subscriptions'>;
export type Feature = Tables<'features'>;
export type PlanLimit = Tables<'plan_limits'>;

interface SubscriptionContextType {
  plan: Plan | null;
  subscription: Subscription | null;
  features: Feature[];
  limits: Record<string, number | null>;
  isLoading: boolean;
  hasFeature: (featureKey: string) => boolean;
  getLimit: (limitKey: string) => number | null;
  refreshSubscription: () => Promise<void>;
}

const FREE_TIER = 0;

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const freePlan = useCallback(
    () => allPlans.find((p) => p.tier === FREE_TIER) ?? null,
    [allPlans],
  );

  const fetchStaticCatalog = useCallback(async () => {
    const [{ data: plansData }, { data: featuresData }, { data: limitsData }] =
      await Promise.all([
        supabase.from('plans').select('*').eq('is_active', true).order('tier'),
        supabase.from('features').select('*').order('min_tier'),
        supabase.from('plan_limits').select('*'),
      ]);

    setAllPlans(plansData ?? []);
    setFeatures(featuresData ?? []);
    setPlanLimits(limitsData ?? []);
    return plansData ?? [];
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const plansData = allPlans.length > 0 ? allPlans : await fetchStaticCatalog();

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const isActive =
        sub &&
        ['active', 'trialing'].includes(sub.status) &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

      const activePlan = isActive
        ? plansData.find((p) => p.id === sub!.plan_id) ?? null
        : null;

      setSubscription(sub ?? null);
      setPlan(activePlan ?? plansData.find((p) => p.tier === FREE_TIER) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [user, allPlans, fetchStaticCatalog]);

  useEffect(() => {
    fetchStaticCatalog();
  }, [fetchStaticCatalog]);

  useEffect(() => {
    fetchSubscription();
  }, [user, fetchSubscription]);

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      const tier = plan?.tier ?? FREE_TIER;
      const feature = features.find((f) => f.key === featureKey);
      if (!feature) return false;
      return tier >= feature.min_tier;
    },
    [plan, features],
  );

  const getLimit = useCallback(
    (limitKey: string): number | null => {
      const currentPlan = plan ?? freePlan();
      if (!currentPlan) return null;
      const limit = planLimits.find(
        (l) => l.plan_id === currentPlan.id && l.limit_key === limitKey,
      );
      return limit ? limit.limit_value : null;
    },
    [plan, planLimits, freePlan],
  );

  const currentPlanId = plan?.id ?? freePlan()?.id;
  const limits = Object.fromEntries(
    planLimits
      .filter((l) => l.plan_id === currentPlanId)
      .map((l) => [l.limit_key, l.limit_value]),
  );

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        subscription,
        features,
        limits,
        isLoading,
        hasFeature,
        getLimit,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
