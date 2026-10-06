import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Siren, X } from "lucide-react";

/** Akut-Leiste: global sichtbar, dezent, jederzeit aufklappbar. */
export function AkutBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0e0b08]/85 px-4 py-1.5 backdrop-blur-md">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-[12px] tracking-wide text-[#e8c9a0]/90 transition-colors hover:text-[#e2a35c]"
        >
          <Siren className="h-3.5 w-3.5 text-[#e2a35c]" aria-hidden />
          <span className="font-medium">Akut hilfe nötig?</span>
          <span className="hidden text-white/40 sm:inline">Telefonseelsorge 0800 111 0 111 · rund um die Uhr, kostenfrei</span>
        </button>
        <a
          href="tel:08001110111"
          className="flex items-center gap-1.5 rounded-full border border-[#e2a35c]/40 bg-[#e2a35c]/10 px-3 py-1 text-[12px] font-semibold text-[#e2a35c] transition-colors hover:bg-[#e2a35c]/20"
        >
          <Phone className="h-3 w-3" aria-hidden /> 0800 111 0 111
        </a>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="border-b border-white/10 bg-[#14100b]/95 backdrop-blur-xl"
            role="alertdialog"
            aria-label="Akute Hilfe"
          >
            <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4 sm:grid-cols-3">
              <div className="glass-soft rounded-xl p-4">
                <p className="font-display text-lg text-[#e2a35c]">Telefonseelsorge</p>
                <p className="mt-1 text-sm text-white/70">0800 111 0 111 · 0800 111 0 222</p>
                <p className="mt-1 text-xs text-white/45">Kostenfrei, rund um die Uhr, anonym. Auch Chat und Mail.</p>
              </div>
              <div className="glass-soft rounded-xl p-4">
                <p className="font-display text-lg text-[#8fd8cf]">Hilfetelefon Gewalt</p>
                <p className="mt-1 text-sm text-white/70">116 016</p>
                <p className="mt-1 text-xs text-white/45">Bei häuslicher und sexualisierter Gewalt — mehrsprachig.</p>
              </div>
              <div className="glass-soft rounded-xl p-4">
                <p className="font-display text-lg text-[#c98a8a]">Notfall</p>
                <p className="mt-1 text-sm text-white/70">112 · Notaufnahme</p>
                <p className="mt-1 text-xs text-white/45">Bei akuter Selbst- oder Fremdgefährdung sofort anrufen.</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-12 rounded-full p-1.5 text-white/50 hover:text-white"
              aria-label="Akut-Hilfe schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
