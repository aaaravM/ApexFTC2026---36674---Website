"use client";

// "Explore the codebase" — Watermelon tree-menu-base over the real TeamCode tree (repo-snapshot.ts:
// every Java file on main with its line count), described in the team's words: the curated
// descriptions in src/content/code.ts win, the files' own Javadoc fills the rest. The inspector
// shows the selected file (lines, role in the loop, GitHub link) or, by default, where the
// 5,495 lines live.

import { useState } from "react";
import { motion } from "motion/react";
import { CountUp } from "@/components/motion";
import { TreeMenu, type MenuItem } from "@/components/watermelon/tree-menu";
import { codebaseTree, pipeline, type CodeNode } from "@/content/code";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { REPO, blobUrl, folderNotes, teamCodeFiles, teamCodeTotals, type RepoFile } from "./repo-snapshot";

// ─── data ─────────────────────────────────────────────────────────────────────────────────────

const base = (p: string) => p.split("/").pop() ?? p;
const dirOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

/** Curated descriptions (content/code.ts) by file name, plus its preferred order. */
function curated() {
  const desc = new Map<string, string>();
  const order: string[] = [];
  const walk = (n: CodeNode) => {
    const name = base(n.name);
    if (n.description && name.endsWith(".java")) desc.set(name, n.description);
    if (name.endsWith(".java")) order.push(name);
    n.children?.forEach(walk);
  };
  walk(codebaseTree);
  return { desc, order };
}

interface FileInfo extends RepoFile {
  name: string;
  dir: string;
  description: string;
  /** Pipeline step (1-based) this file implements, if any. */
  step?: number;
}

function buildData() {
  const { desc, order } = curated();
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i < 0 ? 1000 : i;
  };
  const stepOf = (path: string) => {
    const i = pipeline.findIndex((s) => s.file.split(" · ").some((f) => f.trim() === path || base(f.trim()) === base(path)));
    return i < 0 ? undefined : i + 1;
  };
  const files: FileInfo[] = teamCodeFiles.map((f) => ({
    ...f,
    name: base(f.path),
    dir: dirOf(f.path),
    description: desc.get(base(f.path)) ?? f.summary,
    step: stepOf(f.path),
  }));
  const byPath = new Map(files.map((f) => [f.path, f]));

  const sortFiles = (a: FileInfo, b: FileInfo) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  const fileItem = (f: FileInfo): MenuItem => ({ id: f.path, label: f.name, meta: `${fmtInt(f.lines)} lines`, description: f.description });

  const folderItem = (dir: string, label: string): MenuItem => {
    const own = files.filter((f) => f.dir === dir).sort(sortFiles);
    const subdirs = Array.from(new Set(files.filter((f) => f.dir.startsWith(`${dir}/`)).map((f) => f.dir.slice(dir.length + 1).split("/")[0])));
    const children: MenuItem[] = [...own.map(fileItem), ...subdirs.map((s) => folderItem(`${dir}/${s}`, s))];
    const all = files.filter((f) => f.dir === dir || f.dir.startsWith(`${dir}/`));
    return {
      id: `dir:${dir}`,
      label,
      meta: `${all.length} files`,
      description: folderNotes[dir],
      children,
    };
  };

  const rootFiles = files.filter((f) => f.dir === "").sort(sortFiles);
  const curatedRoot = rootFiles.filter((f) => rank(f.name) < 1000);
  const otherRoot = rootFiles.filter((f) => rank(f.name) >= 1000);
  const menu: MenuItem[] = [
    ...curatedRoot.map(fileItem),
    folderItem("subsystems", "subsystems"),
    folderItem("vision", "vision"),
    folderItem("util", "util"),
    folderItem("opmodes", "opmodes"),
    folderItem("pedro", "pedro"),
    ...otherRoot.map(fileItem),
  ];

  // Lines by top-level folder (root files counted as "teamcode/").
  const groups = new Map<string, { files: number; lines: number }>();
  for (const f of files) {
    const top = f.dir === "" ? "(root)" : f.dir.startsWith("opmodes/tuning") ? "opmodes/tuning" : f.dir.split("/")[0];
    const g = groups.get(top) ?? { files: 0, lines: 0 };
    g.files += 1;
    g.lines += f.lines;
    groups.set(top, g);
  }
  const bars = Array.from(groups, ([name, g]) => ({ name, ...g })).sort((a, b) => b.lines - a.lines);
  return { menu, byPath, bars };
}

// ─── view ─────────────────────────────────────────────────────────────────────────────────────

/** Static (computed once per module load — pure, deterministic). */
const DATA = buildData();

