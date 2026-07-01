import { useSubscription } from '@/contexts/SubscriptionContext';

export function useFeature(featureKey: string): boolean {
  const { hasFeature } = useSubscription();
  return hasFeature(featureKey);
}

export function useLimit(limitKey: string): number | null {
  const { getLimit } = useSubscription();
  return getLimit(limitKey);
}
