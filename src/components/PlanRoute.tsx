import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface PlanRouteProps {
  feature: string;
  children: React.ReactNode;
}

export const PlanRoute = ({ feature, children }: PlanRouteProps) => {
  const { hasFeature, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};
