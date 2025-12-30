import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, Plus, Package, Loader2, Eye, Trash2, Columns, Warehouse } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useProductInfo } from "@/hooks/useProductInfo";

interface Product {
  id: string;
  name: string | null;
  barcode: string | null;
  category: string | null;
  created_at: string;
  image_url?: string | null;
}

interface ProductWithDetails extends Product {
  totalQuantity: number;
  dispensaNames: string[];
}

interface Dispensa {
  id: string;
  name: string;
}

type ColumnKey = "name" | "barcode" | "category" | "dispensa" | "quantity" | "date" | "actions";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Prodotto" },
  { key: "barcode", label: "Codice a barre" },
  { key: "category", label: "Categoria" },
  { key: "dispensa", label: "Dispensa" },
  { key: "quantity", label: "Quantità (pz)" },
  { key: "date", label: "Data creazione" },
  { key: "actions", label: "Azioni" },
];

const Inventario = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { fetchProductInfo } = useProductInfo();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(["name", "barcode", "category", "dispensa", "quantity", "actions"]);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "", barcode: "", category: "", quantity: 1, dispensa_id: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [productsRes, dispenseRes, dispenseProductsRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("dispense").select("id, name"),
        supabase.from("dispense_products").select("product_id, quantity, dispensa_id, dispense:dispensa_id(name)"),
      ]);

      if (productsRes.error) throw productsRes.error;
      
      const dispenseProducts = dispenseProductsRes.data || [];
      const productQuantities: Record<string, { total: number; dispenseNames: string[] }> = {};
      
      dispenseProducts.forEach((dp: any) => {
        if (!productQuantities[dp.product_id]) {
          productQuantities[dp.product_id] = { total: 0, dispenseNames: [] };
        }
        productQuantities[dp.product_id].total += dp.quantity;
        if (dp.dispense?.name && !productQuantities[dp.product_id].dispenseNames.includes(dp.dispense.name)) {
          productQuantities[dp.product_id].dispenseNames.push(dp.dispense.name);
        }
      });

      const productsWithDetails: ProductWithDetails[] = (productsRes.data || []).map((p) => ({
        ...p,
        totalQuantity: productQuantities[p.id]?.total || 0,
        dispensaNames: productQuantities[p.id]?.dispenseNames || [],
      }));

      setProducts(productsWithDetails);
      setDispense(dispenseRes.data || []);

      const uniqueCategories = [...new Set(
        (productsRes.data || []).map((p) => p.category).filter((c): c is string => !!c)
      )];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei prodotti");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.barcode.trim() || !/^\d+$/.test(newProduct.barcode.trim()) || newProduct.quantity < 1) {
      toast.error("Compila correttamente tutti i campi obbligatori");
      return;
    }

    setIsSubmitting(true);
    try {
      const productInfo = await fetchProductInfo(newProduct.barcode.trim());
      const productName = newProduct.name.trim() || productInfo?.name || null;
      const productCategory = newProduct.category.trim() || productInfo?.category || null;

      const { data: insertedProduct, error } = await supabase
        .from("products")
        .insert({
          user_id: user.id, name: productName, barcode: newProduct.barcode.trim(),
          category: productCategory, image_url: productInfo?.imageUrl || null,
          brand: productInfo?.brand || null, ingredients: productInfo?.ingredients || null,
          nutriscore: productInfo?.nutriscoreGrade || null, ecoscore: productInfo?.ecoscoreGrade || null,
          nova_group: productInfo?.novaGroup || null, allergens: productInfo?.allergens || null,
          nutritional_values: productInfo?.nutriments || null, packaging: productInfo?.packaging || null,
          labels: productInfo?.labels || null, origin: productInfo?.origin || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert categories
      if (productInfo?.categories && productInfo.categories.length > 0) {
        await supabase.from("product_categories").insert(
          productInfo.categories.map((cat) => ({ product_id: insertedProduct.id, category_name: cat }))
        );
      }

      // Add to dispensa if selected
      if (newProduct.dispensa_id && newProduct.dispensa_id !== "none") {
        await supabase.from("dispense_products").insert({
          dispensa_id: newProduct.dispensa_id, product_id: insertedProduct.id, quantity: newProduct.quantity,
        });
      }

      toast.success("Prodotto aggiunto con successo");
      addNotification("Prodotto aggiunto", `${productName || "Prodotto"} aggiunto all'inventario`, "success");
      setNewProduct({ name: "", barcode: "", category: "", quantity: 1, dispensa_id: "" });
      setIsAddDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Errore nell'aggiunta del prodotto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    try {
      await supabase.from("dispense_products").delete().eq("product_id", deleteProductId);
      await supabase.from("product_categories").delete().eq("product_id", deleteProductId);
      const { error } = await supabase.from("products").delete().eq("id", deleteProductId);
      if (error) throw error;
      toast.success("Prodotto eliminato");
      addNotification("Prodotto eliminato", "Prodotto rimosso dall'inventario", "info");
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeleteProductId(null);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isColumnVisible = (key: ColumnKey) => visibleColumns.includes(key);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo prodotto?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile. Il prodotto verrà rimosso da tutte le dispense.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventario</h1>
          <p className="text-muted-foreground">Gestisci tutti i prodotti tracciati dal sistema</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Aggiungi Prodotto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuovo Prodotto</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Codice a barre *</Label>
                <Input id="barcode" type="text" inputMode="numeric" placeholder="es. 8076800195057" value={newProduct.barcode} onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantità *</Label>
                  <Input id="quantity" type="number" min="1" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispensa">Dispensa</Label>
                  <Select value={newProduct.dispensa_id} onValueChange={(value) => setNewProduct({ ...newProduct, dispensa_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">Nessuna</SelectItem>
                      {dispense.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" placeholder="es. Pasta" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opzionale)</Label>
                <Input id="name" placeholder="es. Pasta Barilla 500g" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <Button onClick={handleAddProduct} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aggiungi Prodotto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Prodotti ({filteredProducts.length})</CardTitle>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cerca prodotto..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tutte</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Columns className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {ALL_COLUMNS.map((col) => (
                    <DropdownMenuCheckboxItem key={col.key} checked={isColumnVisible(col.key)} onCheckedChange={(checked) => {
                      setVisibleColumns(checked ? [...visibleColumns, col.key] : visibleColumns.filter((c) => c !== col.key));
                    }}>{col.label}</DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nessun prodotto</h3>
              <p className="mb-4">Inizia aggiungendo il tuo primo prodotto</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible("name") && <TableHead>Prodotto</TableHead>}
                    {isColumnVisible("barcode") && <TableHead>Codice a barre</TableHead>}
                    {isColumnVisible("category") && <TableHead>Categoria</TableHead>}
                    {isColumnVisible("dispensa") && <TableHead>Dispensa</TableHead>}
                    {isColumnVisible("quantity") && <TableHead>Quantità</TableHead>}
                    {isColumnVisible("date") && <TableHead>Data creazione</TableHead>}
                    {isColumnVisible("actions") && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/prodotti/${product.id}`)}>
                      {isColumnVisible("name") && <TableCell className="font-medium">{product.name || <span className="text-muted-foreground italic">Senza nome</span>}</TableCell>}
                      {isColumnVisible("barcode") && <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{product.barcode || "—"}</code></TableCell>}
                      {isColumnVisible("category") && <TableCell>{product.category ? <Badge variant="secondary">{product.category}</Badge> : "—"}</TableCell>}
                      {isColumnVisible("dispensa") && <TableCell>{product.dispensaNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">{product.dispensaNames.map((name) => <Badge key={name} variant="outline" className="text-xs"><Warehouse className="h-3 w-3 mr-1" />{name}</Badge>)}</div>
                      ) : <span className="text-muted-foreground">—</span>}</TableCell>}
                      {isColumnVisible("quantity") && <TableCell><Badge variant={product.totalQuantity === 0 ? "destructive" : "secondary"}>{product.totalQuantity} pz</Badge></TableCell>}
                      {isColumnVisible("date") && <TableCell className="text-muted-foreground">{new Date(product.created_at).toLocaleDateString('it-IT')}</TableCell>}
                      {isColumnVisible("actions") && <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/prodotti/${product.id}`); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteProductId(product.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventario;
