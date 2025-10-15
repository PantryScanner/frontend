import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Package } from "lucide-react";

const dispense = [
  {
    id: 1,
    name: "Dispensa A",
    location: "Cucina principale",
    products: 45,
    threshold: 3,
    lastSync: "2 min fa",
    status: "online",
  },
  {
    id: 2,
    name: "Dispensa B",
    location: "Ripostiglio",
    products: 32,
    threshold: 1,
    lastSync: "5 min fa",
    status: "online",
  },
  {
    id: 3,
    name: "Dispensa C",
    location: "Cantina",
    products: 28,
    threshold: 0,
    lastSync: "15 min fa",
    status: "warning",
  },
  {
    id: 4,
    name: "Dispensa D",
    location: "Garage",
    products: 19,
    threshold: 2,
    lastSync: "Non disponibile",
    status: "offline",
  },
];

const Dispense = () => {
  const getStatusColor = (status: string) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dispense</h1>
        <p className="text-muted-foreground">
          Visualizza tutte le location di stoccaggio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dispense.map((dispensa) => (
          <Card
            key={dispensa.id}
            className="hover:shadow-glow transition-all cursor-pointer group"
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
                      {dispensa.location}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(dispensa.status)}>
                  {dispensa.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Prodotti</span>
                </div>
                <span className="text-2xl font-bold">{dispensa.products}</span>
              </div>

              {dispensa.threshold > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm font-medium text-warning">
                    {dispensa.threshold} prodotto{dispensa.threshold > 1 ? "i" : ""} sotto soglia
                  </p>
                </div>
              )}

              <div className="pt-3 border-t text-sm text-muted-foreground">
                Ultimo sync: {dispensa.lastSync}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dispense;
