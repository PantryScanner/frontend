import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  Cpu,
  Wifi,
  Battery,
  Zap,
  ArrowRight,
  Check,
  Star,
  ShoppingCart,
  Settings,
  Smartphone,
  Cable,
} from "lucide-react";

const Scanners = () => {
  const scannerModels = [
    {
      id: "basic",
      name: "PantryOS Scanner Basic",
      tagline: "Perfetto per iniziare",
      price: "€49",
      priceNote: "una tantum",
      image: null,
      popular: false,
      features: [
        "Scansione codici a barre 1D",
        "Connessione WiFi",
        "Batteria ricaricabile (8h)",
        "Display LED status",
        "Aggiornamenti OTA",
      ],
      specs: {
        connectivity: "WiFi 2.4GHz",
        battery: "2000mAh - 8 ore",
        scanTypes: "1D (EAN, UPC)",
        dimensions: "12 x 6 x 3 cm",
        weight: "120g",
      },
    },
    {
      id: "pro",
      name: "PantryOS Scanner Pro",
      tagline: "Il più venduto",
      price: "€89",
      priceNote: "una tantum",
      image: null,
      popular: true,
      features: [
        "Scansione codici 1D e 2D (QR)",
        "WiFi + Bluetooth 5.0",
        "Batteria estesa (16h)",
        "Display OLED a colori",
        "Modalità batch offline",
        "Notifiche vocali",
      ],
      specs: {
        connectivity: "WiFi 2.4/5GHz + BLE 5.0",
        battery: "4000mAh - 16 ore",
        scanTypes: "1D + 2D (QR, DataMatrix)",
        dimensions: "14 x 7 x 3.5 cm",
        weight: "180g",
      },
    },
    {
      id: "enterprise",
      name: "PantryOS Scanner Enterprise",
      tagline: "Per professionisti",
      price: "€149",
      priceNote: "una tantum",
      image: null,
      popular: false,
      features: [
        "Tutto del Pro, più:",
        "Scansione ultra-rapida (200/min)",
        "Display touch 2.4\"",
        "Impermeabile IP65",
        "Dock di ricarica inclusa",
        "Garanzia estesa 3 anni",
        "Supporto prioritario",
      ],
      specs: {
        connectivity: "WiFi 6 + BLE 5.2",
        battery: "6000mAh - 24 ore",
        scanTypes: "1D + 2D + OCR",
        dimensions: "16 x 8 x 4 cm",
        weight: "250g",
      },
    },
  ];

  const features = [
    {
      icon: Wifi,
      title: "Sempre connesso",
      description: "Sincronizzazione automatica con il cloud PantryOS",
    },
    {
      icon: Battery,
      title: "Batteria duratura",
      description: "Autonomia fino a 24 ore con una singola carica",
    },
    {
      icon: Zap,
      title: "Scansione istantanea",
      description: "Riconoscimento codici in meno di 100ms",
    },
    {
      icon: Settings,
      title: "Configurazione semplice",
      description: "Accoppia lo scanner in pochi secondi via QR code",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Collega lo scanner",
      description: "Scansiona il QR code dalla dashboard per configurare il tuo scanner",
    },
    {
      step: 2,
      title: "Assegna alla dispensa",
      description: "Associa lo scanner a una delle tue dispense",
    },
    {
      step: 3,
      title: "Scansiona i prodotti",
      description: "Ogni scansione aggiorna automaticamente l'inventario",
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
            <Link to="/scanners" className="text-sm font-medium text-primary">Scanner</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Prezzi</Link>
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
            <Cpu className="h-4 w-4" />
            Hardware dedicato
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Scanner progettati per
            <span className="text-primary block mt-2">la tua dispensa</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Dispositivi IoT dedicati che si integrano perfettamente con PantryOS 
            per tracciare automaticamente ogni prodotto in entrata e uscita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Acquista ora
            </Button>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Prova senza scanner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card border rounded-xl p-6 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scanner Models */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Scegli il tuo scanner</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tre modelli per soddisfare ogni esigenza, dalla casa alla piccola attività
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {scannerModels.map((scanner, index) => (
              <div
                key={scanner.id}
                className={`relative bg-card border rounded-2xl overflow-hidden hover:shadow-glow transition-all duration-300 animate-fade-in ${
                  scanner.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {scanner.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="h-3 w-3" />
                      Più venduto
                    </Badge>
                  </div>
                )}

                <div className="h-48 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <Cpu className="h-20 w-20 text-primary/30" />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">{scanner.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{scanner.tagline}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">{scanner.price}</span>
                    <span className="text-muted-foreground ml-2">{scanner.priceNote}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {scanner.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full gap-2 ${scanner.popular ? "" : "variant-outline"}`}
                    variant={scanner.popular ? "default" : "outline"}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Acquista
                  </Button>
                </div>

                <div className="border-t p-6 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-3">SPECIFICHE</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connettività</span>
                      <span className="font-medium">{scanner.specs.connectivity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batteria</span>
                      <span className="font-medium">{scanner.specs.battery}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Codici</span>
                      <span className="font-medium">{scanner.specs.scanTypes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/30 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Come funziona</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Configurazione in tre semplici passaggi
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((step, index) => (
              <div
                key={index}
                className="relative text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compatibility */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Compatibile con il tuo smartphone
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Non hai ancora uno scanner? Nessun problema! Puoi iniziare ad usare PantryOS 
                con il tuo smartphone. Usa la fotocamera per scansionare i codici a barre 
                o inserisci i prodotti manualmente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 bg-card border rounded-lg p-4">
                  <Smartphone className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">App Mobile</p>
                    <p className="text-sm text-muted-foreground">iOS & Android</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-card border rounded-lg p-4">
                  <Cable className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Scanner USB</p>
                    <p className="text-sm text-muted-foreground">Compatibili</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl border border-primary/20 flex items-center justify-center">
                <Smartphone className="h-32 w-32 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Pronto a iniziare?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Crea il tuo account gratuito e inizia subito a gestire le tue scorte
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Acquista uno scanner
              </Button>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Inizia senza scanner
                </Button>
              </Link>
            </div>
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

export default Scanners;
