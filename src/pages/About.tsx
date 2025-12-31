import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Warehouse,
  Users,
  Target,
  Heart,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Leaf,
  Globe,
  Shield,
} from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Lightbulb,
      title: "Innovazione",
      description: "Utilizziamo le tecnologie più avanzate per semplificare la gestione delle scorte.",
    },
    {
      icon: Leaf,
      title: "Sostenibilità",
      description: "Riduciamo gli sprechi alimentari attraverso il monitoraggio intelligente.",
    },
    {
      icon: Shield,
      title: "Affidabilità",
      description: "I tuoi dati sono sempre al sicuro e accessibili quando ne hai bisogno.",
    },
    {
      icon: Heart,
      title: "Semplicità",
      description: "Un'interfaccia intuitiva che rende la gestione dell'inventario un gioco da ragazzi.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Utenti attivi" },
    { value: "500K+", label: "Prodotti tracciati" },
    { value: "30%", label: "Riduzione sprechi" },
    { value: "24/7", label: "Monitoraggio" },
  ];

  const team = [
    {
      name: "Marco Rossi",
      role: "CEO & Founder",
      description: "Esperto di IoT e automazione con 15 anni di esperienza.",
    },
    {
      name: "Laura Bianchi",
      role: "CTO",
      description: "Architetto software specializzata in sistemi distribuiti.",
    },
    {
      name: "Andrea Verdi",
      role: "Head of Product",
      description: "Designer UX con focus su prodotti consumer.",
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
            <Link to="/about" className="text-sm font-medium text-primary">Chi siamo</Link>
            <Link to="/scanners" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Scanner</Link>
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
            <Users className="h-4 w-4" />
            La nostra storia
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Costruiamo il futuro della
            <span className="text-primary block mt-2">gestione domestica</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            PantryOS nasce dalla visione di rendere la gestione delle scorte domestiche 
            semplice, automatica e intelligente per tutti.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-2 text-primary font-medium mb-4">
                <Target className="h-5 w-5" />
                La nostra missione
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Zero sprechi, massima efficienza
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Ogni anno milioni di tonnellate di cibo vengono sprecate nelle case. 
                La nostra missione è fornire gli strumenti per monitorare, gestire e 
                ottimizzare le scorte domestiche, riducendo gli sprechi e risparmiando tempo e denaro.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Con PantryOS, ogni prodotto viene tracciato automaticamente. 
                Ricevi notifiche quando le scorte scendono, genera liste della spesa intelligenti 
                e analizza i tuoi pattern di consumo per fare acquisti più consapevoli.
              </p>
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Unisciti a noi
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl border border-primary/20 flex items-center justify-center">
                <Globe className="h-32 w-32 text-primary/40" />
              </div>
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-card border rounded-2xl shadow-lg p-4 animate-[bounce_3s_ease-in-out_infinite]">
                <Leaf className="h-8 w-8 text-success mb-2" />
                <p className="text-sm font-medium">Eco-friendly</p>
                <p className="text-xs text-muted-foreground">Carbon neutral</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-muted/30 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">I nostri valori</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Principi che guidano ogni decisione che prendiamo
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-card border rounded-2xl p-6 hover:shadow-glow transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Il nostro team</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Persone appassionate che lavorano per rendere la tua vita più semplice
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-card border rounded-2xl p-6 text-center hover:shadow-glow transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-primary text-sm mb-2">{member.role}</p>
                <p className="text-muted-foreground text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Pronto a iniziare?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Unisciti a migliaia di utenti che hanno già trasformato la gestione delle loro scorte
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Crea account gratuito
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Torna alla home
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

export default About;
