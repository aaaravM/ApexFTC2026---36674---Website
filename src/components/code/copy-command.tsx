"use client";

// A shell command with a copy button (clipboard API; falls back to selecting the text).

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCommand({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = codeRef.current;
      if (!el) return;
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  };

  return (
    <div className={cn("flex min-w-0 items-stretch border border-border-ui bg-surface-1", className)}>
      <span aria-hidden="true" className="flex items-center border-r border-hairline px-3 font-mono text-[12px] text-fg-muted select-none">
        $
      </span>
      <code ref={codeRef} className="type-code flex min-w-0 flex-1 items-center overflow-x-auto px-3 py-3 whitespace-nowrap text-fg">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex w-12 shrink-0 items-center justify-center border-l border-hairline text-fg-muted transition-colors duration-[120ms] hover:bg-surface-2 hover:text-fg"
        aria-label={copied ? "Copied" : "Copy the command"}
      >
        {copied ? <Check className="size-4" aria-hidden="true" strokeWidth={1.5} /> : <Copy className="size-4" aria-hidden="true" strokeWidth={1.5} />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Command copied to the clipboard" : ""}
      </span>
    </div>
  );
}
