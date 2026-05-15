import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileSpreadsheet, FileJson, FileText, Settings2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import type { ProductWithDetails } from "@/hooks/useInventoryData";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Dispensa {
  id: string;
  name: string;
}

interface ExportInventoryDialogProps {
  products: ProductWithDetails[];
  dispense: Dispensa[];
  groupName?: string;
  trigger?: React.ReactNode;
}

type ExportFormat = "xlsx" | "csv" | "json";

const FIELD_DEFS: { key: string; label: string; default: boolean }[] = [
  { key: "name", label: "Nome", default: true },
  { key: "brand", label: "Marca", default: true },
  { key: "barcode", label: "Codice a barre", default: true },
  { key: "category", label: "Categoria", default: true },
  { key: "categories_all", label: "Tutte le categorie", default: false },
  { key: "dispense", label: "Dispense", default: true },
  { key: "quantity", label: "Quantità totale", default: true },
  { key: "expiry", label: "Prossima scadenza", default: true },
  { key: "origin", label: "Origine", default: false },
  { key: "nutriscore", label: "Nutri-Score", default: false },
  { key: "ecoscore", label: "Eco-Score", default: false },
  { key: "nova", label: "NOVA", default: false },
  { key: "image_url", label: "URL immagine", default: false },
  { key: "created_at", label: "Data creazione", default: false },
];

