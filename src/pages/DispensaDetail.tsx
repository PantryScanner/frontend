import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Warehouse,
  Cpu,
  Package,
  Loader2,
  Search,
  Wifi,
  WifiOff,
  Edit,
  Trash2,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface Dispensa {
  id: string;
  name: string;
  location: string | null;
  status: string | null;
  products_count: number | null;
  created_at: string;
}

interface Scanner {
  id: string;
  name: string;
  serial_number: string;
  status: string | null;
  qr_code: string;
  last_seen_at: string | null;
}

interface ProductInDispensa {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  threshold: number;
  last_scanned_at: string | null;
}

const DispensaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dispensa, setDispensa] = useState<Dispensa | null>(null);
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [products, setProducts] = useState<ProductInDispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  useEffect(() => {
    fetchDispensaData();
  }, [id]);

  const fetchDispensaData = async () => {
    if (!id) return;

    try {
      // Fetch dispensa details
      const { data: dispensaData, error: dispensaError } = await supabase
        .from("dispense")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (dispensaError) throw dispensaError;
      if (!dispensaData) {
        toast.error("Dispensa non trovata");
        navigate("/dispense");
        return;
      }

      setDispensa(dispensaData);

      // Fetch assigned scanners
      const { data: scannersData, error: scannersError } = await supabase
        .from("scanners")
        .select("*")
        .eq("dispensa_id", id);

      if (!scannersError) {
        setScanners(scannersData || []);
      }

      // Fetch products in this dispensa
      const { data: productsData, error: productsError } = await supabase
        .from("dispense_products")
        .select(`
          id,
          product_id,
          quantity,
          threshold,
          last_scanned_at,
          products:product_id (name)
        `)
        .eq("dispensa_id", id);

      if (!productsError && productsData) {
        setProducts(
          productsData.map((p: any) => ({
            id: p.id,
            product_id: p.product_id,
            product_name: p.products?.name || "Prodotto sconosciuto",
            quantity: p.quantity,
            threshold: p.threshold,
            last_scanned_at: p.last_scanned_at,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching dispensa:", error);
      toast.error("Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDispensa = async () => {
    if (!dispensa || !confirm("Sei sicuro di voler eliminare questa dispensa?")) return;

    try {
      const { error } = await supabase.from("dispense").delete().eq("id", dispensa.id);
      if (error) throw error;
      toast.success("Dispensa eliminata");
      navigate("/dispense");
    } catch (error) {
      console.error("Error deleting dispensa:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const getStatusBadge = (quantity: number, threshold: number) => {
    if (quantity === 0) return <Badge variant="destructive">Esaurito</Badge>;
    if (quantity <= threshold) return <Badge variant="warning">Sotto soglia</Badge>;
    return <Badge variant="success">Disponibile</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dispensa) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dispense")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Warehouse className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{dispensa.name}</h1>
              <p className="text-muted-foreground">
                {dispensa.location || "Nessuna posizione"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/dispense/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="destructive" onClick={handleDeleteDispensa}>
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prodotti</p>
                <p className="text-3xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scanner assegnati</p>
                <p className="text-3xl font-bold">{scanners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sotto soglia</p>
                <p className="text-3xl font-bold">
                  {products.filter((p) => p.quantity <= p.threshold && p.quantity > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Scanner Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessuno scanner assegnato a questa dispensa</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate("/dispositivi")}
              >
                Vai ai dispositivi
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanners.map((scanner) => (
                <div
                  key={scanner.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className={`h-5 w-5 ${scanner.status === "online" ? "text-success" : "text-muted-foreground"}`} />
                      <span className="font-medium">{scanner.name}</span>
                    </div>
                    <Badge variant={scanner.status === "online" ? "success" : "secondary"}>
                      {scanner.status === "online" ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Online</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                      )}
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground block mb-3">
                    {scanner.serial_number}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedScanner(scanner);
                      setIsQrDialogOpen(true);
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Mostra QR
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Prodotti in Dispensa
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca prodotto..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun prodotto in questa dispensa</p>
              <p className="text-sm">Usa uno scanner per aggiungere prodotti</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prodotto</TableHead>
                    <TableHead className="text-center">Quantità</TableHead>
                    <TableHead className="text-center">Soglia</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Ultimo scan</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell className="text-center font-bold">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.threshold}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(product.quantity, product.threshold)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(product.last_scanned_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/prodotti/${product.product_id}`)}
                        >
                          Dettagli
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Code Dispositivo
            </DialogTitle>
          </DialogHeader>
          {selectedScanner && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="p-4 bg-background rounded-xl border shadow-lg">
                <QRCodeSVG
                  value={selectedScanner.qr_code}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="transparent"
                  fgColor="hsl(var(--foreground))"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">{selectedScanner.name}</p>
                <code className="text-sm font-mono text-muted-foreground">
                  {selectedScanner.serial_number}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispensaDetail;
