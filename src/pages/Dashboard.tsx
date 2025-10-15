import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Cpu, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    title: "Prodotti Totali",
    value: "142",
    icon: Package,
    trend: "+12% vs mese scorso",
    variant: "default" as const,
  },
  {
    title: "Dispositivi Online",
    value: "8/10",
    icon: Cpu,
    trend: "2 dispositivi offline",
    variant: "warning" as const,
  },
  {
    title: "Sotto Soglia",
    value: "5",
    icon: AlertTriangle,
    trend: "Richiede attenzione",
    variant: "destructive" as const,
  },
  {
    title: "Movimenti Oggi",
    value: "23",
    icon: TrendingUp,
    trend: "+8 vs ieri",
    variant: "success" as const,
  },
];

const recentEvents = [
  {
    time: "10:34",
    type: "remove",
    product: "Pasta Barilla 500g",
    location: "Dispensa A",
    quantity: "-2",
  },
  {
    time: "10:12",
    type: "add",
    product: "Olio EVO 1L",
    location: "Dispensa B",
    quantity: "+1",
  },
  {
    time: "09:45",
    type: "threshold",
    product: "Pomodori pelati",
    location: "Dispensa A",
    quantity: "2 rimanenti",
  },
  {
    time: "09:30",
    type: "add",
    product: "Caffè Lavazza",
    location: "Dispensa A",
    quantity: "+3",
  },
  {
    time: "09:15",
    type: "remove",
    product: "Zucchero 1kg",
    location: "Dispensa B",
    quantity: "-1",
  },
];

const Dashboard = () => {
  const getEventColor = (type: string) => {
    switch (type) {
      case "add":
        return "bg-success/10 text-success";
      case "remove":
        return "bg-muted";
      case "threshold":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica delle scorte e attività recenti
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <Badge variant={stat.variant} className="text-xs">
                {stat.trend}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline Events */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Eventi Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvents.map((event, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-3 rounded-lg ${getEventColor(
                  event.type
                )} animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
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
                  variant={
                    event.type === "add"
                      ? "success"
                      : event.type === "threshold"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {event.quantity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
