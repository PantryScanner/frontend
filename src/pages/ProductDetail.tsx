import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Package, Barcode, Tag, Edit, Save, X, Loader2, Warehouse, TrendingUp, TrendingDown, Clock, Trash2, Leaf, Apple, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

interface Product {
  id: string;
  name: string | null;
  barcode: string | null;
  category: string | null;
  image_url: string | null;
  brand: string | null;
  ingredients: string | null;
  nutriscore: string | null;
  ecoscore: string | null;
  nova_group: number | null;
  allergens: string | null;
  nutritional_values: any;
  packaging: string | null;
  labels: string | null;
  origin: string | null;
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
  const { addNotification } = useNotifications();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    if (!id) return;
    try {
      const { data: productData, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!productData) { toast.error("Prodotto non trovato"); navigate("/inventario"); return; }
      setProduct(productData);
      setEditedProduct(productData);

      const { data: catData } = await supabase.from("product_categories").select("category_name").eq("product_id", id);
      setCategories(catData?.map((c) => c.category_name) || []);

      const { data: locData } = await supabase.from("dispense_products").select("quantity, threshold, last_scanned_at, dispense:dispensa_id(name)").eq("product_id", id);
      setLocations((locData || []).map((loc: any) => ({ dispensa_name: loc.dispense?.name || "Sconosciuta", quantity: loc.quantity, threshold: loc.threshold, last_scanned_at: loc.last_scanned_at })));

      const { data: logsData } = await supabase.from("scan_logs").select("id, action, quantity, created_at, dispense:dispensa_id(name)").eq("product_id", id).order("created_at", { ascending: false }).limit(10);
      setScanLogs((logsData || []).map((log: any) => ({ id: log.id, action: log.action, quantity: log.quantity, created_at: log.created_at, dispensa_name: log.dispense?.name || "Sconosciuta" })));
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
      const { error } = await supabase.from("products").update({ name: editedProduct.name || null, category: editedProduct.category, barcode: editedProduct.barcode }).eq("id", product.id);
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

  const handleDelete = async () => {
    if (!product) return;
    try {
      await supabase.from("dispense_products").delete().eq("product_id", product.id);
      await supabase.from("product_categories").delete().eq("product_id", product.id);
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Prodotto eliminato");
      addNotification("Prodotto eliminato", `${product.name || "Prodotto"} rimosso`, "info");
      navigate("/inventario");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const getTotalQuantity = () => locations.reduce((sum, loc) => sum + loc.quantity, 0);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getNutriscoreColor = (grade: string | null) => {
    const colors: Record<string, string> = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };
    return colors[grade?.toLowerCase() || ""] || "bg-muted";
  };

  const formatAllergens = (allergens: string) => {
    return allergens.replace(/en:/g, "").trim();
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return null;

  return (
    <div className="space-y-6">
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo prodotto?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{product.name || <span className="text-muted-foreground italic">Senza nome</span>}</h1>
          <code className="text-sm text-muted-foreground">{product.barcode}</code>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Modifica</Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}><Trash2 className="h-4 w-4 mr-2" />Elimina</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-2" />Annulla</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Salva</>}</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Dettagli Prodotto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {product.image_url && (
              <div className="flex justify-center mb-4">
                <img src={product.image_url} alt={product.name || "Prodotto"} className="max-h-48 rounded-lg object-contain" />
              </div>
            )}
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={editedProduct.name || ""} onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Categoria</Label><Input value={editedProduct.category || ""} onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })} /></div>
                <div className="space-y-2 col-span-2"><Label>Codice a barre</Label><Input value={editedProduct.barcode || ""} onChange={(e) => setEditedProduct({ ...editedProduct, barcode: e.target.value.replace(/\D/g, '') })} inputMode="numeric" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3"><Barcode className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm text-muted-foreground">Codice a barre</p><code className="font-mono">{product.barcode || "—"}</code></div></div>
                <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm text-muted-foreground">Categoria</p><p>{product.category || "—"}</p></div></div>
                {product.brand && <div className="flex items-start gap-3"><Package className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm text-muted-foreground">Marca</p><p>{product.brand}</p></div></div>}
                {product.origin && <div className="flex items-start gap-3"><Leaf className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm text-muted-foreground">Origine</p><p>{product.origin}</p></div></div>}
              </div>
            )}
            {categories.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Categorie</p>
                <div className="flex flex-wrap gap-2">{categories.map((cat) => <Badge key={cat} variant="secondary">{cat}</Badge>)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Quantità Totale</CardTitle></CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-primary mb-4">{getTotalQuantity()}<span className="text-lg text-muted-foreground ml-2">pz</span></div>
              <p className="text-sm text-muted-foreground">Distribuito in {locations.length} dispens{locations.length === 1 ? "a" : "e"}</p>
            </CardContent>
          </Card>

          {(product.nutriscore || product.ecoscore || product.nova_group) && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Apple className="h-5 w-5" />Valutazioni</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {product.nutriscore && (
                  <div className="flex items-center justify-between"><span className="text-sm">Nutri-Score</span><Badge className={`${getNutriscoreColor(product.nutriscore)} text-white font-bold`}>{product.nutriscore.toUpperCase()}</Badge></div>
                )}
                {product.ecoscore && (
                  <div className="flex items-center justify-between"><span className="text-sm">Eco-Score</span><Badge variant="outline">{product.ecoscore.toUpperCase()}</Badge></div>
                )}
                {product.nova_group && (
                  <div className="flex items-center justify-between"><span className="text-sm">NOVA Group</span><Badge variant="secondary">{product.nova_group}</Badge></div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {product.ingredients && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Apple className="h-5 w-5 text-primary" />Ingredienti</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{product.ingredients}</p></CardContent>
        </Card>
      )}

      {product.allergens && (
        <Card className="border-warning/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5" />Allergeni</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{formatAllergens(product.allergens)}</p></CardContent>
        </Card>
      )}

      {product.nutritional_values && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Apple className="h-5 w-5 text-primary" />Valori Nutrizionali (per 100g)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.nutritional_values.energyKcal && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Energia</p><p className="font-bold">{product.nutritional_values.energyKcal} kcal</p></div>}
              {product.nutritional_values.fat !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Grassi</p><p className="font-bold">{product.nutritional_values.fat}g</p></div>}
              {product.nutritional_values.carbohydrates !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Carboidrati</p><p className="font-bold">{product.nutritional_values.carbohydrates}g</p></div>}
              {product.nutritional_values.proteins !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Proteine</p><p className="font-bold">{product.nutritional_values.proteins}g</p></div>}
              {product.nutritional_values.sugars !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Zuccheri</p><p className="font-bold">{product.nutritional_values.sugars}g</p></div>}
              {product.nutritional_values.salt !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Sale</p><p className="font-bold">{product.nutritional_values.salt}g</p></div>}
              {product.nutritional_values.fiber !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Fibre</p><p className="font-bold">{product.nutritional_values.fiber}g</p></div>}
              {product.nutritional_values.saturatedFat !== null && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Grassi Saturi</p><p className="font-bold">{product.nutritional_values.saturatedFat}g</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {locations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5 text-primary" />Posizioni</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2"><span className="font-medium">{loc.dispensa_name}</span><Badge variant={loc.quantity === 0 ? "destructive" : loc.quantity <= loc.threshold ? "warning" : "success"}>{loc.quantity} pz</Badge></div>
                  <div className="text-sm text-muted-foreground">Soglia minima: {loc.threshold}</div>
                  {loc.last_scanned_at && <div className="text-xs text-muted-foreground mt-1">Ultimo scan: {formatDate(loc.last_scanned_at)}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scanLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Cronologia Scansioni</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanLogs.map((log) => (
                <div key={log.id} className={`flex items-center gap-4 p-3 rounded-lg ${log.action === "add" ? "bg-success/10" : "bg-muted"}`}>
                  {log.action === "add" ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-muted-foreground" />}
                  <div className="flex-1"><p className="font-medium">{log.action === "add" ? "Aggiunto" : "Rimosso"} {log.quantity} pz</p><p className="text-sm text-muted-foreground">{log.dispensa_name}</p></div>
                  <span className="text-sm text-muted-foreground">{formatDate(log.created_at)}</span>
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
