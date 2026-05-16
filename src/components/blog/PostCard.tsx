import { Link } from "react-router-dom";
import { Clock, ArrowUpRight } from "lucide-react";
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
        className="group block rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-lg"
      >
        <div className="grid md:grid-cols-2 gap-0">
          <div className="aspect-[16/10] md:aspect-auto bg-gradient-to-br from-primary/20 via-primary/5 to-background relative overflow-hidden">
            {post.image ? (
              <img
                src={post.image}
                alt={post.title}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary/30 text-7xl font-serif">
                {post.title.charAt(0)}
              </div>
            )}
          </div>
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-primary mb-3">
              <span className="font-semibold">In evidenza</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{categoryLabel(post.category)}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold leading-tight mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground line-clamp-3 mb-4">{post.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {post.readingMinutes} min
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-primary font-medium">
                Leggi <ArrowUpRight className="h-3 w-3" />
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
      className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-md"
    >
      <div className="aspect-[16/10] bg-gradient-to-br from-primary/10 to-background relative overflow-hidden">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/20 text-5xl font-serif">
            {post.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
          {categoryLabel(post.category)}
        </p>
        <h3 className="font-serif text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readingMinutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
