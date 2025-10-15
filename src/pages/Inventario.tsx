import { useState } from "react";
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
import { Search, Filter } from "lucide-react";

const mockProducts = [
  {
    id: 1,
    name: "Pasta Barilla 500g",
    category: "Pasta",
    location: "Dispensa A",
    quantity: 12,
    threshold: 5,
    lastUpdate: "2025-01-15 10:34",
  },
  {
    id: 2,
    name: "Olio EVO 1L",
    category: "Condimenti",
    location: "Dispensa B",
    quantity: 8,
    threshold: 3,
    lastUpdate: "2025-01-15 10:12",
  },
  {
    id: 3,
    name: "Pomodori pelati",
    category: "Conserve",
    location: "Dispensa A",
    quantity: 2,
    threshold: 4,
    lastUpdate: "2025-01-15 09:45",
  },
  {
    id: 4,
    name: "Caffè Lavazza 250g",
    category: "Bevande",
    location: "Dispensa A",
    quantity: 6,
    threshold: 2,
    lastUpdate: "2025-01-15 09:30",
  },
  {
    id: 5,
    name: "Zucchero 1kg",
    category: "Dolci",
    location: "Dispensa B",
    quantity: 4,
    threshold: 2,
    lastUpdate: "2025-01-15 09:15",
  },
];

const Inventario = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const getStatusBadge = (quantity: number, threshold: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Esaurito</Badge>;
    }
    if (quantity <= threshold) {
      return <Badge variant="warning">Sotto soglia</Badge>;
    }
    return <Badge variant="success">Disponibile</Badge>;
  };

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Inventario</h1>
        <p className="text-muted-foreground">
          Gestisci tutti i prodotti rilevati
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Prodotti</CardTitle>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca prodotto..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="Pasta">Pasta</SelectItem>
                  <SelectItem value="Condimenti">Condimenti</SelectItem>
                  <SelectItem value="Conserve">Conserve</SelectItem>
                  <SelectItem value="Bevande">Bevande</SelectItem>
                  <SelectItem value="Dolci">Dolci</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prodotto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Posizione</TableHead>
                  <TableHead className="text-center">Quantità</TableHead>
                  <TableHead className="text-center">Soglia</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ultimo aggiornamento</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.location}</TableCell>
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
                      {product.lastUpdate}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Modifica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventario;
