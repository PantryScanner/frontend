// Markdown-powered blog data layer. All posts are bundled at build time
// via Vite's import.meta.glob, parsed with a lightweight frontmatter
// parser (no Node Buffer deps), and exposed as typed helpers.

import readingTime from "reading-time";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  category: string;
  tags: string[];
  image?: string;
  author: string;
  featured?: boolean;
  content: string; // raw markdown body
  readingMinutes: number;
  readingText: string;
  url: string; // /blog/:category/:slug
}

// Eager-load every .md under src/content/blog as raw strings.
const modules = import.meta.glob("/src/content/blog/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const [, fm, content] = match;
  const data: Record<string, any> = {};
  // Very small YAML subset: key: value, arrays as [a, b, c] or - lines, booleans.
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    let value: any = kv[2].trim();
    if (value === "") {
      // collect following "  - item" lines as array
      const arr: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        arr.push(lines[j].replace(/^\s*-\s+/, "").replace(/^["']|["']$/g, "").trim());
        j++;
      }
      data[key] = arr;
      i = j;
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (value === "true" || value === "false") {
      data[key] = value === "true";
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
    i++;
  }
  return { data, content };
}

function slugifyFromPath(path: string): { slug: string; category: string } {
  const parts = path.split("/");
  const file = parts[parts.length - 1].replace(/\.md$/, "");
  const category = parts[parts.length - 2];
  return { slug: file, category };
}

const ALL_POSTS: BlogPost[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    const { slug, category } = slugifyFromPath(path);
    const cat = (data.category as string) || category;
    const stats = readingTime(content);
    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      date: data.date || new Date().toISOString().slice(0, 10),
      category: cat,
      tags: Array.isArray(data.tags) ? data.tags : [],
      image: data.image,
      author: data.author || "PantryOS Team",
      featured: !!data.featured,
      content,
      readingMinutes: Math.max(1, Math.round(stats.minutes)),
      readingText: stats.text,
      url: `/blog/${cat}/${slug}`,
    } as BlogPost;
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export const CATEGORY_META: Record<string, { label: string; description: string }> = {
  "pantry-management": {
    label: "Gestione Dispensa",
    description: "Guide pratiche per organizzare e ottimizzare la tua dispensa.",
  },
  "food-waste": {
    label: "Spreco Alimentare",
    description: "Strategie e dati per ridurre lo spreco di cibo in casa.",
  },
  "smart-kitchen": {
    label: "Smart Kitchen",
    description: "Tecnologia, scanner e automazioni per la cucina del futuro.",
  },
  guide: {
    label: "Guide PantryOS",
    description: "Tutto quello che serve per iniziare con PantryOS.",
  },
};

export function categoryLabel(slug: string): string {
  return CATEGORY_META[slug]?.label ?? slug;
}

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getFeaturedPost(): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.featured) ?? ALL_POSTS[0];
}

export function getPostBySlug(category: string, slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.category === category && p.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return ALL_POSTS.filter((p) => p.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return ALL_POSTS.filter((p) => p.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
}

export function getAllCategories(): { slug: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  ALL_POSTS.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, count]) => ({
    slug,
    label: categoryLabel(slug),
    count,
  }));
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  ALL_POSTS.forEach((p) =>
    p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)),
  );
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const others = ALL_POSTS.filter((p) => p.slug !== post.slug);
  const scored = others.map((p) => {
    let score = 0;
    if (p.category === post.category) score += 3;
    const overlap = p.tags.filter((t) =>
      post.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()),
    ).length;
    score += overlap * 2;
    return { p, score };
  });
  return scored
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, limit)
    .map((s) => s.p);
}

export function formatDate(iso: string, locale = "it-IT"): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
