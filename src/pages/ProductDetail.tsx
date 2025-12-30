import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Package,
  Barcode,
  Tag,
  Edit,
  Save,
  X,
  Loader2,
  Warehouse,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string | null;
  barcode: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductLocation {
  dispensa_name: string;
  quantity: number;
  threshold: number;
  last_scanned_at: string | null;
}

interface ScanLog {
  id: string;
  action: string;
  quantity: number;
  created_at: string;
  dispensa_name: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    if (!id) return;

    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) {
        toast.error("Prodotto non trovato");
        navigate("/inventario");
        return;
      }

      setProduct(productData);
      setEditedProduct(productData);

      const { data: locationsData, error: locationsError } = await supabase
        .from("dispense_products")
        .select(`
          quantity,
          threshold,
          last_scanned_at,
          dispense:dispensa_id (name)
        `)
        .eq("product_id", id);

      if (!locationsError && locationsData) {
        setLocations(
          locationsData.map((loc: any) => ({
            dispensa_name: loc.dispense?.name || "Sconosciuta",
            quantity: loc.quantity,
            threshold: loc.threshold,
            last_scanned_at: loc.last_scanned_at,
          }))
        );
      }

      const { data: logsData, error: logsError } = await supabase
        .from("scan_logs")
        .select(`
          id,
          action,
          quantity,
          created_at,
          dispense:dispensa_id (name)
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!logsError && logsData) {
        setScanLogs(
          logsData.map((log: any) => ({
            id: log.id,
            action: log.action,
            quantity: log.quantity,
            created_at: log.created_at,
            dispensa_name: log.dispense?.name || "Sconosciuta",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Errore nel caricamento del prodotto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: editedProduct.name || null,
          category: editedProduct.category,
          barcode: editedProduct.barcode,
        })
        .eq("id", product.id);

      if (error) throw error;

      setProduct({ ...product, ...editedProduct } as Product);
      setIsEditing(false);
      toast.success("Prodotto aggiornato");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalQuantity = () => {
    return locations.reduce((sum, loc) => sum + loc.quantity, 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {product.name || <span className="text-muted-foreground italic">Senza nome</span>}
          </h1>
          <code className="text-sm text-muted-foreground">{product.barcode}</code>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Dettagli Prodotto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome (opzionale)</Label>
                    <Input
                      value={editedProduct.name || ""}
                      onChange={(e) =>
                        setEditedProduct({ ...editedProduct, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input
                      value={editedProduct.category || ""}
                      onChange={(e) =>
                        setEditedProduct({ ...editedProduct, category: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Codice a barre</Label>
                    <Input
                      value={editedProduct.barcode || ""}
                      onChange={(e) =>
                        setEditedProduct({ ...editedProduct, barcode: e.target.value.replace(/\D/g, '') })
                      }
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Barcode className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Codice a barre</p>
                    <code className="font-mono">{product.barcode || "—"}</code>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Categoria</p>
                    <p>{product.category || "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quantity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quantità Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-primary mb-4">
              {getTotalQuantity()}
              <span className="text-lg text-muted-foreground ml-2">pz</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Distribuito in {locations.length} dispens{locations.length === 1 ? "a" : "e"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Locations */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Posizioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{loc.dispensa_name}</span>
                    <Badge
                      variant={
                        loc.quantity === 0
                          ? "destructive"
                          : loc.quantity <= loc.threshold
                          ? "warning"
                          : "success"
                      }
                    >
                      {loc.quantity} pz
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Soglia minima: {loc.threshold}
                  </div>
                  {loc.last_scanned_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Ultimo scan: {formatDate(loc.last_scanned_at)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Cronologia Scansioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    log.action === "add"
                      ? "bg-success/10"
                      : "bg-muted"
                  }`}
                >
                  {log.action === "add" ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {log.action === "add" ? "Aggiunto" : "Rimosso"} {log.quantity} pz
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {log.dispensa_name}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductDetail;