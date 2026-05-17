import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Warehouse,
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
  User,
  Home,
  Tag,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  showBack?: boolean;
}

export function BlogLayout({ children, showBack }: Props) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/blog", label: "Blog", icon: BookOpen },
    { to: "/blog/tags", label: "Tag", icon: Tag },
    { to: "/scanners", label: "Scanner" },
    { to: "/pricing", label: "Prezzi" },
    { to: "/about", label: "Chi siamo" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="PantryOS Blog RSS" href="/rss.xml" />
      </Helmet>

      {/* Operational-style header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="container mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Warehouse className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">PantryOS</span>
            <span className="hidden sm:inline-flex ml-1 text-[10px] uppercase tracking-widest text-primary font-semibold bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
              Blog
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((l) => {
              const active =
                l.to === "/blog"
                  ? pathname === "/blog"
                  : pathname.startsWith(l.to) && l.to !== "/";
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm font-medium transition-colors relative group ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link to="/blog/cerca" aria-label="Cerca nel blog">
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </Link>
            {user ? (
              <>
                <Link to="/profilo" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 sm:mr-1" />
                    <span className="hidden md:inline">Account</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" className="shadow-glow">
                    <LayoutDashboard className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">Accedi</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="shadow-glow group">
                    Prova gratis
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Apri menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <nav className="container mx-auto px-3 py-3 flex flex-col">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {showBack && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Tutti gli articoli
          </Link>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Conversion footer */}
      <section className="border-t border-border/60 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="container mx-auto px-4 sm:px-6 py-16 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-5">
              <Warehouse className="h-3.5 w-3.5" />
              Inizia in 2 minuti, gratis
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-tight mb-4">
              Trasforma quello che hai letto in una dispensa che si gestisce da sola.
            </h2>
            <p className="text-muted-foreground mb-7 text-lg">
              Scanner mobile, scadenze automatiche, lista della spesa intelligente e sincronizzazione tra tutti i membri della famiglia.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-glow bg-gradient-to-r from-primary to-primary/80 group">
                  Inizia gratis
                  <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">
                  Vedi i piani
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} PantryOS · La tua dispensa, organizzata.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/pricing" className="hover:text-foreground">Prezzi</Link>
            <Link to="/about" className="hover:text-foreground">Chi siamo</Link>
            <a href="/rss.xml" className="hover:text-foreground">RSS</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
