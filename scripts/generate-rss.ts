// Writes public/rss.xml from src/content/blog/**/*.md
import { writeFileSync, readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const BASE_URL = "https://pantryos.lovable.app";
const BLOG_DIR = resolve("src/content/blog");

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

function parseFm(raw: string) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {} as Record<string, any>, body: raw };
  const data: Record<string, any> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (!kv) continue;
    let v: any = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else v = v.replace(/^["']|["']$/g, "");
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Item {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: string;
  author: string;
}

const items: Item[] = [];
try {
  const files = walkMd(BLOG_DIR);
  for (const f of files) {
    const raw = readFileSync(f, "utf-8");
    const { data } = parseFm(raw);
    const parts = f.split(/[\\/]/);
    const slug = parts[parts.length - 1].replace(/\.md$/, "");
    const category = data.category || parts[parts.length - 2];
    const date = data.date ? new Date(data.date) : new Date();
    items.push({
      title: data.title || slug,
      description: data.description || "",
      link: `${BASE_URL}/blog/${category}/${slug}`,
      pubDate: date.toUTCString(),
      category,
      author: data.author || "PantryOS",
    });
  }
} catch (e) {
  console.warn("[rss] no blog content found", e);
}

items.sort((a, b) => +new Date(b.pubDate) - +new Date(a.pubDate));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PantryOS Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Guide, idee e strategie per organizzare la dispensa, ridurre lo spreco alimentare e rendere la cucina smart.</description>
    <language>it-IT</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (i) => `    <item>
      <title>${esc(i.title)}</title>
      <link>${i.link}</link>
      <guid isPermaLink="true">${i.link}</guid>
      <pubDate>${i.pubDate}</pubDate>
      <description>${esc(i.description)}</description>
      <category>${esc(i.category)}</category>
      <author>noreply@pantryos.app (${esc(i.author)})</author>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

writeFileSync(resolve("public/rss.xml"), xml);
console.log(`rss.xml written (${items.length} items)`);
