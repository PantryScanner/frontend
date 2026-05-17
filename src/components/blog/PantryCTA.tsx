import { Link } from "react-router-dom";
import { ArrowRight, ScanLine, Bell, Sparkles, Warehouse } from "lucide-react";

type Variant = "inline" | "sidebar" | "article-end";

interface Props {
  variant?: Variant;
  title?: string;
  description?: string;
}

const defaults = {
  title: "Prova PantryOS, gratis",
  description:
    "Scanner mobile, notifiche di scadenza e dispense condivise. Tutto in un'app, senza carta di credito.",
};

export function PantryCTA({ variant = "inline", title, description }: Props) {
  const t = title ?? defaults.title;
  const d = description ?? defaults.description;

  if (variant === "sidebar") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Warehouse className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">PantryOS</p>
        </div>
        <h3 className="font-serif text-xl font-semibold leading-snug mb-2">{t}</h3>
        <p className="text-sm text-muted-foreground mb-4">{d}</p>
        <ul className="space-y-2 mb-5 text-sm">
          <li className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary shrink-0" />
            <span>Scansiona codici a barre dal telefono</span>
          </li>
          <li className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <span>Avvisi prima della scadenza</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>Sincronizzato per tutta la famiglia</span>
          </li>
        </ul>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-md text-sm font-medium transition-colors w-full justify-center group"
        >
          Inizia gratis
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    );
  }

  if (variant === "article-end") {
    return (
      <div className="not-prose relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-background p-8 sm:p-10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-background/60 backdrop-blur border border-primary/30 rounded-full px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Metti in pratica
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-3">
            {t}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-lg">{d}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-2.5 rounded-md font-medium transition-colors shadow-glow group"
            >
              Prova PantryOS gratis
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md font-medium border border-border hover:border-primary hover:text-primary transition-colors"
            >
              Vedi i piani
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // inline
  return (
    <div className="not-prose my-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
      <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <ScanLine className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-semibold leading-snug">{t}</p>
        <p className="text-sm text-muted-foreground">{d}</p>
      </div>
      <Link
        to="/auth"
        className="inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
      >
        Inizia gratis <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
