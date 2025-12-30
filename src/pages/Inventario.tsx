import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, Plus, Package, Loader2, Eye } from "lucide-react";
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
}

interface Dispensa {
  id: string;
  name: string;
}

const Inventario = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { fetchProductInfo } = useProductInfo();
  const [products, setProducts] = useState<Product[]>([]);
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    category: "",
    quantity: 1,
    dispensa_id: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [productsRes, dispenseRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("dispense").select("id, name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      
      setProducts(productsRes.data || []);
      setDispense(dispenseRes.data || []);

      const uniqueCategories = [...new Set(
        (productsRes.data || [])
          .map((p: Product) => p.category)
          .filter((c: string | null): c is string => !!c)
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
    if (!user) {
      toast.error("Devi essere autenticato");
      return;
    }

    if (!newProduct.barcode.trim()) {
      toast.error("Il codice a barre è obbligatorio");
      return;
    }

    if (!/^\d+$/.test(newProduct.barcode.trim())) {
      toast.error("Il codice a barre deve contenere solo numeri");
      return;
    }

    if (newProduct.quantity < 1) {
      toast.error("La quantità deve essere almeno 1");
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch product info from OpenFoodFacts
      const productInfo = await fetchProductInfo(newProduct.barcode.trim());
      const productName = newProduct.name.trim() || productInfo?.name || null;
      const productCategory = newProduct.category.trim() || productInfo?.category || null;

      // Create individual products for each quantity
      const productsToInsert = Array.from({ length: newProduct.quantity }, () => ({
        user_id: user.id,
        name: productName,
        barcode: newProduct.barcode.trim(),
        category: productCategory,
      }));

      const { data: insertedProducts, error } = await supabase
        .from("products")
        .insert(productsToInsert)
        .select();

      if (error) throw error;

      // If dispensa is selected, add products to dispense_products
      if (newProduct.dispensa_id && insertedProducts) {
        for (const product of insertedProducts) {
          const { data: existing } = await supabase
            .from("dispense_products")
            .select("id, quantity")
            .eq("dispensa_id", newProduct.dispensa_id)
            .eq("product_id", product.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("dispense_products")
              .update({ quantity: existing.quantity + 1 })
              .eq("id", existing.id);
          } else {
            await supabase.from("dispense_products").insert({
              dispensa_id: newProduct.dispensa_id,
              product_id: product.id,
              quantity: 1,
            });
          }
        }
      }

      toast.success(`${newProduct.quantity} prodott${newProduct.quantity > 1 ? 'i aggiunti' : 'o aggiunto'} con successo`);
      addNotification(
        "Prodotto aggiunto",
        `${newProduct.quantity} prodott${newProduct.quantity > 1 ? 'i' : 'o'} aggiunt${newProduct.quantity > 1 ? 'i' : 'o'} all'inventario`,
        "success"
      );
      setNewProduct({ name: "", barcode: "", category: "", quantity: 1, dispensa_id: "" });
      setIsAddDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast.error("Errore nell'aggiunta del prodotto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setNewProduct({ ...newProduct, barcode: numericValue });
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
          <h1 className="text-3xl font-bold mb-2">Inventario</h1>
          <p className="text-muted-foreground">Gestisci tutti i prodotti tracciati dal sistema</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Aggiungi Prodotto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Prodotto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Codice a barre *</Label>
                <Input
                  id="barcode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="es. 8076800195057"
                  value={newProduct.barcode}
                  onChange={(e) => handleBarcodeInput(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantità *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispensa">Dispensa</Label>
                  <Select
                    value={newProduct.dispensa_id}
                    onValueChange={(value) => setNewProduct({ ...newProduct, dispensa_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuna" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">Nessuna</SelectItem>
                      {dispense.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  placeholder="es. Pasta"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opzionale)</Label>
                <Input
                  id="name"
                  placeholder="es. Pasta Barilla 500g"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <Button onClick={handleAddProduct} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Aggiungi ${newProduct.quantity > 1 ? `${newProduct.quantity} Prodotti` : 'Prodotto'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Prodotti ({filteredProducts.length})
            </CardTitle>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cerca prodotto..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tutte</SelectItem>
                  {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nessun prodotto</h3>
              <p className="mb-4">Inizia aggiungendo il tuo primo prodotto o scansionandolo con un dispositivo</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prodotto</TableHead>
                    <TableHead>Codice a barre</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data creazione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/prodotti/${product.id}`)}>
                      <TableCell className="font-medium">{product.name || <span className="text-muted-foreground italic">Senza nome</span>}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{product.barcode || "—"}</code></TableCell>
                      <TableCell>{product.category ? <Badge variant="secondary">{product.category}</Badge> : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(product.created_at).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/prodotti/${product.id}`); }}>
                          <Eye className="h-4 w-4 mr-1" />Dettagli
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
    </div>
  );
};

export default Inventario;