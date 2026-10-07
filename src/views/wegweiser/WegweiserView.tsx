import { useState } from "react";
import { ExternalLink, Phone, Siren } from "lucide-react";
import { resourceGroups } from "@/data/resources";
import { CHAPTERS } from "@/views/chapters";

const chapter = CHAPTERS[8];

/** Wegweiser als volle Bühne: Akut-Bake oben, darunter alle Wege als durchgehende,
    ruhig gegliederte Fläche — ohne Karte, ohne Tabs, alles sichtbar. */
export default function WegweiserView() {
  const [activeGroup, setActiveGroup] = useState(resourceGroups[0].id);

  const jumpTo = (id: string) => {
    setActiveGroup(id);
    document.getElementById(`wg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <p className="mb-8 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Alles liegt offen auf der Bühne — von der Akut-Nummer bis zum
        Kostenerstattungsverfahren, ohne dass Sie suchen müssen.
      </p>

      {/* Akut-Bake: prominent, rein typografisch */}
      <section aria-label="Akute Hilfe" className="relative overflow-hidden rounded-3xl border border-[#e2a35c]/40 bg-gradient-to-br from-[#1c1207] to-[#0e0b08] p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(226,163,92,0.22), transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
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
          <div className="flex shrink-0 flex-col gap-3">
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
      </section>

      {/* Gruppen-Sprungnavigation */}
      <nav
        aria-label="Hilfsangebote — Kategorien"
        className="scrollbar-thin sticky top-0 z-10 -mx-1 mt-8 flex gap-1.5 overflow-x-auto bg-[#0b0806]/85 px-1 py-3 backdrop-blur-md"
      >
        {resourceGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => jumpTo(g.id)}
            aria-current={activeGroup === g.id ? "true" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs transition-colors ${
              activeGroup === g.id
                ? "border-[#8fd8cf]/50 bg-[#8fd8cf]/[0.08] text-[#8fd8cf]"
                : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/85"
            }`}
          >
            {g.title}
          </button>
        ))}
      </nav>

      {/* Alle Gruppen als durchgehende Fläche */}
      <div className="mt-4 space-y-12">
        {resourceGroups.map((g) => (
          <section key={g.id} id={`wg-${g.id}`} aria-label={g.title} className="scroll-mt-28">
            <header className="mb-4 border-b border-white/[0.07] pb-3">
              <h2 className="font-display text-2xl text-[#f3e7d3]">{g.title}</h2>
              <p className="mt-1 text-sm text-white/45">{g.subtitle}</p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass group rounded-2xl p-5 transition-all hover:border-[#8fd8cf]/30"
                  style={{ backgroundImage: "linear-gradient(160deg, rgba(143,216,207,0.03), transparent 60%)" }}
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
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
