import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Package, Barcode, Tag, Edit, Save, X, Loader2, Warehouse, TrendingUp, TrendingDown, Clock, Trash2, Leaf, Apple, AlertTriangle, Globe, Building, Plus, Minus, Box, Recycle, Award, MapPin, Store, Factory, Flame, Droplets } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { toast } from "sonner";
import { useNotificationContext } from "@/contexts/NotificationContext";

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
  carbon_footprint: any;
  created_at: string;
  updated_at: string;
}

interface ProductLocation {
  id: string;
  dispensa_id: string;
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

interface Dispensa {
  id: string;
  name: string;
}

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  "italy": "🇮🇹", "italia": "🇮🇹", "it": "🇮🇹",
  "france": "🇫🇷", "francia": "🇫🇷", "fr": "🇫🇷",
  "germany": "🇩🇪", "germania": "🇩🇪", "de": "🇩🇪",
  "spain": "🇪🇸", "spagna": "🇪🇸", "es": "🇪🇸",
  "united kingdom": "🇬🇧", "uk": "🇬🇧", "gb": "🇬🇧",
  "united states": "🇺🇸", "usa": "🇺🇸", "us": "🇺🇸",
  "china": "🇨🇳", "cina": "🇨🇳", "cn": "🇨🇳",
  "japan": "🇯🇵", "giappone": "🇯🇵", "jp": "🇯🇵",
  "switzerland": "🇨🇭", "svizzera": "🇨🇭", "ch": "🇨🇭",
  "netherlands": "🇳🇱", "olanda": "🇳🇱", "nl": "🇳🇱",
  "belgium": "🇧🇪", "belgio": "🇧🇪", "be": "🇧🇪",
  "austria": "🇦🇹", "at": "🇦🇹",
  "poland": "🇵🇱", "polonia": "🇵🇱", "pl": "🇵🇱",
  "portugal": "🇵🇹", "pt": "🇵🇹",
  "greece": "🇬🇷", "grecia": "🇬🇷", "gr": "🇬🇷",
  "brazil": "🇧🇷", "brasile": "🇧🇷", "br": "🇧🇷",
  "argentina": "🇦🇷", "ar": "🇦🇷",
  "mexico": "🇲🇽", "messico": "🇲🇽", "mx": "🇲🇽",
  "canada": "🇨🇦", "ca": "🇨🇦",
  "australia": "🇦🇺", "au": "🇦🇺",
  "india": "🇮🇳", "in": "🇮🇳",
  "turkey": "🇹🇷", "turchia": "🇹🇷", "tr": "🇹🇷",
  "russia": "🇷🇺", "ru": "🇷🇺",
  "south korea": "🇰🇷", "corea": "🇰🇷", "kr": "🇰🇷",
  "thailand": "🇹🇭", "tailandia": "🇹🇭", "th": "🇹🇭",
  "vietnam": "🇻🇳", "vn": "🇻🇳",
  "indonesia": "🇮🇩", "id": "🇮🇩",
  "european union": "🇪🇺", "eu": "🇪🇺", "ue": "🇪🇺",
};

const getFlag = (origin: string): string | null => {
  const lower = origin.toLowerCase();
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (lower.includes(key)) return flag;
  }
  return null;
};

// Brand logos (simplified - in production you'd use a proper API)
const brandLogos: Record<string, string> = {
  "barilla": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Barilla_pasta_logo.svg/200px-Barilla_pasta_logo.svg.png",
  "mulino bianco": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Mulino_Bianco_logo.svg/200px-Mulino_Bianco_logo.svg.png",
  "ferrero": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Ferrero_logo.svg/200px-Ferrero_logo.svg.png",
  "nutella": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Nutella_logo.svg/200px-Nutella_logo.svg.png",
  "kinder": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Kinder_logo.svg/200px-Kinder_logo.svg.png",
  "coca-cola": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/200px-Coca-Cola_logo.svg.png",
  "pepsi": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Pepsi_logo_2014.svg/200px-Pepsi_logo_2014.svg.png",
  "nestle": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nestl%C3%A9_logo.svg/200px-Nestl%C3%A9_logo.svg.png",
  "lavazza": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Lavazza_logo.svg/200px-Lavazza_logo.svg.png",
};

