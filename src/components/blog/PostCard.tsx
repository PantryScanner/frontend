import { Link } from "react-router-dom";
import { Clock, ArrowUpRight, Calendar } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { categoryLabel, formatDate } from "@/lib/blog";

interface Props {
  post: BlogPost;
  variant?: "default" | "compact" | "featured";
}

export function PostCard({ post, variant = "default" }: Props) {
  if (variant === "featured") {
    return (
      <Link
        to={post.url}
        className="group relative block rounded-3xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-glow"
      >
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative aspect-[16/10] md:aspect-auto bg-gradient-to-br from-primary/30 via-primary/10 to-background overflow-hidden">
            {post.image ? (
              <img
                src={post.image}
                alt={post.title}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <>
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-primary/30 text-8xl font-serif">
                  {post.title.charAt(0)}
                </div>
              </>
            )}
            <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-background/80 backdrop-blur border border-border rounded-full px-3 py-1 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              In evidenza
            </div>
          </div>
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
              {categoryLabel(post.category)}
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold leading-tight mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground line-clamp-3 mb-5">{post.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                Leggi <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        to={post.url}
        className="group block py-3 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded transition-colors"
      >
        <p className="text-xs text-muted-foreground mb-1">{categoryLabel(post.category)}</p>
        <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </p>
      </Link>
    );
  }

  return (
    <Link
      to={post.url}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-glow hover:-translate-y-0.5 duration-300"
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/15 via-primary/5 to-background overflow-hidden">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-primary/25 text-6xl font-serif">
              {post.title.charAt(0)}
            </div>
          </>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center bg-background/80 backdrop-blur border border-border rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-primary">
          {categoryLabel(post.category)}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-serif text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{post.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border/60">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readingMinutes} min
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
