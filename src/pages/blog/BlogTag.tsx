import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { PostCard } from "@/components/blog/PostCard";
import { getPostsByTag, getAllTags } from "@/lib/blog";

const SITE = "https://pantryos.lovable.app";

export default function BlogTag() {
  const { tag } = useParams<{ tag: string }>();
  if (!tag) return <Navigate to="/blog/tags" replace />;
  const decoded = decodeURIComponent(tag);
  const posts = getPostsByTag(decoded);

  return (
    <BlogLayout showBack>
      <Helmet>
        <title>#{decoded} — PantryOS Blog</title>
        <meta name="description" content={`Articoli con il tag #${decoded} sul blog di PantryOS.`} />
        <link rel="canonical" href={`${SITE}/blog/tag/${encodeURIComponent(decoded)}`} />
      </Helmet>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">Tag</p>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-3">#{decoded}</h1>
        <p className="text-muted-foreground mb-10">{posts.length} articoli</p>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nessun articolo con questo tag.</p>
            <Link to="/blog/tags" className="text-primary hover:underline">Vedi tutti i tag</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        )}
      </section>
    </BlogLayout>
  );
}

export function BlogTagsIndex() {
  const tags = getAllTags();
  return (
    <BlogLayout showBack>
      <Helmet>
        <title>Tutti i tag — PantryOS Blog</title>
        <meta name="description" content="Esplora tutti gli argomenti trattati sul blog di PantryOS." />
        <link rel="canonical" href={`${SITE}/blog/tags`} />
      </Helmet>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-3">Tutti i tag</h1>
        <p className="text-muted-foreground mb-10">Esplora gli articoli per argomento.</p>
        <div className="flex flex-wrap gap-3">
          {tags.map((t) => (
            <Link
              key={t.tag}
              to={`/blog/tag/${encodeURIComponent(t.tag)}`}
              className="px-4 py-2 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors text-sm"
            >
              #{t.tag} <span className="text-muted-foreground text-xs ml-1">{t.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </BlogLayout>
  );
}
