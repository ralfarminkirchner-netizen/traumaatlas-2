// Übungs-Medien: generierte Video-Loops (ruhig, dunkel-warm, abstract-anatomisch)
// wo vorhanden; sonst die SVG-Schrittanimation als Ergänzung.
// reduced-motion: Video steht still und ist manuell abspielbar.

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ExerciseVisual, EFFECT_COLOR } from "./ExerciseVisual";

// Alle generierten Übungsvideos (Build-Zeit, eager)
const vids = import.meta.glob("@/assets/gen/exmedia/*.mp4", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function vidUrl(id: string): string | null {
  const key = Object.keys(vids).find((k) => k.endsWith(`/${id}.mp4`));
  return key ? (vids[key] as string) : null;
}

export function ExerciseMedia({ id, effect, large }: { id: string; effect: keyof typeof EFFECT_COLOR; large?: boolean }) {
  const reduced = useReducedMotion();
  const src = vidUrl(id);
  const color = EFFECT_COLOR[effect];

  if (src) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-white/[0.06] ${large ? "aspect-video" : "aspect-video"}`}
        style={{ boxShadow: `0 6px 30px rgba(0,0,0,0.45), 0 0 24px ${color}14` }}
      >
        <video
          src={src}
          className="h-full w-full object-cover"
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label={`Übungsmedium: ruhiger, dunkel-warmer abstrakter Licht-Loop`}
        />
      </div>
    );
  }
  return <ExerciseVisual id={id} effect={effect} large={large} />;
}
