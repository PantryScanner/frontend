import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Fuse from "fuse.js";
import { Search as SearchIcon } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/blog";

const SITE = "https://pantryos.lovable.app";

export default function BlogSearch() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);

  const posts = useMemo(() => getAllPosts(), []);
  const fuse = useMemo(
    () =>
      new Fuse(posts, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "tags", weight: 0.15 },
          { name: "content", weight: 0.05 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [posts],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set("q", q);
      else next.delete("q");
      setParams(next, { replace: true });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const results = q.trim().length >= 2 ? fuse.search(q).map((r) => r.item) : [];

  return (
    <BlogLayout showBack>
      <Helmet>
        <title>Cerca — PantryOS Blog</title>
        <meta name="description" content="Cerca tra tutti gli articoli del blog di PantryOS." />
        <link rel="canonical" href={`${SITE}/blog/cerca`} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-6">Cerca nel blog</h1>
        <div className="relative mb-10">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca articoli, guide, tag…"
            className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-card focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {q.trim().length < 2 ? (
          <p className="text-muted-foreground text-sm">Digita almeno 2 caratteri per iniziare a cercare.</p>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nessun risultato per "{q}".</p>
            <Link to="/blog" className="text-primary hover:underline">Torna al blog</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{results.length} risultati</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {results.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </BlogLayout>
  );
}
