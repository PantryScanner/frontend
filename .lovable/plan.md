
# PantryOS Blog — Markdown-powered, SEO-first

A static, ultra-fast blog system embedded in the existing Vite + React app, sourced from `.md` files organized by category. Designed to drive organic traffic to PantryOS by targeting the long-tail terms identified earlier (pantry inventory, household inventory, kitchen inventory, gestione dispensa, etc.).

## 1. Content architecture

```
src/content/blog/
  pantry-management/
    how-to-organize-pantry.md
    pantry-inventory-app.md
  food-waste/
    reduce-food-waste-home.md
  smart-kitchen/
    barcode-scanner-pantry.md
  guide/
    getting-started-with-pantryos.md
```

Frontmatter contract (every post):
```yaml
---
title: "..."
description: "..."   # <160 chars, used for meta + OG
date: 2026-05-10
category: "pantry-management"
tags: ["pantry", "organization", "kitchen"]
image: "/blog/og/how-to-organize-pantry.jpg"  # optional
author: "Matteo"
featured: true       # optional, one per locale
---
```

Markdown files are imported at build time via Vite's `import.meta.glob('/src/content/blog/**/*.md', { eager: true, query: '?raw', import: 'default' })`. A small `src/lib/blog.ts` parses frontmatter with `gray-matter`, computes slug from filename, derives reading time (`reading-time` lib), and exports typed helpers: `getAllPosts()`, `getPostBySlug()`, `getPostsByCategory()`, `getPostsByTag()`, `getRelatedPosts(post, 3)`, `getAllCategories()`, `getAllTags()`.

## 2. Routes (react-router)

| Path | Page |
|------|------|
| `/blog` | Homepage: featured post hero + latest grid + categories sidebar + search |
| `/blog/categoria/:category` | Category archive |
| `/blog/tag/:tag` | Tag archive |
| `/blog/tags` | Global tag cloud |
| `/blog/cerca` | Search results (client-side fuzzy via fuse.js) |
| `/blog/:category/:slug` | Article page |

Clean URLs, no `.html`, kebab-case slugs from filename.

## 3. Article rendering

- Render with `react-markdown` + `remark-gfm` (tables, task lists) + `rehype-slug` (heading IDs) + `rehype-autolink-headings` + `rehype-highlight` (syntax highlighting, GitHub theme).
- Custom code-block renderer adds a floating **Copy** button (uses `navigator.clipboard`, toast on success via existing `appToast`).
- Lazy-loaded images via `<img loading="lazy" decoding="async">`; recommend WebP in frontmatter.
- Typography: serif display font (Fraunces) for H1/H2, Inter for body, max-width `prose` container ~70ch, generous line-height for readability. Tailwind `@tailwindcss/typography` plugin with custom theme matched to existing PantryOS green tokens.

## 4. Article-page features

- **Reading time** chip in header ("5 min di lettura").
- **TOC** sidebar (sticky on desktop, collapsible on mobile) generated from H2/H3 by walking the parsed AST; active heading highlighted via IntersectionObserver.
- **Related posts** (3): same category first, then overlapping tags, scored by tag-intersection count.
- **Tag chips** click → `/blog/tag/:tag`.
- **Share** buttons (X, LinkedIn, copy link).
- **CTA card** at end of article: "Prova PantryOS gratis" → `/auth` (drives the retention goal).

## 5. SEO

- `react-helmet-async` (already documented in head-meta guidance): per-route `<title>`, `<meta description>`, canonical, OG, Twitter Cards, JSON-LD `BlogPosting` on articles, `Blog` on `/blog`, `BreadcrumbList` everywhere.
- `index.html` keeps sitewide Organization JSON-LD; canonical removed from `index.html` (per head-meta rules) and owned per-route.
- **Sitemap generator**: extend the standard `scripts/generate-sitemap.ts` pattern to walk `src/content/blog/**/*.md`, parse frontmatter dates, emit `<lastmod>` per post + category/tag archive URLs. Wire `predev` + `prebuild` in `package.json`.
- **RSS generator**: `scripts/generate-rss.ts` writes `public/rss.xml` (RSS 2.0 + Atom self-link), runs alongside sitemap on the same hooks. Linked from `<head>` via `<link rel="alternate" type="application/rss+xml">`.
- **robots.txt**: extend existing `public/robots.txt` with `Sitemap: https://pantryos.lovable.app/sitemap.xml`.
- Semantic HTML: `<article>`, `<header>`, `<time datetime>`, `<nav aria-label="Breadcrumb">`, single H1 per page.

## 6. Search

Client-side, in-memory. Build a Fuse.js index over `{title, description, tags, plain-text body}` lazily on first focus of the search input. Results page renders highlighted snippets. Index size is fine for hundreds of posts; no server needed.

## 7. UI / aesthetic

Minimalist editorial layout, large type, generous whitespace, PantryOS green accent only on links/CTAs. Homepage:

```
[ Hero featured post — full-bleed image + title + excerpt ]
[ Search bar ]
[ Categories pills row ]
[ 2-col grid: latest posts (card = image, category, title, date, reading time) | sticky sidebar (recent, popular tags, CTA) ]
```

Article: centered prose column, sticky TOC on the right at `lg:` breakpoint, breadcrumbs on top.

## 8. Initial articles (strategic, Italian + English mix)

Targeting the niche terms from the earlier research:

1. `guide/getting-started-with-pantryos.md` — onboarding walkthrough, drives activation.
2. `pantry-management/how-to-organize-pantry.md` — "how to organize pantry" (~3.6k/mo, low difficulty).
3. `pantry-management/pantry-inventory-app.md` — "pantry inventory app" — product-led comparison.
4. `pantry-management/come-organizzare-la-dispensa.md` — IT version, "come organizzare la dispensa".
5. `food-waste/reduce-food-waste-home.md` — "reduce food waste at home".
6. `smart-kitchen/barcode-scanner-pantry.md` — feature deep-dive on the new mobile scanner, links to `/scan`.
7. `guide/expiration-date-tracking.md` — "track expiration dates", warning-system tie-in.

Each ends with a contextual CTA to the in-app feature it describes (internal linking → retention).

## 9. Tech / dependencies

Add: `gray-matter`, `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-highlight`, `highlight.js` (css only), `reading-time`, `fuse.js`, `react-helmet-async`, `@tailwindcss/typography`.

Update `tailwind.config.ts` to register the typography plugin with a custom theme using existing HSL tokens.

## 10. Navigation integration

- Add **Blog** link to public `Landing` nav and to the `AppSidebar` (under a "Risorse" group).
- Footer link from Landing.

## Out of scope (call out)

- No CMS, no comments, no i18n routing (posts can be in either language individually; future work).
- No SSR — Helmet covers JS-executing crawlers; social-preview crawlers see the static index.html fallback (acceptable trade-off, called out in head-meta doc).

## Deliverable summary

~7 seed articles, full blog UI (home/category/tag/search/article), TOC, copy-code, related posts, reading time, RSS, sitemap, robots, per-route SEO meta + JSON-LD, client-side search, integrated into nav.
