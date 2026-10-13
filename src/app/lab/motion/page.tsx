// Dev-only demo of the motion kit (src/components/motion). Not linked from the site, noindex, and a
// 404 in production builds (USER-REQUIREMENTS #8).
import { notFound } from "next/navigation";
import {
  CountUp,
  ImageWipe,
  LineDraw,
  Magnetic,
  RollText,
  Scramble,
  ScrollProgress,
  Stagger,
  StaggerItem,
  StretchIn,
  TextReveal,
} from "@/components/motion";

export const metadata = { title: "Motion lab", robots: { index: false, follow: false } };

export default function MotionLab() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="container-page pt-32 pb-[60vh]">
      <ScrollProgress />
      <Scramble text="[ 00 / MOTION LAB ]" className="font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase" immediate />
      <TextReveal as="h1" text="Motion kit." immediate className="mt-6 font-display text-[clamp(44px,7.2vw,112px)] leading-[0.94] font-semibold [font-stretch:112%]" />
      <LineDraw className="mt-10 text-hairline" immediate />

      <section className="mt-[90vh]">
        <Scramble text="[ 01 / REVEALS ]" hover className="font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase" />
        <TextReveal as="h2" text="The people behind APEX-R1." className="mt-4 font-display text-[clamp(30px,3.6vw,52px)] leading-none font-medium" />
        <TextReveal as="p" mode="words" text="Odometry says where we are. Vision says where the HIVE is. The solver closes the loop." className="mt-6 max-w-[56ch] text-lg text-fg-muted" delay={0.3} />
        <LineDraw className="mt-8 text-hairline" />
        <StretchIn as="p" className="mt-10 font-display text-6xl font-light uppercase">
          Apex
        </StretchIn>
      </section>

      <section className="mt-[60vh] grid grid-cols-3 gap-6">
        {[
          { v: 12, s: "", l: "STUDENTS" },
          { v: 170, p: "±", s: "°", l: "TURRET" },
          { v: 5000, s: " RPM", l: "FLYWHEEL MAX" },
        ].map((f) => (
          <div key={f.l} className="border-t border-hairline pt-4">
            <CountUp value={f.v} prefix={f.p} suffix={f.s} className="font-mono text-5xl font-light" />
            <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-fg-muted">{f.l}</p>
          </div>
        ))}
      </section>

      <section className="mt-[60vh] grid grid-cols-2 gap-6">
        <ImageWipe className="aspect-[4/5] bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/team/anish-pattanaik.jpg" alt="" className="size-full object-cover grayscale" />
        </ImageWipe>
        <Stagger as="ul" className="space-y-3">
          {["Drivetrain", "Odometry", "Intake", "Hopper", "Turret", "Shooter"].map((s) => (
            <StaggerItem as="li" key={s} className="border-b border-hairline py-3 font-mono text-sm">
              {s}
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mt-24 flex gap-6">
        <Magnetic>
          <a href="#" className="inline-flex items-center gap-2 border border-border-ui px-4 py-3 text-sm">
            <RollText>Meet the team</RollText> →
          </a>
        </Magnetic>
      </section>
    </main>
  );
}
