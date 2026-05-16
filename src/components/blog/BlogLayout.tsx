import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Sparkles, Search } from "lucide-react";

interface Props {
  children: React.ReactNode;
  showBack?: boolean;
}

export function BlogLayout({ children, showBack }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="PantryOS Blog RSS" href="/rss.xml" />
      </Helmet>

      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/blog" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>PantryOS Blog</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <Link to="/blog" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors hidden sm:inline-block">
              Articoli
            </Link>
            <Link to="/blog/tags" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors hidden sm:inline-block">
              Tag
            </Link>
            <Link to="/blog/cerca" className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors inline-flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Cerca</span>
            </Link>
            <Link
              to="/auth"
              className="ml-2 inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Prova gratis
            </Link>
          </nav>
        </div>
      </header>

      {showBack && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Tutti gli articoli
          </Link>
        </div>
      )}

      <main>{children}</main>

      <footer className="border-t border-border mt-24 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PantryOS. La tua dispensa, organizzata.</p>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/about" className="hover:text-foreground">Chi siamo</Link>
            <a href="/rss.xml" className="hover:text-foreground">RSS</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
