import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  children?: React.ReactNode;
}

export function CodeBlock({ className, children }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const pre = (e.currentTarget.parentElement?.querySelector("code") as HTMLElement | null);
    const text = pre?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="relative group my-6">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copia codice"
        className={cn(
          "absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-md",
          "border border-border bg-background/80 backdrop-blur px-2 py-1 text-xs",
          "text-muted-foreground hover:text-foreground hover:bg-background transition",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copiato" : "Copia"}
      </button>
      <pre className={cn("rounded-lg overflow-x-auto p-4 bg-muted text-sm leading-relaxed", className)}>
        {children}
      </pre>
    </div>
  );
}