const getBrandLogo = (brand: string): string | null => {
  const lower = brand.toLowerCase();
  for (const [key, logo] of Object.entries(brandLogos)) {
    if (lower.includes(key)) return logo;
  }
  return null;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addLocalNotification } = useNotificationContext();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedDispensaId, setSelectedDispensaId] = useState<string>("");
  const [assignQuantity, setAssignQuantity] = useState(1);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    if (!id) return;
    try {
      const [productRes, dispenseRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).maybeSingle(),
        supabase.from("dispense").select("id, name"),
      ]);
      
      if (productRes.error) throw productRes.error;
      if (!productRes.data) { toast.error("Prodotto non trovato"); navigate("/inventario"); return; }
      setProduct(productRes.data);
      setEditedProduct(productRes.data);
      setDispense(dispenseRes.data || []);

      const { data: catData } = await supabase.from("product_categories").select("category_name").eq("product_id", id);
      setCategories(catData?.map((c) => c.category_name) || []);

      const { data: locData } = await supabase.from("dispense_products").select("id, dispensa_id, quantity, threshold, last_scanned_at, dispense:dispensa_id(name)").eq("product_id", id);
      setLocations((locData || []).map((loc: any) => ({ 
        id: loc.id,
        dispensa_id: loc.dispensa_id,
        dispensa_name: loc.dispense?.name || "Sconosciuta", 
        quantity: loc.quantity, 
        threshold: loc.threshold, 
        last_scanned_at: loc.last_scanned_at 
      })));

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
      addLocalNotification("Prodotto eliminato", `${product.name || "Prodotto"} rimosso`, "info");
      navigate("/inventario");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleAssignToDispensa = async () => {
    if (!product || !selectedDispensaId || selectedDispensaId === "none") {
      toast.error("Seleziona una dispensa");
      return;
    }

    // Check if already assigned
    const existing = locations.find((l) => l.dispensa_id === selectedDispensaId);
    if (existing) {
      toast.error("Prodotto già assegnato a questa dispensa");
      return;
    }

    try {
      const { error } = await supabase.from("dispense_products").insert({
        dispensa_id: selectedDispensaId,
        product_id: product.id,
        quantity: assignQuantity,
      });
      if (error) throw error;
      toast.success("Prodotto assegnato alla dispensa");
      setShowAssignDialog(false);
      setSelectedDispensaId("");
      setAssignQuantity(1);
      fetchProductData();
    } catch (error) {
      console.error("Error assigning product:", error);
      toast.error("Errore nell'assegnazione");
    }
  };

  const handleRemoveFromDispensa = async (locationId: string) => {
    try {
      const { error } = await supabase.from("dispense_products").delete().eq("id", locationId);
      if (error) throw error;
      toast.success("Prodotto rimosso dalla dispensa");
      fetchProductData();
    } catch (error) {
      console.error("Error removing product:", error);
      toast.error("Errore nella rimozione");
    }
  };

  const handleUpdateQuantity = async (locationId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    try {
      const { error } = await supabase.from("dispense_products").update({ quantity: newQuantity }).eq("id", locationId);
      if (error) throw error;
      setLocations(locations.map((l) => l.id === locationId ? { ...l, quantity: newQuantity } : l));
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const getTotalQuantity = () => locations.reduce((sum, loc) => sum + loc.quantity, 0);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getNutriscoreColor = (grade: string | null) => {
    const colors: Record<string, string> = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };
    return colors[grade?.toLowerCase() || ""] || "bg-muted";
  };

  const getEcoscoreColor = (grade: string | null) => {
    const colors: Record<string, string> = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };
    return colors[grade?.toLowerCase() || ""] || "bg-muted";
  };

  const getNovaColor = (group: number | null) => {
    const colors: Record<number, string> = { 1: "bg-green-500", 2: "bg-lime-500", 3: "bg-yellow-500", 4: "bg-red-500" };
    return colors[group || 0] || "bg-muted";
  };

  const formatAllergens = (allergens: string) => {
    return allergens.replace(/en:/g, "").replace(/,/g, ", ").trim();
  };

  const availableDispense = dispense.filter((d) => !locations.some((l) => l.dispensa_id === d.id));

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return null;

  const originFlag = product.origin ? getFlag(product.origin) : null;
  const brandLogo = product.brand ? getBrandLogo(product.brand) : null;

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

      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assegna a Dispensa</AlertDialogTitle>
            <AlertDialogDescription>Seleziona una dispensa e la quantità iniziale.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dispensa</Label>
              <Select value={selectedDispensaId} onValueChange={setSelectedDispensaId}>
                <SelectTrigger><SelectValue placeholder="Seleziona dispensa" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableDispense.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantità</Label>
              <Input type="number" min="1" value={assignQuantity} onChange={(e) => setAssignQuantity(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignToDispensa}>Assegna</AlertDialogAction>
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
              <div className="relative flex justify-center mb-4">
                <img src={product.image_url} alt={product.name || "Prodotto"} className="max-h-48 rounded-lg object-contain" />
                {originFlag && (
                  <div className="absolute bottom-2 right-2 text-3xl bg-background/80 rounded-full p-1 shadow-lg" title={product.origin || ""}>{originFlag}</div>
                )}
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
                <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm text-muted-foreground">Categoria principale</p><p>{product.category || "—"}</p></div></div>
                {product.brand && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <div className="flex items-center gap-2">
                        {brandLogo && <img src={brandLogo} alt={product.brand} className="h-6 object-contain" />}
                        <p>{product.brand}</p>
                      </div>
                    </div>
                  </div>
                )}
                {product.origin && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Origine</p>
                      <div className="flex items-center gap-2">
                        {originFlag && <span className="text-xl">{originFlag}</span>}
                        <p>{product.origin}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {categories.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Tutte le Categorie</p>
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
                  <div className="flex items-center justify-between"><span className="text-sm">Eco-Score</span><Badge className={`${getEcoscoreColor(product.ecoscore)} text-white font-bold`}>{product.ecoscore.toUpperCase()}</Badge></div>
                )}
                {product.nova_group && (
                  <div className="flex items-center justify-between"><span className="text-sm">NOVA Group</span><Badge className={`${getNovaColor(product.nova_group)} text-white font-bold`}>{product.nova_group}</Badge></div>
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" />Valori Nutrizionali (per 100g)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.nutritional_values.energyKcal && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Energia</p><p className="font-bold">{product.nutritional_values.energyKcal} kcal</p></div>}
              {product.nutritional_values.fat !== null && product.nutritional_values.fat !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Grassi</p><p className="font-bold">{product.nutritional_values.fat}g</p></div>}
              {product.nutritional_values.saturatedFat !== null && product.nutritional_values.saturatedFat !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Grassi Saturi</p><p className="font-bold">{product.nutritional_values.saturatedFat}g</p></div>}
              {product.nutritional_values.carbohydrates !== null && product.nutritional_values.carbohydrates !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Carboidrati</p><p className="font-bold">{product.nutritional_values.carbohydrates}g</p></div>}
              {product.nutritional_values.sugars !== null && product.nutritional_values.sugars !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Zuccheri</p><p className="font-bold">{product.nutritional_values.sugars}g</p></div>}
              {product.nutritional_values.proteins !== null && product.nutritional_values.proteins !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Proteine</p><p className="font-bold">{product.nutritional_values.proteins}g</p></div>}
              {product.nutritional_values.fiber !== null && product.nutritional_values.fiber !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Fibre</p><p className="font-bold">{product.nutritional_values.fiber}g</p></div>}
              {product.nutritional_values.salt !== null && product.nutritional_values.salt !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Sale</p><p className="font-bold">{product.nutritional_values.salt}g</p></div>}
              {product.nutritional_values.sodium !== null && product.nutritional_values.sodium !== undefined && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Sodio</p><p className="font-bold">{product.nutritional_values.sodium}mg</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {product.carbon_footprint && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Leaf className="h-5 w-5 text-green-500" />Impronta Carbonica</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.carbon_footprint.total && <div className="p-3 rounded-lg bg-green-500/10"><p className="text-xs text-muted-foreground">Totale CO₂</p><p className="font-bold text-green-600">{product.carbon_footprint.total.toFixed(2)} kg</p></div>}
              {product.carbon_footprint.agriculture && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Agricoltura</p><p className="font-bold">{product.carbon_footprint.agriculture.toFixed(2)} kg</p></div>}
              {product.carbon_footprint.processing && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Lavorazione</p><p className="font-bold">{product.carbon_footprint.processing.toFixed(2)} kg</p></div>}
              {product.carbon_footprint.transportation && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Trasporto</p><p className="font-bold">{product.carbon_footprint.transportation.toFixed(2)} kg</p></div>}
              {product.carbon_footprint.packaging && <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Imballaggio</p><p className="font-bold">{product.carbon_footprint.packaging.toFixed(2)} kg</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {product.packaging && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Box className="h-5 w-5 text-primary" />Imballaggio</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{product.packaging}</p></CardContent>
        </Card>
      )}

      {product.labels && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Etichette e Certificazioni</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {product.labels.split(",").map((label) => <Badge key={label} variant="outline">{label.trim()}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5 text-primary" />Posizioni</CardTitle>
          {availableDispense.length > 0 && (
            <Button size="sm" onClick={() => setShowAssignDialog(true)}><Plus className="h-4 w-4 mr-1" />Assegna</Button>
          )}
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Prodotto non assegnato a nessuna dispensa</p>
              {availableDispense.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={() => setShowAssignDialog(true)}>Assegna a una dispensa</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div key={loc.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{loc.dispensa_name}</span>
                    <Button variant="ghost-destructive" size="sm" onClick={() => handleRemoveFromDispensa(loc.id)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(loc.id, loc.quantity - 1)} disabled={loc.quantity === 0}><Minus className="h-4 w-4" /></Button>
                    <Badge variant={loc.quantity === 0 ? "destructive" : loc.quantity <= loc.threshold ? "warning" : "success"} className="min-w-[60px] justify-center">{loc.quantity} pz</Badge>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(loc.id, loc.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="text-sm text-muted-foreground">Soglia minima: {loc.threshold}</div>
                  {loc.last_scanned_at && <div className="text-xs text-muted-foreground mt-1">Ultimo scan: {formatDate(loc.last_scanned_at)}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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