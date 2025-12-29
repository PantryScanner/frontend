import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Cpu, AlertTriangle, TrendingUp, Warehouse, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalProducts: number;
  scannersOnline: number;
  scannersTotal: number;
  belowThreshold: number;
  totalDispense: number;
}

interface RecentEvent {
  id: string;
  time: string;
  type: "add" | "remove";
  product: string;
  location: string;
  quantity: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    scannersOnline: 0,
    scannersTotal: 0,
    belowThreshold: 0,
    totalDispense: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Helper to check if scanner is online (last seen < 5 minutes ago)
  const isScannerOnline = (lastSeenAt: string | null): boolean => {
    if (!lastSeenAt) return false;
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = diffMs / 60000;
    return diffMins < 5;
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch dispense count
      const { count: dispenseCount } = await supabase
        .from("dispense")
        .select("*", { count: "exact", head: true });

      // Fetch scanners with last_seen_at to calculate status dynamically
      const { data: scanners } = await supabase.from("scanners").select("last_seen_at");

      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch below threshold products
      const { data: dispenseProducts } = await supabase
        .from("dispense_products")
        .select("quantity, threshold");

      const belowThreshold = dispenseProducts?.filter(
        (p) => p.quantity <= p.threshold && p.quantity > 0
      ).length || 0;

      // Fetch recent scan logs
      const { data: logs } = await supabase
        .from("scan_logs")
        .select(`
          id,
          action,
          quantity,
          created_at,
          dispense:dispensa_id (name),
          products:product_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(8);

      // Calculate online scanners dynamically
      const onlineScanners = scanners?.filter((s) => isScannerOnline(s.last_seen_at)).length || 0;

      setStats({
        totalProducts: productsCount || 0,
        scannersOnline: onlineScanners,
        scannersTotal: scanners?.length || 0,
        belowThreshold,
        totalDispense: dispenseCount || 0,
      });

      if (logs) {
        setRecentEvents(
          logs.map((log: any) => ({
            id: log.id,
            time: new Date(log.created_at).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            type: log.action as "add" | "remove",
            product: log.products?.name || "Prodotto sconosciuto",
            location: log.dispense?.name || "Dispensa sconosciuta",
            quantity: log.quantity,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "add":
        return "bg-success/10 text-success";
      case "remove":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsCards = [
    {
      title: "Dispense",
      value: stats.totalDispense.toString(),
      icon: Warehouse,
      description: "Location di stoccaggio",
      variant: "default" as const,
      link: "/dispense",
    },
    {
      title: "Scanner",
      value: `${stats.scannersOnline}/${stats.scannersTotal}`,
      icon: Cpu,
      description: stats.scannersOnline === stats.scannersTotal && stats.scannersTotal > 0
        ? "Tutti online"
        : `${stats.scannersTotal - stats.scannersOnline} offline`,
      variant: stats.scannersOnline === stats.scannersTotal ? ("success" as const) : ("warning" as const),
      link: "/dispositivi",
    },
    {
      title: "Prodotti",
      value: stats.totalProducts.toString(),
      icon: Package,
      description: "Prodotti tracciati",
      variant: "default" as const,
      link: "/inventario",
    },
    {
      title: "Sotto Soglia",
      value: stats.belowThreshold.toString(),
      icon: AlertTriangle,
      description: stats.belowThreshold > 0 ? "Richiede attenzione" : "Tutto a posto",
      variant: stats.belowThreshold > 0 ? ("destructive" as const) : ("success" as const),
      link: "/inventario",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica del sistema di gestione dispense
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card
            key={stat.title}
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate(stat.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <Badge variant={stat.variant} className="text-xs">
                {stat.description}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 group"
              onClick={() => navigate("/dispense")}
            >
              <Warehouse className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              <span>Gestisci Dispense</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 group"
              onClick={() => navigate("/dispositivi")}
            >
              <Cpu className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              <span>Configura Scanner</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 group"
              onClick={() => navigate("/inventario")}
            >
              <Package className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              <span>Vedi Inventario</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 group"
              onClick={() => navigate("/grafici")}
            >
              <TrendingUp className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              <span>Statistiche</span>
            </Button>
          </CardContent>
        </Card>

        {/* Scanner Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stato Scanner</span>
              <Button variant="link" size="sm" onClick={() => navigate("/dispositivi")}>
                Vedi tutti
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.scannersTotal === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nessun scanner configurato</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate("/dispositivi")}
                >
                  Aggiungi il primo scanner
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-success" />
                    <span className="font-medium">Online</span>
                  </div>
                  <span className="text-2xl font-bold text-success">
                    {stats.scannersOnline}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Offline</span>
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {stats.scannersTotal - stats.scannersOnline}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Events */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna attività recente</p>
              <p className="text-sm">Le scansioni appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${getEventColor(
                    event.type
                  )} animate-fade-in`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="text-sm font-mono text-muted-foreground min-w-[45px]">
                    {event.time}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{event.product}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.location}
                    </div>
                  </div>
                  <Badge
                    variant={event.type === "add" ? "success" : "secondary"}
                  >
                    {event.type === "add" ? "+" : "-"}{event.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;