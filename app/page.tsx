import Link from "next/link";
import { AuraTimer } from "@/components/timer/AuraTimer";
import { Overview } from "@/components/dashboard/Overview";

export default function Home() {
  return (
    <div className="pt-4 sm:pt-8">
      <div className="mb-4 flex justify-end">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-[0.6875rem] uppercase tracking-[0.16em] transition-transform hover:-translate-y-0.5 hover:scale-[1.02]"
          style={{
            border: "1px solid var(--line-strong)",
            color: "var(--ink)",
            background: "color-mix(in srgb, var(--paper-raised) 58%, transparent)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--aura-pink)", boxShadow: "0 0 10px var(--aura-pink)" }}
          />
          Change theme?
        </Link>
      </div>
      <AuraTimer />
      <Overview />
    </div>
  );
}
