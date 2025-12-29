import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Warehouse, 
  BarChart3, 
  Bell, 
  ShoppingCart, 
  Smartphone,
  ArrowRight,
  Check,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Warehouse,
      title: "Gestione Dispense",
      description: "Organizza i tuoi prodotti in più location con sincronizzazione real-time"
    },
    {
      icon: Bell,
      title: "Notifiche Intelligenti",
      description: "Ricevi avvisi quando i prodotti scendono sotto la soglia impostata"
    },
    {
      icon: BarChart3,
      title: "Analytics Avanzate",
      description: "Monitora consumi e trend con grafici interattivi e report dettagliati"
    },
    {
      icon: ShoppingCart,
      title: "Lista della Spesa",
      description: "Genera automaticamente la lista della spesa basata sulle scorte"
    },
    {
      icon: Smartphone,
      title: "App Mobile",
      description: "Accedi alle tue dispense ovunque con la nostra Progressive Web App"
    },
    {
      icon: RefreshCw,
      title: "Sync Automatico",
      description: "I dispositivi IoT aggiornano l'inventario in tempo reale"
    }
  ];

  const benefits = [
    "Zero sprechi alimentari",
    "Risparmio di tempo",
    "Gestione centralizzata",
    "Report automatici"
  ];

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full animate-[spin_60s_linear_infinite]" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-full animate-[spin_45s_linear_infinite_reverse]" />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div 
                className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm font-medium text-primary animate-fade-in"
              >
                <Zap className="h-4 w-4" />
                Gestione Inventario Intelligente
              </div>

              <h1 
                className="text-5xl lg:text-7xl font-bold leading-tight animate-fade-in"
                style={{ animationDelay: '0.1s' }}
              >
                Il tuo inventario,
                <span className="text-primary block mt-2">sotto controllo.</span>
              </h1>

              <p 
                className="text-xl text-muted-foreground max-w-xl animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                Monitora le scorte della tua casa o attività con dispositivi IoT intelligenti. 
                Ricevi notifiche, genera liste della spesa e analizza i consumi in tempo reale.
              </p>

              <div 
                className="flex flex-col sm:flex-row gap-4 animate-fade-in"
                style={{ animationDelay: '0.3s' }}
              >
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 shadow-glow hover:shadow-lg transition-all group">
                    Inizia Gratis
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  Scopri di più
                </Button>
              </div>

              <div 
                className="flex flex-wrap gap-4 pt-4 animate-fade-in"
                style={{ animationDelay: '0.4s' }}
              >
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Visual */}
            <div 
              className="relative hidden lg:block animate-fade-in"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="relative">
                {/* Floating cards */}
                <div className="absolute -top-8 -left-8 w-48 h-32 bg-card border rounded-xl shadow-lg p-4 animate-[bounce_3s_ease-in-out_infinite]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">145</p>
                      <p className="text-xs text-muted-foreground">Prodotti</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-primary rounded-full" />
                  </div>
                </div>

                <div 
                  className="absolute top-1/3 -right-4 w-40 h-28 bg-card border rounded-xl shadow-lg p-4 animate-[bounce_4s_ease-in-out_infinite]"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm font-medium">Sync OK</span>
                  </div>
                  <p className="text-xs text-muted-foreground">4 dispositivi online</p>
                </div>

                <div 
                  className="absolute -bottom-4 left-1/4 w-52 h-24 bg-card border rounded-xl shadow-lg p-4 animate-[bounce_3.5s_ease-in-out_infinite]"
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Alert</span>
                    <span className="text-xs text-warning font-medium">3 sotto soglia</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded bg-warning/20" />
                    <div className="h-8 w-8 rounded bg-warning/20" />
                    <div className="h-8 w-8 rounded bg-warning/20" />
                  </div>
                </div>

                {/* Main visual */}
                <div className="w-full h-96 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl border border-primary/20 flex items-center justify-center">
                  <Warehouse className="h-32 w-32 text-primary/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tutto ciò che ti serve</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Una suite completa di strumenti per gestire le tue scorte in modo intelligente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-card border rounded-2xl p-8 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">Pronto a iniziare?</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Unisciti a migliaia di utenti che hanno già ottimizzato la gestione delle loro scorte
              </p>
              <Link to="/auth">
                <Button size="lg" className="text-lg px-10 py-6 shadow-glow">
                  Crea il tuo account gratuito
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              <span className="font-semibold">PantryOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {year} PantryOS. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
