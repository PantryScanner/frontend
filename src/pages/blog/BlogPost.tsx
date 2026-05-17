import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { ArrowRight, Calendar, Clock, Tag as TagIcon, User, Share2, Link as LinkIcon } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { CodeBlock } from "@/components/blog/CodeBlock";
import { PostCard } from "@/components/blog/PostCard";
import { PantryCTA } from "@/components/blog/PantryCTA";
import { getPostBySlug, getRelatedPosts, categoryLabel, formatDate } from "@/lib/blog";
import { appToast } from "@/lib/toast";

const SITE = "https://pantryos.lovable.app";

export default function BlogPost() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  if (!category || !slug) return <Navigate to="/blog" replace />;
  const post = getPostBySlug(category, slug);
  if (!post) return <Navigate to="/blog" replace />;
  const related = getRelatedPosts(post, 3);

  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "PantryOS",
      logo: { "@type": "ImageObject", url: `${SITE}/pantry.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${post.url}` },
    image: post.image ? `${SITE}${post.image}` : undefined,
    keywords: post.tags.join(", "),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE}/blog` },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel(post.category),
        item: `${SITE}/blog/categoria/${post.category}`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE}${post.url}` },
    ],
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${SITE}${post.url}`);
      appToast.success("Link copiato");
    } catch {
      appToast.error("Impossibile copiare");
    }
  };

  return (
    <BlogLayout showBack>
      <Helmet>
        <title>{post.title} — PantryOS Blog</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={`${SITE}${post.url}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={`${SITE}${post.url}`} />
        {post.image && <meta property="og:image" content={`${SITE}${post.image}`} />}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={categoryLabel(post.category)} />
        {post.tags.map((t) => (
          <meta key={t} property="article:tag" content={t} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        {post.image && <meta name="twitter:image" content={`${SITE}${post.image}`} />}
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbs)}</script>
      </Helmet>

      <article className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <span className="mx-1.5">/</span>
          <Link to={`/blog/categoria/${post.category}`} className="hover:text-foreground">
            {categoryLabel(post.category)}
          </Link>
        </nav>

        <header className="max-w-3xl mx-auto text-center mb-10">
          <Link
            to={`/blog/categoria/${post.category}`}
            className="inline-block text-xs uppercase tracking-widest text-primary font-semibold mb-4"
          >
            {categoryLabel(post.category)}
          </Link>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold leading-tight tracking-tight mb-6">
            {post.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">{post.description}</p>
          <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" /> {post.author}
            </span>
            <time dateTime={post.date} className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(post.date)}
            </time>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {post.readingMinutes} min di lettura
            </span>
          </div>
        </header>

        {post.image && (
          <div className="max-w-4xl mx-auto mb-12 rounded-2xl overflow-hidden">
            <img src={post.image} alt={post.title} className="w-full h-auto" loading="eager" decoding="async" />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_240px] gap-12 max-w-5xl mx-auto">
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-code:before:hidden prose-code:after:hidden prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }], rehypeHighlight]}
              components={{
                pre: ({ children, className }) => <CodeBlock className={className}>{children}</CodeBlock>,
                img: ({ src, alt }) => (
                  <img src={src as string} alt={alt as string} loading="lazy" decoding="async" />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>

            <div className="not-prose mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/blog/tag/${encodeURIComponent(t)}`}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-10">
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" /> Condividi:
                </span>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${SITE}${post.url}`)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  X / Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE}${post.url}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  LinkedIn
                </a>
                <button
                  onClick={copyLink}
                  className="px-3 py-1 text-xs rounded-md border border-border hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <LinkIcon className="h-3 w-3" /> Copia link
                </button>
              </div>

              <PantryCTA
                variant="article-end"
                title="Metti in pratica quello che hai appena letto."
                description="PantryOS ti aiuta a organizzare la dispensa, tracciare le scadenze e ridurre gli sprechi alimentari — in pochi minuti, gratis."
              />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <TableOfContents markdown={post.content} />
              <PantryCTA variant="sidebar" />
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="max-w-5xl mx-auto mt-20 pt-12 border-t border-border">
            <h2 className="font-serif text-2xl font-semibold mb-6">Articoli correlati</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </BlogLayout>
  );
}
