"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { useAura, newId } from "@/lib/store";
import type { ExportBundle } from "@/lib/types";
import { PageTitle } from "@/components/ui/PageTitle";
import { THEMES, DARK_THEMES } from "@/lib/themes";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PillButton } from "@/components/ui/PillButton";
import { Field, TextInput, NumberInput } from "@/components/ui/inputs";

export default function SettingsPage() {
  const settings = useAura((s) => s.settings);
  const { setTheme, updateSettings, setDailyTarget, upsertPreset, deletePreset, exportData, importData } = useAura();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFocus, setNewFocus] = useState(25);
  const [newBreak, setNewBreak] = useState(5);

  const doExport = () => {
    const bundle = exportData();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const bundle = JSON.parse(await file.text()) as ExportBundle;
      importData(bundle);
      setImportMsg(`Imported ${bundle.subjects.length} subjects and ${bundle.sessions?.length ?? 0} sessions.`);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "That file couldn't be imported.");
    }
  };

  return (
    <div>
      <PageTitle outline="Settings" italic="make it yours" kicker="aura" />

      {/* theme */}
      <SectionHeading kicker="nine papers, nine weathers">Theme</SectionHeading>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => {
          const active = settings.theme === t.id;
          return (
            <motion.button
              key={t.id}
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(t.id)}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="relative overflow-hidden rounded-2xl px-4 py-4 text-left"
              style={{
                background: t.swatch.paper,
                border: active ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
                boxShadow: active ? "var(--shadow-soft)" : undefined,
              }}
            >
              <span
                className="font-display block text-base italic"
                style={{ color: t.swatch.ink, fontVariationSettings: "'opsz' 100, 'SOFT' 80" }}
              >
                {t.label}
              </span>
              <span className="mt-2 flex items-center gap-1.5">
                {t.swatch.accents.map((c, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c, boxShadow: `0 0 6px ${c}66` }}
                  />
                ))}
                <span
                  className="ml-auto text-[0.6rem] uppercase tracking-[0.14em]"
                  style={{ color: t.swatch.ink, opacity: 0.55 }}
                >
                  {t.family}
                </span>
              </span>
              {active && (
                <motion.span
                  layoutId="theme-check"
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem]"
                  style={{ background: t.swatch.ink, color: t.swatch.paper }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* auto day/night */}
      <div className="mt-6 flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.autoTheme}
            onChange={(e) => updateSettings({ autoTheme: e.target.checked })}
            className="h-4 w-4 accent-current"
          />
          <span className="text-sm">
            Auto night shift — switch to a dark theme from 20:00 to 07:00
          </span>
        </label>
        {settings.autoTheme && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-wrap items-center gap-2 pl-7"
          >
            <span className="microlabel">evenings use</span>
            {DARK_THEMES.map((t) => (
              <PillButton
                key={t.id}
                size="sm"
                active={settings.nightTheme === t.id}
                onClick={() => updateSettings({ nightTheme: t.id })}
              >
                {t.label}
              </PillButton>
            ))}
          </motion.div>
        )}
      </div>

      {/* aura intensity */}
      <div className="mt-6 max-w-md">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="microlabel">background intensity</span>
          <span className="font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
            {Math.round((settings.auraIntensity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={20}
          max={130}
          step={5}
          value={Math.round((settings.auraIntensity ?? 1) * 100)}
          onChange={(e) => updateSettings({ auraIntensity: Number(e.target.value) / 100 })}
          aria-label="Background atmosphere intensity"
          className="w-full accent-current"
        />
      </div>

      {/* daily target — powers the Atelier reveal */}
      <SectionHeading kicker="the Atelier — study this much to reveal the day's piece">
        Daily target
      </SectionHeading>
      <div className="flex max-w-md items-end gap-4">
        <div className="w-20">
          <Field label="Hours">
            <NumberInput
              min={0}
              max={16}
              value={Math.floor(settings.dailyTargetMinutes / 60)}
              onChange={(e) =>
                setDailyTarget(
                  Math.max(0, Number(e.target.value) || 0) * 60 + (settings.dailyTargetMinutes % 60)
                )
              }
            />
          </Field>
        </div>
        <div className="w-20">
          <Field label="Minutes">
            <NumberInput
              min={0}
              max={59}
              value={settings.dailyTargetMinutes % 60}
              onChange={(e) =>
                setDailyTarget(
                  Math.floor(settings.dailyTargetMinutes / 60) * 60 +
                    Math.min(59, Math.max(0, Number(e.target.value) || 0))
                )
              }
            />
          </Field>
        </div>
        <p className="pb-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          Pieces already unlocked stay unlocked — raising the bar only affects new days.
        </p>
      </div>

      {/* quotes */}
      <SectionHeading kicker="after each focus block">Motivation</SectionHeading>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={settings.quotesEnabled}
          onChange={(e) => updateSettings({ quotesEnabled: e.target.checked })}
          className="h-4 w-4 accent-current"
        />
        <span className="text-sm">Show a quote when a focus block completes</span>
      </label>

      {/* presets */}
      <SectionHeading kicker="focus / break minutes">Timer presets</SectionHeading>
      <ul className="flex max-w-md flex-col gap-2">
        {settings.presets.map((p) => (
          <li
            key={p.id}
            className="group flex items-center gap-4 rounded-2xl px-4 py-3"
            style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--paper-raised) 75%, transparent)" }}
          >
            <span className="flex-1 text-sm">{p.name}</span>
            <span className="font-mono text-xs tabular" style={{ color: "var(--ink-soft)" }}>
              {p.focusMinutes} / {p.breakMinutes}
            </span>
            <button
              onClick={() => deletePreset(p.id)}
              aria-label={`Delete preset ${p.name}`}
              className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          upsertPreset({ id: newId(), name: newName.trim(), focusMinutes: newFocus, breakMinutes: newBreak });
          setNewName("");
        }}
        className="mt-4 flex max-w-md items-end gap-3"
      >
        <div className="flex-1">
          <Field label="Name">
            <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Marathon" />
          </Field>
        </div>
        <div className="w-16">
          <Field label="Focus">
            <NumberInput min={1} max={180} value={newFocus} onChange={(e) => setNewFocus(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </div>
        <div className="w-16">
          <Field label="Break">
            <NumberInput min={1} max={60} value={newBreak} onChange={(e) => setNewBreak(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </div>
        <PillButton size="sm" type="submit">
          Add
        </PillButton>
      </form>

      {/* data */}
      <SectionHeading kicker="the safety net">Your data</SectionHeading>
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={doExport}>Export JSON</PillButton>
        <PillButton tone="ghost" onClick={() => fileRef.current?.click()}>
          Import JSON
        </PillButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label="Import Aura JSON export"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = "";
          }}
        />
      </div>
      {importMsg && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          {importMsg}
        </motion.p>
      )}
      <p className="mt-4 max-w-md text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        Everything lives on this device (IndexedDB). Export regularly if this
        history matters to you — importing a file replaces what&rsquo;s here.
      </p>
    </div>
  );
}
