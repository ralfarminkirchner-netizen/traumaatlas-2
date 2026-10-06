import { Info } from "lucide-react";

/** Globaler Disclaimer — in jedem analysierenden Bereich einbinden. */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className="glass-soft flex items-start gap-3 rounded-xl border-l-2 border-l-[#e2a35c]/50 px-4 py-3"
      role="note"
      aria-label="Wichtiger Hinweis"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#e2a35c]" aria-hidden />
      <p className={compact ? "text-xs leading-relaxed text-white/55" : "text-sm leading-relaxed text-white/65"}>
        Dieser Atlas dient der <strong className="text-white/85">Orientierung</strong> — er ersetzt keine Diagnose,
        keine Therapie und keine therapeutische Beziehung. Verdachtsmuster sind keine Diagnosen;
        nur Fachkräfte können nach einem ausführlichen Gespräch beurteilen, was zu Ihnen passt.
        Bei akuter Krise: <a className="text-[#e2a35c] underline underline-offset-2" href="tel:08001110111">0800 111 0 111</a> (rund um die Uhr) oder 112.
      </p>
    </aside>
  );
}
