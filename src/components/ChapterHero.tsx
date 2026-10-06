import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface ChapterHeroProps {
  art: string;
  kicker: string;
  title: string;
  sub: string;
  index: string;
  children?: ReactNode;
  /** Wenn true, bleibt das Artwork statisch (reduced motion). */
  staticArt?: boolean;
}

/** Kapitel-Einstieg: Key Visual als Vollbild-Backdrop + Typo-Dramaturgie. */
export function ChapterHero({ art, kicker, title, sub, index, children, staticArt }: ChapterHeroProps) {
  const reduced = useReducedMotion();
  const still = staticArt ?? reduced;

  return (
    <header className={`chapter-hero ${still ? "" : ""}`}>
      <motion.div
        className="hero-art"
        style={{ backgroundImage: `url(${art})` }}
        initial={still ? false : { scale: 1.12, opacity: 0.4 }}
        animate={still ? { scale: 1.04, opacity: 1 } : { scale: 1.04, opacity: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className={`hero-veil ${still ? "hero-veil-static" : ""}`} />

      <div className="relative mx-auto flex min-h-[62vh] max-w-5xl flex-col justify-end px-5 pb-14 pt-32 sm:px-8">
        <motion.p
          initial={still ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#e2a35c]/90"
        >
          <span className="tabular-nums">{index}</span>
          <span className="h-px w-10 bg-[#e2a35c]/50" aria-hidden />
          {kicker}
        </motion.p>
        <motion.h1
          initial={still ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="font-display max-w-3xl text-4xl font-light leading-[1.06] text-[#f3e7d3] sm:text-6xl"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={still ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg"
        >
          {sub}
        </motion.p>
        {children && (
          <motion.div
            initial={still ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        )}
      </div>
      <div className="hairline-glow mx-auto max-w-5xl" />
    </header>
  );
}
