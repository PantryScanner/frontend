import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Warehouse, Home, ArrowLeft, Search, MapPin } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="border-b bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Warehouse className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">PantryOS</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', 
            backgroundSize: '60px 60px' 
          }} 
        />

        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          {/* 404 Number */}
          <div className="relative mb-8">
            <h1 className="text-[12rem] md:text-[16rem] font-bold text-primary/10 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center backdrop-blur-sm animate-pulse">
                <MapPin className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-4 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Pagina non trovata
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Ops! Sembra che questa pagina sia andata persa tra le dispense. 
              Non preoccuparti, ti aiutiamo a tornare sulla strada giusta.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Percorso richiesto: <code className="bg-muted px-2 py-1 rounded">{location.pathname}</code>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="gap-2 shadow-glow w-full sm:w-auto">
                <Home className="h-4 w-4" />
                Torna alla Home
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Torna Indietro
            </Button>
          </div>

          {/* Quick links */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">Pagine utili:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/inventario">
                <Button variant="ghost" size="sm">Inventario</Button>
              </Link>
              <Link to="/dispense">
                <Button variant="ghost" size="sm">Dispense</Button>
              </Link>
              <Link to="/about">
                <Button variant="ghost" size="sm">Chi siamo</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;