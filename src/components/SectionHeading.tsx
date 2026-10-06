import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Kleiner Bernsteinkicker über der Headline */
  eyebrow: string;
  /** Große Display-Headline */
  title: string;
  /** Optionaler einleitender Absatz */
  lead?: string;
  className?: string;
}

/** Konsistenter View-Kopf: Amber-Kicker, Display-Headline, optionaler Lead. */
export default function SectionHeading({ eyebrow, title, lead, className }: SectionHeadingProps) {
  return (
    <header className={cn("max-w-2xl", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber">{eyebrow}</p>
      <h2 className="font-display mt-3 text-3xl leading-[1.12] text-ink sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{lead}</p>
      ) : null}
    </header>
  );
}
