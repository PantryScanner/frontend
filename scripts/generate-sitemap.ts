// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync, readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const BASE_URL = "https://pantryos.lovable.app";
const BLOG_DIR = resolve("src/content/blog");

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkMd(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseFm(raw: string): Record<string, any> {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const data: Record<string, any> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (!kv) continue;
    let v: any = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    data[kv[1]] = v;
  }
  return data;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/scanners", changefreq: "monthly", priority: "0.6" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/blog/tags", changefreq: "weekly", priority: "0.5" },
];

const categorySet = new Set<string>();
const tagSet = new Set<string>();

try {
  const files = walkMd(BLOG_DIR);
  for (const f of files) {
    const raw = readFileSync(f, "utf-8");
    const fm = parseFm(raw);
    const parts = f.split(/[\\/]/);
    const slug = parts[parts.length - 1].replace(/\.md$/, "");
    const category = fm.category || parts[parts.length - 2];
    categorySet.add(category);
    (Array.isArray(fm.tags) ? fm.tags : []).forEach((t: string) => tagSet.add(t));
    entries.push({
      path: `/blog/${category}/${slug}`,
      lastmod: fm.date,
      changefreq: "monthly",
      priority: "0.8",
    });
  }
} catch (e) {
  console.warn("[sitemap] no blog content found", e);
}

for (const c of categorySet) {
  entries.push({ path: `/blog/categoria/${c}`, changefreq: "weekly", priority: "0.6" });
}
for (const t of tagSet) {
  entries.push({ path: `/blog/tag/${encodeURIComponent(t)}`, changefreq: "monthly", priority: "0.4" });
}

function generate(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generate(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