export function CodebaseExplorer({ className }: { className?: string }) {
  const data = DATA;
  const [selected, setSelected] = useState<string | null>(null);
  const file = selected ? data.byPath.get(selected) : undefined;
  const maxBar = Math.max(...data.bars.map((b) => b.lines));
  const maxFile = Math.max(...teamCodeFiles.map((f) => f.lines));
  const step = file?.step ? pipeline[file.step - 1] : undefined;

  return (
    <div className={cn("grid gap-x-[var(--gutter)] gap-y-10 lg:grid-cols-12", className)}>
      <div className="min-w-0 lg:col-span-6">
        <TreeMenu menuData={data.menu} rootLabel="teamcode" onSelect={(item) => setSelected(item.id)} />
      </div>

      <aside className="min-w-0 lg:col-span-6" aria-live="polite" aria-label="File details">
        <div className="border border-hairline bg-surface-1 lg:sticky lg:top-[calc(var(--header-h)+80px)]">
          {file ? (
            <motion.div
              key={file.path}
              className="p-5 sm:p-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-mono text-[11px] leading-5 [overflow-wrap:anywhere] text-fg-muted">
                {REPO.javaRoot.split("/").slice(-1)[0]}/{file.path}
              </p>
              <h3 className="mt-3 font-display text-[clamp(24px,2.4vw,32px)] leading-tight font-[560] [overflow-wrap:anywhere] [font-stretch:108%]">
                {file.name}
              </h3>
              <p className="mt-3 max-w-[52ch] text-[16px] leading-6 text-lede">{file.description}</p>

              <div className="mt-6 grid grid-cols-2 gap-px border border-hairline bg-hairline">
                <div className="bg-surface-1 p-4">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">Lines</p>
                  <p className="mt-1 font-mono text-[32px] leading-none font-light text-fg tabular-nums">
                    <CountUp key={file.path} value={file.lines} immediate duration={0.7} />
                  </p>
                  <div aria-hidden="true" className="mt-3 h-[3px] bg-hairline">
                    <motion.div
                      className="h-full origin-left bg-fg"
                      style={{ width: `${(file.lines / maxFile) * 100}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-fg-muted">of {fmtInt(maxFile)} in the longest file</p>
                </div>
                <div className="bg-surface-1 p-4">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">In the loop</p>
                  {step ? (
                    <>
                      <p className="mt-1 font-mono text-[32px] leading-none font-light text-fg tabular-nums">{String(file.step).padStart(2, "0")}</p>
                      <p className="mt-3 font-mono text-[11px] leading-5 [overflow-wrap:anywhere] text-fg-muted">{step.call}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-[14px] leading-5 text-fg-muted">
                      {file.dir.startsWith("opmodes") ? "An OpMode — what the drivers run." : "Supports the loop; not one of its six calls."}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={blobUrl(file.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-border-ui bg-surface-2 px-4 text-[14px] font-medium text-fg transition-[background-color,color,border-color] duration-[120ms] hover:border-pollen-edge hover:bg-pollen hover:text-pollen-ink focus-visible:border-pollen-edge focus-visible:bg-pollen focus-visible:text-pollen-ink"
                >
                  Open on GitHub <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (new tab)</span>
                </a>
                <button type="button" onClick={() => setSelected(null)} className="link-draw font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase hover:text-fg">
                  Back to the overview
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              className="p-5 sm:p-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">TeamCode · {REPO.branch} · {REPO.snapshotDate}</p>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span className="font-mono text-[clamp(40px,4.4vw,60px)] leading-none font-light tracking-[-0.03em] tabular-nums">
                  <CountUp value={teamCodeTotals.lines} />
                </span>
                <span className="font-mono text-[12px] tracking-[0.06em] text-fg-muted uppercase">lines of Java · {teamCodeTotals.files} files</span>
              </p>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-6 text-fg-muted">
                Open a folder on the left, then pick a file to see what it does and where it sits in the loop.
              </p>
              <dl className="mt-6 space-y-2.5">
                {data.bars.map((b, i) => (
                  <div key={b.name} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-x-3">
                    <dt className="truncate font-mono text-[11px] text-fg-muted">{b.name === "(root)" ? "teamcode/" : `${b.name}/`}</dt>
                    <dd aria-hidden="true" className="h-[7px] bg-hairline">
                      <motion.div
                        className="h-full origin-left bg-fg/75"
                        style={{ width: `${(b.lines / maxBar) * 100}%` }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, amount: 1 }}
                        transition={{ duration: 0.9, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </dd>
                    <dd className="text-right font-mono text-[11px] text-fg tabular-nums">
                      {fmtInt(b.lines)}
                      <span className="text-fg-muted"> · {b.files}</span>
                      <span className="sr-only"> lines in {b.files} files</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">Lines · files, by folder</p>
            </motion.div>
          )}
        </div>
      </aside>
    </div>
  );
}
