import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, Package, Loader2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from '@/contexts/AuthContext';
import { AddDispensaDialog } from '@/components/AddDispensaDialog';

interface Dispensa {
  id: string;
  name: string;
  location: string | null;
  color: string | null;
  products_count: number | null;
  created_at: string;
  updated_at: string;
  scanners_count: number;
}

const Dispense = () => {
  const navigate = useNavigate();
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDispense = async () => {
    if (!user) return;

    try {
      const { data: dispenseData, error: dispenseError } = await supabase
        .from('dispense')
        .select('*')
        .order('created_at', { ascending: false });

      if (dispenseError) throw dispenseError;

      const { data: scanners, error: scannersError } = await supabase
        .from('scanners')
        .select('dispensa_id');

      if (scannersError) throw scannersError;

      const scannersCount = scanners?.reduce((acc: Record<string, number>, s) => {
        if (s.dispensa_id) {
          acc[s.dispensa_id] = (acc[s.dispensa_id] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      setDispense(
        (dispenseData || []).map((d) => ({
          ...d,
          scanners_count: scannersCount[d.id] || 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching dispense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispense();
  }, [user]);

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
            Gestisci le tue location di stoccaggio e i dispositivi assegnati
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
              Inizia creando la tua prima dispensa per organizzare i prodotti e assegnare gli scanner
            </p>
            <AddDispensaDialog onDispensaAdded={fetchDispense} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dispense.map((dispensa) => (
            <Card
              key={dispensa.id}
              className="hover:shadow-glow transition-all cursor-pointer group animate-fade-in overflow-hidden"
              onClick={() => navigate(`/dispense/${dispensa.id}`)}
            >
              <div 
                className="h-2 w-full"
                style={{ backgroundColor: dispensa.color || '#6366f1' }}
              />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: `${dispensa.color || '#6366f1'}20` }}
                    >
                      <Warehouse 
                        className="h-6 w-6" 
                        style={{ color: dispensa.color || '#6366f1' }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dispensa.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dispensa.location || 'Nessuna posizione'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Prodotti</span>
                    <span className="ml-auto text-lg font-bold text-foreground">
                      {dispensa.products_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm">Scanner</span>
                    <span className="ml-auto text-lg font-bold text-foreground">
                      {dispensa.scanners_count}
                    </span>
                  </div>
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