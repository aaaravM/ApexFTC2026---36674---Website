// Tuning sequence T0 → TeleOp Main (TEAM-README.md "Run these in order"). Each row: the step, its
// OpMode as the Driver Station names it (@TeleOp annotation in the source), what it settles, and a
// matrix of the hardware each step brings in — read downward, the robot assembles itself.
// Server component. Motion (CSS on the Armed trigger): step by step, the rails extend downward and
// each new piece of hardware stamps in — the matrix assembles as it scrolls in.

import type { CSSProperties } from "react";
import { Armed } from "@/components/code/armed";
import { tuningSequence } from "@/content/code";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { blobUrl, teamCodeFiles, tuningAnnotations } from "./repo-snapshot";

/** Hardware columns, in the order the README introduces them. */
const HARDWARE = [
  { id: "hub", label: "Control Hub" },
  { id: "pinpoint", label: "Pinpoint" },
  { id: "drive", label: "4 drive motors" },
  { id: "webcam", label: "Webcam" },
  { id: "flywheel", label: "Flywheel" },
  { id: "colour", label: "Colour sensor" },
  { id: "full", label: "Turret, feeder, intake" },
] as const;
type HardwareId = (typeof HARDWARE)[number]["id"];

/** Which column each step introduces (from the README's "Hardware needed" column). */
const INTRODUCES: Record<string, HardwareId | undefined> = {
  T0: "hub",
  T1: "pinpoint",
  DRV: "drive",
  T4: "webcam",
  T5: "flywheel",
  T6: "colour",
  MAIN: "full",
};

/** Source file for each step (null when the step is not a tuning OpMode). */
const FILE_FOR: Record<string, string> = {
  DRV: "opmodes/TeleOpDriveOnly.java",
  MAIN: "opmodes/TeleOpMain.java",
};

function fileFor(code: string) {
  if (FILE_FOR[code]) return FILE_FOR[code];
  return tuningAnnotations.find((a) => a.name.startsWith(`${code} `))?.file;
}

export function TuningSequence({ className }: { className?: string }) {
  const introducedAt: Record<HardwareId, number> = Object.fromEntries(
    HARDWARE.map((h) => [h.id, tuningSequence.findIndex((s) => INTRODUCES[s.code] === h.id)]),
  ) as Record<HardwareId, number>;

  return (
    <div className={cn("min-w-0", className)}>
      {/* header row (desktop) */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[4.5rem_minmax(0,1fr)_repeat(7,2.25rem)_15rem] items-end gap-x-0 border-b border-border-ui pb-3 lg:grid"
      >
        <span className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">Step</span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">OpMode · what it settles</span>
        {HARDWARE.map((h) => (
          <span key={h.id} className="flex h-32 items-end justify-center">
            <span className="font-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase [writing-mode:vertical-rl] rotate-180">
              {h.label}
            </span>
          </span>
        ))}
        <span className="pl-4 text-right font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">Source</span>
      </div>

      <Armed effect="assemble" as="ol" inset={0.15} className="border-t border-hairline lg:border-t-0">
        {tuningSequence.map((s, row) => {
          const file = fileFor(s.code);
          const lines = file ? teamCodeFiles.find((f) => f.path === file)?.lines : undefined;
          const annotated = tuningAnnotations.find((a) => a.file === file)?.name;
          const intro = INTRODUCES[s.code];
          const introLabel = HARDWARE.find((h) => h.id === intro)?.label;
          const disabled = s.code === "MAIN";
          return (
            <li
              key={s.code}
              style={{ "--i": row } as CSSProperties}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-b border-hairline py-4 lg:grid-cols-[4.5rem_minmax(0,1fr)_repeat(7,2.25rem)_15rem] lg:gap-x-0 lg:py-0"
            >
              <span className="code-step pt-0.5 font-mono text-[13px] text-fg tabular-nums lg:py-4">{s.code}</span>
              <div className="code-step min-w-0 lg:py-4 lg:pr-6">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[16px] font-[560]">{s.opMode}</span>
                  {disabled && (
                    <span className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">@Disabled until the hardware exists</span>
                  )}
                </p>
                <p className="mt-1 text-[14px] leading-6 text-fg-muted">{s.purpose}</p>
                {annotated && annotated !== s.opMode && (
                  <p className="mt-1 font-mono text-[10.5px] leading-5 text-fg-muted/80">
                    Driver Station: &ldquo;{annotated}&rdquo;
                  </p>
                )}
                {/* phones: what this step brings in */}
                <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase lg:hidden">
                  {intro ? (
                    <>
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-fg" />
                      Adds {introLabel}
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="h-px w-3 bg-border-ui" />
                      {s.hardware}
                    </>
                  )}
                  {file && <span className="normal-case">· {file.split("/").pop()}</span>}
                </p>
              </div>
              {/* matrix (desktop) */}
              {HARDWARE.map((h) => {
                const at = introducedAt[h.id];
                const here = at === row;
                const after = at >= 0 && row > at;
                return (
                  <span key={h.id} aria-hidden="true" className="relative hidden lg:block">
                    {(here || after) && (
                      <span className={cn("code-rail absolute left-1/2 w-px -translate-x-1/2 bg-border-ui", here ? "top-1/2 bottom-0" : "inset-y-0")} />
                    )}
                    {here && <span className="code-dot absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />}
                  </span>
                );
              })}
              <span className="code-step hidden min-w-0 py-4 pl-4 text-right font-mono text-[11px] leading-5 lg:block">
                {file ? (
                  <a href={blobUrl(file)} target="_blank" rel="noopener noreferrer" className="link-draw text-fg-muted hover:text-fg">
                    <span className="[overflow-wrap:anywhere]">
                      {/* break after "_" (T0_TagLibraryDump.java), not mid-word */}
                      {(file.split("/").pop() ?? file).split(/(?<=_)/).map((part, k) => (
                        <span key={k}>
                          {k > 0 && <wbr />}
                          {part}
                        </span>
                      ))}
                    </span>
                    {lines ? <span className="block text-[10px] text-fg-muted/80">{fmtInt(lines)} lines ↗</span> : null}
                    <span className="sr-only"> (opens on GitHub in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-fg-muted">—</span>
                )}
              </span>
              <span className="sr-only">{intro ? `Adds ${introLabel}.` : `Hardware: ${s.hardware}.`}</span>
            </li>
          );
        })}
      </Armed>
    </div>
  );
}
