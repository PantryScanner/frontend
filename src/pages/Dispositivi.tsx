import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, Plus, QrCode, Wifi, WifiOff, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface Scanner {
  id: string;
  serial_number: string;
  name: string;
  dispensa_id: string | null;
  last_seen_at: string | null;
  created_at: string;
}

interface Dispensa {
  id: string;
  name: string;
}

const Dispositivi = () => {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);
  const [newScanner, setNewScanner] = useState({ name: "", dispensa_id: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { addLocalNotification } = useNotificationContext();

  // Helper to check if scanner is online (last seen < 5 minutes ago)
  const isScannerOnline = (lastSeenAt: string | null): boolean => {
    if (!lastSeenAt) return false;
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = diffMs / 60000;
    return diffMins < 5;
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      const [scannersRes, dispenseRes] = await Promise.all([
        supabase.from("scanners").select("*").order("created_at", { ascending: false }),
        supabase.from("dispense").select("id, name"),
      ]);

      if (scannersRes.error) throw scannersRes.error;
      if (dispenseRes.error) throw dispenseRes.error;

      setScanners(scannersRes.data || []);
      setDispense(dispenseRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dispositivi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const generateSerialNumber = () => {
    // Format: SCN-XXXXXXXX-XXXX (8 alphanumeric + 4 alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let part1 = '';
    let part2 = '';
    
    for (let i = 0; i < 8; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 4; i++) {
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `SCN-${part1}-${part2}`;
  };

  const handleAddScanner = async () => {
    if (!user || !newScanner.name) {
      toast.error("Inserisci un nome per il dispositivo");
      return;
    }

    setIsSubmitting(true);
    try {
      const serial_number = generateSerialNumber();

      const { data, error } = await supabase.from("scanners").insert({
        user_id: user.id,
        name: newScanner.name,
        serial_number,
        dispensa_id: newScanner.dispensa_id || null,
      }).select().single();

      if (error) throw error;

      toast.success("Dispositivo aggiunto con successo");
      addLocalNotification("Nuovo scanner creato", `Scanner "${newScanner.name}" è stato configurato`, "success");
      setNewScanner({ name: "", dispensa_id: "" });
      setIsAddDialogOpen(false);
      setSelectedScanner(data);
      setIsQrDialogOpen(true);
      fetchData();
    } catch (error) {
      console.error("Error adding scanner:", error);
      toast.error("Errore nell'aggiunta del dispositivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScanner = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("scanners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Dispositivo eliminato");
      addLocalNotification("Scanner eliminato", `Scanner "${name}" è stato rimosso`, "info");
      fetchData();
    } catch (error) {
      console.error("Error deleting scanner:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleAssignDispensa = async (scannerId: string, dispensaId: string | null) => {
    try {
      const { error } = await supabase
        .from("scanners")
        .update({ dispensa_id: dispensaId === "none" ? null : dispensaId })
        .eq("id", scannerId);

      if (error) throw error;
      toast.success("Dispensa assegnata");
      fetchData();
    } catch (error) {
      console.error("Error assigning dispensa:", error);
      toast.error("Errore nell'assegnazione");
    }
  };

  const getTimeSinceLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Mai connesso";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return "Ora";
    if (diffMins < 60) return `${diffMins} min fa`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    return `${Math.floor(diffHours / 24)}g fa`;
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
          <h1 className="text-3xl font-bold mb-2">Dispositivi Scanner</h1>
          <p className="text-muted-foreground">
            Gestisci i dispositivi di scansione per le tue dispense
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Aggiungi Dispositivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Dispositivo Scanner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome dispositivo</Label>
                <Input
                  id="name"
                  placeholder="es. Scanner Cucina"
                  value={newScanner.name}
                  onChange={(e) => setNewScanner({ ...newScanner, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispensa">Assegna a dispensa (opzionale)</Label>
                <Select
                  value={newScanner.dispensa_id}
                  onValueChange={(value) => setNewScanner({ ...newScanner, dispensa_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona dispensa" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {dispense.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddScanner} disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Crea e Genera QR Code"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Configura Dispositivo
            </DialogTitle>
          </DialogHeader>
          {selectedScanner && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Scansiona questo QR code con il dispositivo <strong>{selectedScanner.name}</strong> per configurarlo
              </p>
              <div className="p-4 bg-background rounded-xl border shadow-lg">
                <QRCodeSVG
                  value={selectedScanner.serial_number}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="transparent"
                  fgColor="hsl(var(--foreground))"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">Seriale</p>
                <code className="text-sm font-mono bg-muted px-3 py-1 rounded">
                  {selectedScanner.serial_number}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {scanners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun dispositivo</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Aggiungi un dispositivo scanner per iniziare a tracciare i prodotti nelle tue dispense
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanners.map((scanner) => {
            const isOnline = isScannerOnline(scanner.last_seen_at);
            return (
              <Card
                key={scanner.id}
                className="hover:shadow-glow transition-all animate-fade-in"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        isOnline ? "bg-success/10" : "bg-muted"
                      }`}>
                        <Cpu className={`h-6 w-6 ${
                          isOnline ? "text-success" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{scanner.name}</CardTitle>
                        <code className="text-xs text-muted-foreground">
                          {scanner.serial_number}
                        </code>
                      </div>
                    </div>
                    <Badge variant={isOnline ? "success" : "secondary"}>
                      {isOnline ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Online</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Dispensa assegnata</Label>
                    <Select
                      value={scanner.dispensa_id || "none"}
                      onValueChange={(value) => handleAssignDispensa(scanner.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="none">Non assegnato</SelectItem>
                        {dispense.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Ultima connessione</span>
                    <span>{getTimeSinceLastSeen(scanner.last_seen_at)}</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedScanner(scanner);
                        setIsQrDialogOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Mostra QR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteScanner(scanner.id, scanner.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dispositivi;