import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Phone, Siren } from "lucide-react";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { resourceGroups, type ResourceGroup } from "@/data/resources";
import { CHAPTERS } from "@/views/chapters";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import kvWegweiser from "@/assets/kv-wegweiser.jpg";

const chapter = CHAPTERS[8];

/** Ruhige Karten-Ästhetik mit Orts-Visuals — die Akut-Karte steht prominent. */
export default function WegweiserView() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<ResourceGroup>(resourceGroups[0]);

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      {/* Akut-Karte: prominent */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8" aria-label="Akute Hilfe">
        <div className="relative overflow-hidden rounded-3xl border border-[#e2a35c]/40 bg-gradient-to-br from-[#1c1207] to-[#0e0b08] p-8 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{ backgroundImage: `url(${kvWegweiser})`, backgroundSize: "cover", backgroundPosition: "center" }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#e2a35c]">
                <Siren className="h-4 w-4" aria-hidden /> Wenn es gerade brennt
              </p>
              <h2 className="font-display mt-3 text-3xl text-[#f5ead6]">Sie müssen das nicht allein tragen.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
                Die Telefonseelsorge ist rund um die Uhr erreichbar — anonym, kostenfrei, ohne Anmeldung.
                Auch dann anrufen, wenn es „nicht schlimm genug" erscheint.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="tel:08001110111"
                className="flex items-center justify-center gap-2 rounded-full bg-[#e2a35c] px-8 py-3.5 text-lg font-bold text-[#241505] shadow-[0_0_50px_rgba(226,163,92,0.4)] transition-shadow hover:shadow-[0_0_70px_rgba(226,163,92,0.6)]"
              >
                <Phone className="h-5 w-5" aria-hidden /> 0800 111 0 111
              </a>
              <a
                href="tel:08001110222"
                className="flex items-center justify-center gap-2 rounded-full border border-[#e2a35c]/40 px-8 py-2.5 text-sm font-semibold text-[#e8c9a0] hover:bg-[#e2a35c]/10"
              >
                0800 111 0 222
              </a>
              <p className="text-center text-xs text-white/45">Notfall: 112 · Gewalt-Hotline: 116 016</p>
            </div>
          </div>
        </div>
      </section>

      {/* Verzeichnis-Karten */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Hilfsangebote und Verzeichnisse">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Gruppen-Navigation */}
          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin lg:flex-col lg:overflow-visible" aria-label="Kategorien">
            {resourceGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActive(g)}
                aria-current={active.id === g.id ? "true" : undefined}
                className={`min-w-[220px] rounded-2xl border p-4 text-left transition-all lg:min-w-0 ${
                  active.id === g.id
                    ? "border-[#8fd8cf]/40 bg-[#8fd8cf]/[0.06]"
                    : "border-white/[0.08] hover:bg-white/[0.03]"
                }`}
              >
                <span className={`font-display text-base ${active.id === g.id ? "text-[#8fd8cf]" : "text-[#f3e7d3]"}`}>
                  {g.title}
                </span>
                <span className="mt-1 block text-xs leading-snug text-white/40">{g.subtitle}</span>
              </button>
            ))}
          </nav>

          {/* Karten */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="grid gap-3 sm:grid-cols-2"
            >
              {active.items.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass group rounded-2xl p-5 transition-all hover:border-[#8fd8cf]/30"
                  style={{ backgroundImage: `linear-gradient(160deg, rgba(143,216,207,0.03), transparent 60%)` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg leading-snug text-[#f3e7d3] group-hover:text-[#8fd8cf]">{item.name}</h3>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-[#8fd8cf]" aria-hidden />
                  </div>
                  <span className="edge-chip mt-2 text-white/50">{item.type}</span>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{item.what}</p>
                  {item.note && <p className="mt-2 text-xs italic text-[#e8c9a0]/80">{item.note}</p>}
                </a>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
