import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Warehouse,
  Check,
  ArrowRight,
  Star,
  Zap,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, type Plan, type Feature, type PlanLimit } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";

const LIMIT_LABELS: Record<string, string> = {
  max_dispense: "Dispense",
  max_prodotti: "Prodotti",
  max_scanner: "Scanner",
  max_membri_gruppo: "Membri gruppo",
};

const formatPrice = (cents: number) => {
  if (cents === 0) return "€0";
  return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
};

const formatLimitValue = (value: number | null) =>
  value === null ? "∞" : String(value);

const Pricing = () => {
  const { user } = useAuth();
  const { plan: currentPlan } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: plansData }, { data: featuresData }, { data: limitsData }] =
        await Promise.all([
          supabase.from("plans").select("*").eq("is_active", true).order("tier"),
          supabase.from("features").select("*").order("min_tier"),
          supabase.from("plan_limits").select("*"),
        ]);
      setPlans(plansData ?? []);
      setFeatures(featuresData ?? []);
      setLimits(limitsData ?? []);
      setIsLoading(false);
    };
    load();
  }, []);

  const featuresForPlan = useMemo(
    () => (plan: Plan) => features.filter((f) => f.min_tier <= plan.tier),
    [features],
  );

  const limitsForPlan = useMemo(
    () => (plan: Plan) => limits.filter((l) => l.plan_id === plan.id),
    [limits],
  );

  const handleUpgrade = async (plan: Plan) => {
    if (!user) return;

    const priceId =
      billingInterval === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

    if (!priceId) {
      toast.info("Questo piano non è ancora collegato a un metodo di pagamento. Contattaci per l'attivazione.");
      return;
    }

    setCheckoutLoadingPlanId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: { plan_id: plan.id, billing_interval: billingInterval },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      toast.error("Non è stato possibile avviare il pagamento. Riprova più tardi.");
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  };

  const faqs = [
    {
      question: "Posso cambiare piano in qualsiasi momento?",
      answer: "Sì, puoi fare upgrade o downgrade del tuo piano in qualsiasi momento dalla pagina di gestione abbonamento.",
    },
    {
      question: "C'è un contratto a lungo termine?",
      answer: "No, tutti i nostri piani sono senza vincoli e puoi cancellare in qualsiasi momento dal portale di gestione abbonamento.",
    },
    {
      question: "Ho bisogno di comprare uno scanner?",
      answer: "No, puoi usare PantryOS anche senza scanner dedicato. Puoi inserire i prodotti manualmente o usare la fotocamera del tuo smartphone.",
    },
    {
      question: "I miei dati sono al sicuro?",
      answer: "Assolutamente. Usiamo crittografia end-to-end e i tuoi dati sono memorizzati su server sicuri in Europa.",
    },
    {
      question: "Cosa succede se supero i limiti del piano Free?",
      answer: "Ti avviseremo quando sei vicino ai limiti. Non perderai mai i tuoi dati: semplicemente non potrai aggiungere nuovi elementi finché non fai upgrade o rimuovi qualcosa.",
    },
    {
      question: "Offrite sconti per pagamento annuale?",
      answer: "Sì! Il pagamento annuale è scontato rispetto a 12 mensilità: il risparmio esatto è indicato su ciascun piano.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">PantryOS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Chi siamo</Link>
            <Link to="/scanners" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Scanner</Link>
            <Link to="/pricing" className="text-sm font-medium text-primary">Prezzi</Link>
            <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Accedi</Button>
            </Link>
            <Link to="/auth">
              <Button>Inizia Gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm font-medium text-primary mb-6 animate-fade-in">
            <Zap className="h-4 w-4" />
            Prezzi semplici e trasparenti
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Scegli il piano perfetto
            <span className="text-primary block mt-2">per le tue esigenze</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Inizia gratis e scala quando cresci. Nessun costo nascosto,
            cancellazione in qualsiasi momento.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={billingInterval === "monthly" ? "font-medium" : "text-muted-foreground"}>Mensile</span>
            <Switch
              checked={billingInterval === "yearly"}
              onCheckedChange={(checked) => setBillingInterval(checked ? "yearly" : "monthly")}
            />
            <span className={billingInterval === "yearly" ? "font-medium" : "text-muted-foreground"}>Annuale</span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => {
                const isPopular = plan.sort_order === 1;
                const isCurrent = currentPlan?.id === plan.id;
                const priceCents = billingInterval === "yearly" ? plan.price_yearly_cents : plan.price_monthly_cents;
                const period = billingInterval === "yearly" ? "/anno" : "/mese";
                const planFeatures = featuresForPlan(plan);
                const planLimitsList = limitsForPlan(plan);

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-card border rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300 animate-fade-in ${
                      isPopular ? "border-primary ring-2 ring-primary/20 scale-105" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {isPopular && (
                      <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                        <Star className="h-3 w-3 inline mr-1" />
                        Più popolare
                      </div>
                    )}

                    <div className={`p-6 ${isPopular ? "pt-10" : ""}`}>
                      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                      <div className="mb-6">
                        <span className="text-5xl font-bold">{formatPrice(priceCents)}</span>
                        <span className="text-muted-foreground">{period}</span>
                      </div>

                      {isCurrent ? (
                        <Button className="w-full mb-6" variant="outline" disabled>
                          Il tuo piano attuale
                        </Button>
                      ) : !user ? (
                        <Link to="/auth">
                          <Button className="w-full mb-6" variant={isPopular ? "default" : "outline"}>
                            {plan.tier === 0 ? "Inizia gratis" : "Registrati per iniziare"}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      ) : plan.tier === 0 ? (
                        <Button className="w-full mb-6" variant="outline" disabled>
                          Piano gratuito
                        </Button>
                      ) : (
                        <Button
                          className="w-full mb-6"
                          variant={isPopular ? "default" : "outline"}
                          disabled={checkoutLoadingPlanId === plan.id}
                          onClick={() => handleUpgrade(plan)}
                        >
                          {checkoutLoadingPlanId === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Passa a {plan.name}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}

                      <ul className="space-y-3">
                        {planLimitsList.map((limit) => (
                          <li key={limit.id} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>
                              {formatLimitValue(limit.limit_value)} {LIMIT_LABELS[limit.limit_key] ?? limit.limit_key}
                            </span>
                          </li>
                        ))}
                        {planFeatures.map((feature) => (
                          <li key={feature.id} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Comparison Table */}
      {!isLoading && (
        <section className="py-24 bg-muted/30 px-6">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Confronta i piani</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Una panoramica completa delle funzionalità disponibili
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full max-w-4xl mx-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-medium">Funzionalità</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center py-4 px-4 font-medium">
                        <span className={plan.sort_order === 1 ? "text-primary" : ""}>{plan.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(LIMIT_LABELS).map(([limitKey, label]) => (
                    <tr key={limitKey} className="border-b">
                      <td className="py-4 px-4">{label}</td>
                      {plans.map((plan) => {
                        const limit = limits.find(
                          (l) => l.plan_id === plan.id && l.limit_key === limitKey,
                        );
                        return (
                          <td key={plan.id} className="py-4 px-4 text-center text-muted-foreground">
                            {limit ? formatLimitValue(limit.limit_value) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {features.map((feature) => (
                    <tr key={feature.id} className="border-b">
                      <td className="py-4 px-4">{feature.name}</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="py-4 px-4 text-center">
                          {plan.tier >= feature.min_tier ? (
                            <Check className="h-4 w-4 text-primary inline" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 text-primary font-medium mb-4">
              <HelpCircle className="h-5 w-5" />
              Domande frequenti
            </div>
            <h2 className="text-4xl font-bold mb-4">Hai domande?</h2>
            <p className="text-xl text-muted-foreground">
              Ecco le risposte alle domande più comuni
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Inizia gratis oggi</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Nessuna carta di credito richiesta. Inizia subito e fai upgrade quando sei pronto.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Crea il tuo account gratuito
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              <span className="font-semibold">PantryOS</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">Chi siamo</Link>
              <Link to="/scanners" className="hover:text-foreground transition-colors">Scanner</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Prezzi</Link>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PantryOS. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
