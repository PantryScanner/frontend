import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { PostCard } from "@/components/blog/PostCard";
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
    description: "Guide, idee e strategie per organizzare la dispensa, ridurre lo spreco alimentare e rendere la cucina smart.",
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
        <meta name="description" content="Guide pratiche per organizzare la dispensa, ridurre gli sprechi alimentari e usare al meglio PantryOS. Articoli, tutorial e best practice." />
        <link rel="canonical" href={`${SITE}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog PantryOS — Gestione dispensa e cucina smart" />
        <meta property="og:description" content="Guide pratiche per la dispensa, scorte intelligenti e zero sprechi." />
        <meta property="og:url" content={`${SITE}/blog`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">Il blog di PantryOS</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-4">
            Idee, guide e strumenti per una dispensa che funziona davvero.
          </h1>
          <p className="text-lg text-muted-foreground">
            Articoli pratici su organizzazione della dispensa, scorte intelligenti, riduzione degli sprechi alimentari e automazione della cucina.
          </p>
        </div>

        <form
          action="/blog/cerca"
          className="mt-8 max-w-xl relative"
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
            className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-card focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </form>
      </section>

      {featured && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <PostCard post={featured} variant="featured" />
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
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

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 grid lg:grid-cols-[1fr_280px] gap-10">
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl font-semibold">Ultimi articoli</h2>
            <Link to="/blog/tags" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Tutti i tag <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {latest.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-5">
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

          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <p className="text-sm font-semibold text-primary mb-2">Prova PantryOS</p>
            <h3 className="font-serif text-xl font-semibold leading-snug mb-3">
              Trasforma la tua dispensa in pochi minuti.
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scansiona, traccia scadenze e ricevi avvisi quando le scorte stanno per finire.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Inizia gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </BlogLayout>
  );
}
