"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/log", label: "Log" },
  { href: "/reflect", label: "Reflect" },
  { href: "/settings", label: "Settings" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
      <Wordmark />
      <nav aria-label="Primary" className="flex items-baseline gap-4 sm:gap-7">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className="microlabel relative pb-1 transition-colors hover:text-ink"
              style={active ? { color: "var(--ink)" } : undefined}
            >
              {link.label}
              {active && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-0 -bottom-px h-px"
                  style={{ background: "var(--ink)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
