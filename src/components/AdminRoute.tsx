import { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/backend/client';
import { useAuth } from '@/contexts/AuthContext';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc('is_admin', { uid: user.id })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
