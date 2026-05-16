import { Helmet } from "react-helmet-async";
import { useParams, Navigate } from "react-router-dom";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { PostCard } from "@/components/blog/PostCard";
import { CATEGORY_META, getPostsByCategory, categoryLabel } from "@/lib/blog";

const SITE = "https://pantryos.lovable.app";

export default function BlogCategory() {
  const { category } = useParams<{ category: string }>();
  if (!category) return <Navigate to="/blog" replace />;
  const posts = getPostsByCategory(category);
  const meta = CATEGORY_META[category];
  if (!meta && posts.length === 0) return <Navigate to="/blog" replace />;

  return (
    <BlogLayout showBack>
      <Helmet>
        <title>{categoryLabel(category)} — PantryOS Blog</title>
        <meta name="description" content={meta?.description || `Articoli nella categoria ${categoryLabel(category)}.`} />
        <link rel="canonical" href={`${SITE}/blog/categoria/${category}`} />
      </Helmet>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">Categoria</p>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-3">{categoryLabel(category)}</h1>
        {meta?.description && <p className="text-lg text-muted-foreground max-w-2xl mb-10">{meta.description}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      </section>
    </BlogLayout>
  );
}
