import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Package, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AddDispensaDialog } from '@/components/AddDispensaDialog';

interface Dispensa {
  id: string;
  name: string;
  location: string | null;
  icon: string | null;
  status: string | null;
  products_count: number | null;
  created_at: string;
  updated_at: string;
}

const Dispense = () => {
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDispense = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dispense')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDispense(data || []);
    } catch (error) {
      console.error('Error fetching dispense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispense();
  }, [user]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "online":
        return "success";
      case "warning":
        return "warning";
      case "offline":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getTimeSinceCreation = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} min fa`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}g fa`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dispense</h1>
          <p className="text-muted-foreground">
            Visualizza tutte le location di stoccaggio
          </p>
        </div>
        <AddDispensaDialog onDispensaAdded={fetchDispense} />
      </div>

      {dispense.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Warehouse className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna dispensa</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Inizia aggiungendo la tua prima dispensa per organizzare i tuoi prodotti
            </p>
            <AddDispensaDialog onDispensaAdded={fetchDispense} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dispense.map((dispensa) => (
            <Card
              key={dispensa.id}
              className="hover:shadow-glow transition-all cursor-pointer group animate-fade-in"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Warehouse className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dispensa.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dispensa.location || 'Nessuna posizione'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(dispensa.status)}>
                    {dispensa.status || 'offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Prodotti</span>
                  </div>
                  <span className="text-2xl font-bold">{dispensa.products_count || 0}</span>
                </div>

                <div className="pt-3 border-t text-sm text-muted-foreground">
                  Creata: {getTimeSinceCreation(dispensa.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dispense;
