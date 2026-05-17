import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowRight, Search as SearchIcon, Sparkles, ScanLine, BookOpen } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { PostCard } from "@/components/blog/PostCard";
import { PantryCTA } from "@/components/blog/PantryCTA";
import { getAllPosts, getFeaturedPost, getAllCategories, getAllTags } from "@/lib/blog";

const SITE = "https://pantryos.lovable.app";

export default function BlogHome() {
  const featured = getFeaturedPost();
  const all = getAllPosts();
  const latest = useMemo(() => all.filter((p) => p.slug !== featured?.slug).slice(0, 9), [all, featured]);
  const categories = getAllCategories();
  const tags = getAllTags().slice(0, 12);
  const [q, setQ] = useState("");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PantryOS Blog",
    description:
      "Guide, idee e strategie per organizzare la dispensa, ridurre lo spreco alimentare e rendere la cucina smart.",
    url: `${SITE}/blog`,
    blogPost: all.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      datePublished: p.date,
      url: `${SITE}${p.url}`,
      author: { "@type": "Person", name: p.author },
    })),
  };

  return (
    <BlogLayout>
      <Helmet>
        <title>Blog PantryOS — Gestione dispensa, scorte e cucina smart</title>
        <meta
          name="description"
          content="Guide pratiche per organizzare la dispensa, ridurre gli sprechi alimentari e usare al meglio PantryOS. Articoli, tutorial e best practice."
        />
        <link rel="canonical" href={`${SITE}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog PantryOS — Gestione dispensa e cucina smart" />
        <meta property="og:description" content="Guide pratiche per la dispensa, scorte intelligenti e zero sprechi." />
        <meta property="og:url" content={`${SITE}/blog`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-success/15 via-success/5 to-transparent rounded-full blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 pt-16 pb-12 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium text-primary mb-5 backdrop-blur-sm animate-fade-in">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Il blog di PantryOS
              <span className="bg-primary/20 px-2 py-0.5 rounded-full text-xs">{all.length} articoli</span>
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.1] tracking-tight mb-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Idee, guide e strumenti per una{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-success bg-clip-text text-transparent">
                dispensa che funziona.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Organizza scorte, riduci sprechi alimentari e automatizza la cucina. Tutto quello che impari qui lo puoi mettere in pratica subito con{" "}
              <Link to="/" className="text-foreground font-medium hover:text-primary transition-colors">
                PantryOS
              </Link>
              .
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <form
                action="/blog/cerca"
                className="relative flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = `/blog/cerca?q=${encodeURIComponent(q)}`;
                }}
              >
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  name="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cerca articoli, guide, tag…"
                  className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-card/80 backdrop-blur focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </form>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 rounded-full text-sm font-medium transition-colors shadow-glow group"
              >
                <ScanLine className="h-4 w-4" />
                Prova PantryOS
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="container mx-auto px-4 sm:px-6 pt-12 mb-12">
          <PostCard post={featured} variant="featured" />
        </section>
      )}

      {/* Categories */}
      <section className="container mx-auto px-4 sm:px-6 mb-12">
        <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          <BookOpen className="h-3.5 w-3.5" /> Esplora per categoria
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/blog/categoria/${c.slug}`}
              className="px-4 py-2 rounded-full border border-border bg-card hover:border-primary hover:text-primary text-sm transition-colors"
            >
              {c.label} <span className="text-muted-foreground">({c.count})</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-20 grid lg:grid-cols-[1fr_300px] gap-10">
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl font-semibold">Ultimi articoli</h2>
            <Link
              to="/blog/tags"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Tutti i tag <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {latest.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          <PantryCTA variant="sidebar" />
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-serif font-semibold mb-3">Tag popolari</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t.tag}
                  to={`/blog/tag/${encodeURIComponent(t.tag)}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  #{t.tag}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </BlogLayout>
  );
}
