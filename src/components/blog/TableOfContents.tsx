import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split(/\r?\n/);
  const out: Heading[] = [];
  let inFence = false;
  for (const l of lines) {
    if (/^```/.test(l)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = l.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/[*_`]/g, "").trim();
      out.push({ id: slugify(text), text, level });
    }
  }
  return out;
}

interface Props {
  markdown: string;
}

export function TableOfContents({ markdown }: Props) {
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Indice articolo" className="text-sm">
      <p className="font-semibold mb-3 text-foreground">In questo articolo</p>
      <ul className="space-y-2 border-l border-border">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && "pl-3")}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block -ml-px pl-3 border-l-2 transition-colors py-1",
                activeId === h.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
