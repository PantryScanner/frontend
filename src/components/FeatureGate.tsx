import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeature } from '@/hooks/useFeature';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultUpgradeCta = () => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
    <Lock className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">
      Questa funzione richiede un piano superiore.
    </p>
    <Link to="/pricing">
      <Button size="sm">Scopri i piani</Button>
    </Link>
  </div>
);

export const FeatureGate = ({ feature, children, fallback }: FeatureGateProps) => {
  const unlocked = useFeature(feature);

  if (!unlocked) {
    return <>{fallback ?? <DefaultUpgradeCta />}</>;
  }

  return <>{children}</>;
};