export function ExportInventoryDialog({
  products,
  dispense,
  groupName,
  trigger,
}: ExportInventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    () => Object.fromEntries(FIELD_DEFS.map((f) => [f.key, f.default])),
  );
  const [dispensaFilter, setDispensaFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out" | "expiring">("all");
  const [splitByDispensa, setSplitByDispensa] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  const filtered = useMemo(() => {
    let list = products;
    if (dispensaFilter !== "all") {
      const dn = dispense.find((d) => d.id === dispensaFilter)?.name;
      if (dn) list = list.filter((p) => p.dispensaNames.includes(dn));
    }
    if (stockFilter === "in") list = list.filter((p) => p.totalQuantity > 0);
    if (stockFilter === "out") list = list.filter((p) => p.totalQuantity === 0);
    if (stockFilter === "expiring") {
      const in7 = Date.now() + 7 * 86400_000;
      list = list.filter(
        (p) => p.nearestExpiry && new Date(p.nearestExpiry).getTime() <= in7,
      );
    }
    return list;
  }, [products, dispense, dispensaFilter, stockFilter]);

  const buildRow = (p: ProductWithDetails) => {
    const row: Record<string, any> = {};
    if (selectedFields.name) row["Nome"] = p.name ?? "";
    if (selectedFields.brand) row["Marca"] = p.brand ?? "";
    if (selectedFields.barcode) row["Codice a barre"] = p.barcode ?? "";
    if (selectedFields.category) row["Categoria"] = p.category ?? "";
    if (selectedFields.categories_all)
      row["Tutte le categorie"] = (p.allCategories || []).join(", ");
    if (selectedFields.dispense) row["Dispense"] = p.dispensaNames.join(", ");
    if (selectedFields.quantity) row["Quantità"] = p.totalQuantity;
    if (selectedFields.expiry)
      row["Prossima scadenza"] = p.nearestExpiry
        ? format(new Date(p.nearestExpiry), "yyyy-MM-dd")
        : "";
    if (selectedFields.origin) row["Origine"] = p.origin ?? "";
    if (selectedFields.nutriscore) row["Nutri-Score"] = p.nutriscore ?? "";
    if (selectedFields.ecoscore) row["Eco-Score"] = p.ecoscore ?? "";
    if (selectedFields.nova) row["NOVA"] = p.nova_group ?? "";
    if (selectedFields.image_url) row["Immagine"] = p.image_url ?? "";
    if (selectedFields.created_at)
      row["Data creazione"] = p.created_at
        ? format(new Date(p.created_at), "yyyy-MM-dd HH:mm")
        : "";
    return row;
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const activeFields = Object.values(selectedFields).filter(Boolean).length;
    if (activeFields === 0) {
      appToast.warning("Seleziona almeno un campo da esportare");
      return;
    }
    if (filtered.length === 0) {
      appToast.warning("Nessun prodotto corrisponde ai filtri selezionati");
      return;
    }

    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    const baseName = `inventario-${(groupName || "export").toLowerCase().replace(/\s+/g, "-")}-${stamp}`;

    try {
      if (exportFormat === "json") {
        const rows = filtered.map(buildRow);
        const payload = splitByDispensa
          ? groupRowsByDispensa(filtered, buildRow)
          : rows;
        downloadFile(
          new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
          }),
          `${baseName}.json`,
        );
      } else if (exportFormat === "csv") {
        const rows = filtered.map(buildRow);
        const csv = toCSV(rows, includeHeaders);
        downloadFile(
          new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
          `${baseName}.csv`,
        );
      } else {
        const wb = XLSX.utils.book_new();
        if (splitByDispensa) {
          const grouped = groupRowsByDispensa(filtered, buildRow);
          Object.entries(grouped).forEach(([disp, rows]) => {
            const ws = XLSX.utils.json_to_sheet(rows as any[], {
              skipHeader: !includeHeaders,
            });
            XLSX.utils.book_append_sheet(wb, ws, disp.slice(0, 31) || "Senza dispensa");
          });
        } else {
          const ws = XLSX.utils.json_to_sheet(filtered.map(buildRow), {
            skipHeader: !includeHeaders,
          });
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        }
        XLSX.writeFile(wb, `${baseName}.xlsx`);
      }

      appToast.success("Esportazione completata", {
        description: `${filtered.length} prodotti esportati`,
      });
      setOpen(false);
    } catch (e: any) {
      appToast.error("Errore esportazione", { description: e.message });
    }
  };

  const allSelected = FIELD_DEFS.every((f) => selectedFields[f.key]);
  const toggleAll = () => {
    const next = !allSelected;
    setSelectedFields(Object.fromEntries(FIELD_DEFS.map((f) => [f.key, next])));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Esporta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Esporta inventario
          </DialogTitle>
          <DialogDescription>
            Personalizza formato, campi e filtri prima di scaricare i tuoi dati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Format */}
          <div className="space-y-3">
            <Label className="text-base">Formato file</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "xlsx", icon: FileSpreadsheet, label: "Excel" },
                { v: "csv", icon: FileText, label: "CSV" },
                { v: "json", icon: FileJson, label: "JSON" },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setExportFormat(v)}
                  className={cn(
                    "border rounded-xl p-4 flex flex-col items-center gap-2 transition-all",
                    exportFormat === v
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <Icon className={cn("h-6 w-6", exportFormat === v ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Campi da esportare</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allSelected ? "Deseleziona tutto" : "Seleziona tutto"}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-muted/30 p-3 rounded-lg border">
              {FIELD_DEFS.map((f) => (
                <label
                  key={f.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                >
                  <Checkbox
                    checked={selectedFields[f.key]}
                    onCheckedChange={(v) =>
                      setSelectedFields((s) => ({ ...s, [f.key]: !!v }))
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Filters */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Filtri
            </Label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Dispensa</Label>
                <Select value={dispensaFilter} onValueChange={setDispensaFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le dispense</SelectItem>
                    {dispense.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Disponibilità</Label>
                <Select value={stockFilter} onValueChange={(v: any) => setStockFilter(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="in">Solo disponibili</SelectItem>
                    <SelectItem value="out">Solo esauriti</SelectItem>
                    <SelectItem value="expiring">In scadenza (7 giorni)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {exportFormat !== "json" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeHeaders}
                    onCheckedChange={(v) => setIncludeHeaders(!!v)}
                  />
                  Includi intestazioni colonne
                </label>
              )}
              {exportFormat !== "csv" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={splitByDispensa}
                    onCheckedChange={(v) => setSplitByDispensa(!!v)}
                  />
                  Suddividi per dispensa {exportFormat === "xlsx" ? "(un foglio per dispensa)" : "(oggetto raggruppato)"}
                </label>
              )}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Prodotti da esportare</span>
            <span className="font-bold text-primary text-lg">{filtered.length}</span>
          </div>

          <Button onClick={handleExport} className="w-full gap-2" size="lg">
            <Download className="h-4 w-4" />
            Esporta {filtered.length} prodotti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function groupRowsByDispensa(
  products: ProductWithDetails[],
  buildRow: (p: ProductWithDetails) => Record<string, any>,
): Record<string, Record<string, any>[]> {
  const out: Record<string, Record<string, any>[]> = {};
  products.forEach((p) => {
    const keys = p.dispensaNames.length ? p.dispensaNames : ["Senza dispensa"];
    keys.forEach((k) => {
      if (!out[k]) out[k] = [];
      out[k].push(buildRow(p));
    });
  });
  return out;
}

function toCSV(rows: Record<string, any>[], headers: boolean): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  if (headers) lines.push(cols.join(","));
  for (const r of rows) lines.push(cols.map((c) => escape(r[c])).join(","));
  return lines.join("\n");
}
