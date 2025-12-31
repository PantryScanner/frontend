import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  Check,
  ArrowRight,
  Star,
  Zap,
  HelpCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const plans = [
    {
      id: "free",
      name: "Free",
      price: "€0",
      period: "/mese",
      description: "Perfetto per iniziare",
      popular: false,
      features: [
        "1 dispensa",
        "50 prodotti",
        "1 scanner",
        "Notifiche base",
        "App mobile",
        "Supporto community",
      ],
      limitations: [
        "Nessun analytics avanzato",
        "Nessuna integrazione",
      ],
      cta: "Inizia gratis",
      ctaVariant: "outline" as const,
    },
    {
      id: "pro",
      name: "Pro",
      price: "€9",
      period: "/mese",
      description: "Per la casa moderna",
      popular: true,
      features: [
        "10 dispense",
        "Prodotti illimitati",
        "5 scanner",
        "Notifiche avanzate",
        "Analytics completi",
        "Liste della spesa automatiche",
        "Export dati",
        "Supporto email prioritario",
      ],
      limitations: [],
      cta: "Prova gratis 14 giorni",
      ctaVariant: "default" as const,
    },
    {
      id: "business",
      name: "Business",
      price: "€29",
      period: "/mese",
      description: "Per attività commerciali",
      popular: false,
      features: [
        "Dispense illimitate",
        "Prodotti illimitati",
        "Scanner illimitati",
        "Multi-utente (team)",
        "API access",
        "Integrazioni personalizzate",
        "Report avanzati",
        "Onboarding dedicato",
        "Supporto prioritario 24/7",
        "SLA garantito",
      ],
      limitations: [],
      cta: "Contattaci",
      ctaVariant: "outline" as const,
    },
  ];

  const faqs = [
    {
      question: "Posso cambiare piano in qualsiasi momento?",
      answer: "Sì, puoi fare upgrade o downgrade del tuo piano in qualsiasi momento. Se fai upgrade, pagherai la differenza pro-rata. Se fai downgrade, il credito verrà applicato al prossimo ciclo di fatturazione.",
    },
    {
      question: "C'è un contratto a lungo termine?",
      answer: "No, tutti i nostri piani sono mensili e puoi cancellare in qualsiasi momento. Non ci sono costi nascosti o penali di cancellazione.",
    },
    {
      question: "Ho bisogno di comprare uno scanner?",
      answer: "No, puoi usare PantryOS anche senza scanner dedicato. Puoi inserire i prodotti manualmente o usare la fotocamera del tuo smartphone. Gli scanner sono opzionali ma rendono il processo molto più veloce.",
    },
    {
      question: "I miei dati sono al sicuro?",
      answer: "Assolutamente. Usiamo crittografia end-to-end e i tuoi dati sono memorizzati su server sicuri in Europa. Non vendiamo mai i tuoi dati a terzi.",
    },
    {
      question: "Cosa succede se supero i limiti del piano Free?",
      answer: "Ti avviseremo quando sei vicino ai limiti. Non perderai mai i tuoi dati: semplicemente non potrai aggiungere nuovi elementi finché non fai upgrade o rimuovi qualcosa.",
    },
    {
      question: "Offrite sconti per pagamento annuale?",
      answer: "Sì! Con il pagamento annuale risparmi il 20%. Il piano Pro annuale costa €86/anno invece di €108, e il Business €278/anno invece di €348.",
    },
  ];

  const comparison = [
    { feature: "Dispense", free: "1", pro: "10", business: "∞" },
    { feature: "Prodotti", free: "50", pro: "∞", business: "∞" },
    { feature: "Scanner", free: "1", pro: "5", business: "∞" },
    { feature: "Utenti", free: "1", pro: "1", business: "Team" },
    { feature: "Analytics", free: "Base", pro: "Avanzati", business: "Custom" },
    { feature: "Notifiche", free: "Email", pro: "Email + Push", business: "Tutti i canali" },
    { feature: "Export", free: "—", pro: "✓", business: "✓" },
    { feature: "API", free: "—", pro: "—", business: "✓" },
    { feature: "Supporto", free: "Community", pro: "Email", business: "24/7" },
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
      <section className="pt-32 pb-20 px-6">
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
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-card border rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300 animate-fade-in ${
                  plan.popular ? "border-primary ring-2 ring-primary/20 scale-105" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                    <Star className="h-3 w-3 inline mr-1" />
                    Più popolare
                  </div>
                )}

                <div className={`p-6 ${plan.popular ? "pt-10" : ""}`}>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <Button
                    className="w-full mb-6"
                    variant={plan.ctaVariant}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-4 w-4 shrink-0 mt-0.5 text-center">—</span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
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
                  <th className="text-center py-4 px-4 font-medium">Free</th>
                  <th className="text-center py-4 px-4 font-medium">
                    <span className="text-primary">Pro</span>
                  </th>
                  <th className="text-center py-4 px-4 font-medium">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-4">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.free}</td>
                    <td className="py-4 px-4 text-center font-medium">{row.pro}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
