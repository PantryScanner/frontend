import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/backend/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Plan = Tables<"plans">;
type Feature = Tables<"features">;
type PlanLimit = Tables<"plan_limits">;

interface AdminUserRow {
  id: string;
  email: string | null;
  username: string | null;
  is_admin: boolean;
  subscription: {
    status: string;
    provider: string;
    current_period_end: string | null;
    plans: { id: string; key: string; name: string; tier: number } | null;
  } | null;
  created_at: string;
}

const AdminPanel = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [assignTarget, setAssignTarget] = useState<AdminUserRow | null>(null);
  const [assignPlanId, setAssignPlanId] = useState<string>("");
  const [assignExpiresAt, setAssignExpiresAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("admin-list-users", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {},
      });
      if (error) throw error;
      setUsers(data?.users ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossibile caricare la lista utenti");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    const [{ data: plansData }, { data: featuresData }, { data: limitsData }] =
      await Promise.all([
        supabase.from("plans").select("*").order("tier"),
        supabase.from("features").select("*").order("min_tier"),
        supabase.from("plan_limits").select("*"),
      ]);
    setPlans(plansData ?? []);
    setFeatures(featuresData ?? []);
    setPlanLimits(limitsData ?? []);
  }, []);

  useEffect(() => {
    loadUsers();
    loadCatalog();
  }, [loadUsers, loadCatalog]);

  const filteredUsers = users.filter((u) =>
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const assign = async (mode: "manual" | "simulate") => {
    if (!assignTarget || !assignPlanId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("admin-assign-plan", {
        body: {
          target_user_id: assignTarget.id,
          plan_id: assignPlanId,
          expires_at: assignExpiresAt || null,
          mode,
        },
      });
      if (error) throw error;
      toast.success(
        mode === "simulate"
          ? "Pagamento simulato con successo"
          : "Piano assegnato con successo",
      );
      setAssignTarget(null);
      setAssignPlanId("");
      setAssignExpiresAt("");
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Operazione non riuscita");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePlanField = async (planId: string, field: keyof Plan, value: unknown) => {
    const { error } = await supabase.from("plans").update({ [field]: value }).eq("id", planId);
    if (error) {
      toast.error("Aggiornamento piano non riuscito");
      return;
    }
    await loadCatalog();
  };

  const updateFeatureField = async (featureId: string, field: keyof Feature, value: unknown) => {
    const { error } = await supabase.from("features").update({ [field]: value }).eq("id", featureId);
    if (error) {
      toast.error("Aggiornamento feature non riuscito");
      return;
    }
    await loadCatalog();
  };

  const updateLimitValue = async (limitId: string, value: number | null) => {
    const { error } = await supabase.from("plan_limits").update({ limit_value: value }).eq("id", limitId);
    if (error) {
      toast.error("Aggiornamento limite non riuscito");
      return;
    }
    await loadCatalog();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Pannello Admin</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Utenti &amp; abbonamenti</TabsTrigger>
          <TabsTrigger value="plans">Piani</TabsTrigger>
          <TabsTrigger value="features">Feature &amp; limiti</TabsTrigger>
        </TabsList>

        {/* --- UTENTI --- */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utenti</CardTitle>
              <CardDescription>
                Assegna un piano manualmente o simula un pagamento senza passare da Stripe.
              </CardDescription>
              <div className="relative mt-2 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per email o username..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Piano</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.username ?? "—"}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          {u.is_admin && <Badge variant="secondary" className="mt-1">Admin</Badge>}
                        </TableCell>
                        <TableCell>{u.subscription?.plans?.name ?? "Free"}</TableCell>
                        <TableCell>
                          {u.subscription ? (
                            <Badge variant={u.subscription.status === "active" ? "default" : "outline"}>
                              {u.subscription.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">nessuno</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.subscription?.current_period_end
                            ? new Date(u.subscription.current_period_end).toLocaleDateString("it-IT")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={assignTarget?.id === u.id}
                            onOpenChange={(open) => setAssignTarget(open ? u : null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">Gestisci piano</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assegna piano a {u.email}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Piano</Label>
                                  <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleziona un piano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {plans.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Scadenza (opzionale)</Label>
                                  <Input
                                    type="date"
                                    value={assignExpiresAt}
                                    onChange={(e) => setAssignExpiresAt(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter className="gap-2">
                                <Button
                                  variant="outline"
                                  disabled={isSubmitting || !assignPlanId}
                                  onClick={() => assign("manual")}
                                >
                                  Assegna manualmente
                                </Button>
                                <Button
                                  disabled={isSubmitting || !assignPlanId}
                                  onClick={() => assign("simulate")}
                                >
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  Simula pagamento
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PIANI --- */}
        <TabsContent value="plans" className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  <Badge variant="outline">tier {plan.tier}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    defaultValue={plan.name}
                    onBlur={(e) => e.target.value !== plan.name && updatePlanField(plan.id, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Prezzo mensile (centesimi)</Label>
                  <Input
                    type="number"
                    defaultValue={plan.price_monthly_cents}
                    onBlur={(e) => updatePlanField(plan.id, "price_monthly_cents", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Prezzo annuale (centesimi)</Label>
                  <Input
                    type="number"
                    defaultValue={plan.price_yearly_cents}
                    onBlur={(e) => updatePlanField(plan.id, "price_yearly_cents", Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={(checked) => updatePlanField(plan.id, "is_active", checked)}
                  />
                  <Label>Attivo</Label>
                </div>
                <div>
                  <Label>Stripe price ID (mensile)</Label>
                  <Input
                    defaultValue={plan.stripe_price_id_monthly ?? ""}
                    placeholder="price_..."
                    onBlur={(e) => updatePlanField(plan.id, "stripe_price_id_monthly", e.target.value || null)}
                  />
                </div>
                <div>
                  <Label>Stripe price ID (annuale)</Label>
                  <Input
                    defaultValue={plan.stripe_price_id_yearly ?? ""}
                    placeholder="price_..."
                    onBlur={(e) => updatePlanField(plan.id, "stripe_price_id_yearly", e.target.value || null)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* --- FEATURE & LIMITI --- */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature</CardTitle>
              <CardDescription>
                Ogni feature è sbloccata dai piani con tier ≥ tier minimo (gerarchia additiva).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Chiave</TableHead>
                    <TableHead>Tier minimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell className="font-mono text-xs">{f.key}</TableCell>
                      <TableCell>
                        <Select
                          value={String(f.min_tier)}
                          onValueChange={(value) => updateFeatureField(f.id, "min_tier", Number(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={String(p.tier)}>
                                {p.name} (tier {p.tier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limiti numerici</CardTitle>
              <CardDescription>Lascia vuoto per illimitato.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Piano</TableHead>
                    <TableHead>Chiave limite</TableHead>
                    <TableHead>Valore</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planLimits.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{plans.find((p) => p.id === l.plan_id)?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.limit_key}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-28"
                          defaultValue={l.limit_value ?? ""}
                          placeholder="illimitato"
                          onBlur={(e) =>
                            updateLimitValue(l.id, e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
