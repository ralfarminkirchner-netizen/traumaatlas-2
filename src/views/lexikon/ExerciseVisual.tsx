// Animierte Bewegungs-Illustrationen für die 12 Übungen (SVG + CSS, reduced-motion-sicher).
import type { ReactNode } from "react";

export const EFFECT_COLOR = { hyper: "#e2a35c", hypo: "#8b93c9", both: "#7fb8a4" } as const;

const KF = `
@keyframes ex-pulse { 0%,100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.25); opacity: 1 } }
@keyframes ex-breathe { 0% { transform: scale(.72) } 38% { transform: scale(1.12) } 100% { transform: scale(.72) } }
@keyframes ex-sweep { 0%,100% { transform: translateX(-26px) } 50% { transform: translateX(26px) } }
@keyframes ex-ripple { 0% { transform: scale(.35); opacity: .9 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes ex-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-3px) } 40% { transform: translateX(3px) } 60% { transform: translateX(-2px) } 80% { transform: translateX(2px) } }
@keyframes ex-scan { 0% { transform: translateY(0); opacity: 0 } 8% { opacity: .9 } 92% { opacity: .9 } 100% { transform: translateY(48px); opacity: 0 } }
@keyframes ex-pendel { 0%,100% { transform: translateX(-30px) } 50% { transform: translateX(30px) } }
@keyframes ex-rise { 0% { transform: translateY(8px); opacity: 0 } 25% { opacity: 1 } 100% { transform: translateY(-14px); opacity: 0 } }
@keyframes ex-set { 0% { transform: translateY(-6px) } 55% { transform: translateY(10px) } 100% { transform: translateY(10px) } }
@keyframes ex-converge { 0%,100% { transform: translateX(0) } 50% { transform: translateX(var(--cx)) } }
@keyframes ex-orbit { from { transform: rotate(0) translateX(18px) } to { transform: rotate(360deg) translateX(18px) } }
@keyframes ex-orbit2 { from { transform: rotate(180deg) translateX(18px) } to { transform: rotate(540deg) translateX(18px) } }
@keyframes ex-seq { 0%,18%,100% { opacity: .25 } 6% { opacity: 1 } }
@keyframes ex-dim { 0%,55% { opacity: .9 } 100% { opacity: .25 } }
@media (prefers-reduced-motion: reduce) { .ex-anim * { animation: none !important } }
`;

interface VisProps { color: string; large?: boolean }

function Svg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 120 80" className="ex-anim h-full w-full" role="img" aria-label={label}>
      <style>{KF}</style>
      {children}
    </svg>
  );
}

const V: Record<string, (p: VisProps) => ReactNode> = {
  // 5-4-3-2-1-Erdung: fünf Sinne nacheinander
  "sos-54321": ({ color }) => (
    <Svg label="Fünf Punkte leuchten nacheinander auf — die fünf Sinne">
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={16 + i * 22} cy="40" r="6" fill={color} style={{ animation: `ex-seq 5s ${i * 1}s infinite` }} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <text key={i} x={16 + i * 22} y="62" textAnchor="middle" fontSize="9" fill={color} style={{ animation: `ex-seq 5s ${i * 1}s infinite` }}>
          {5 - i}
        </text>
      ))}
    </Svg>
  ),
  // Physiologischer Seufzer: einatmen, lang ausatmen
  "sos-ausatmen": ({ color }) => (
    <Svg label="Kreis atmet auf und läuft langsam ab — Doppel-Einatmen, lang Ausatmen">
      <circle cx="60" cy="40" r="22" fill="none" stroke={color} strokeWidth="2" style={{ animation: "ex-breathe 6s ease-in-out infinite", transformOrigin: "60px 40px" }} />
      <circle cx="60" cy="40" r="10" fill={color} fillOpacity="0.25" style={{ animation: "ex-breathe 6s ease-in-out infinite", transformOrigin: "60px 40px" }} />
    </Svg>
  ),
  // Orientierungsreflex: Blick schweift
  "sos-orientieren": ({ color }) => (
    <Svg label="Ein Punkt schweift links-rechts — der Orientierungsreflex weckt sich">
      <path d="M30 40 Q60 18 90 40 Q60 62 30 40 Z" fill="none" stroke={color} strokeWidth="1.6" strokeOpacity="0.5" />
      <circle cx="60" cy="40" r="4.5" fill={color} style={{ animation: "ex-sweep 3.2s ease-in-out infinite" }} />
    </Svg>
  ),
  // Voo-Klang: Vibration breitet sich aus
  voo: ({ color }) => (
    <Svg label="Wellenringe vibrieren vom Zentrum — der Voo-Klang massiert den Vagus">
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="60" cy="40" r="20" fill="none" stroke={color} strokeWidth="1.8" style={{ animation: `ex-ripple 2.4s ${i * 0.8}s ease-out infinite`, transformOrigin: "60px 40px" }} />
      ))}
      <circle cx="60" cy="40" r="7" fill={color} />
    </Svg>
  ),
  // Abschütteln: Zittern
  schuetteln: ({ color }) => (
    <Svg label="Eine Welle zittert — Stressenergie wird abgeschüttelt">
      <g style={{ animation: "ex-shake 0.5s linear infinite" }}>
        <path d="M14 40 L30 30 L44 50 L58 28 L72 52 L86 32 L106 42" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </Svg>
  ),
  // Innerer sicherer Ort: schützende Kuppel
  "sicherer-ort": ({ color }) => (
    <Svg label="Eine Kuppel ruht über einem leuchtenden Ort — innerer sicherer Ort">
      <path d="M30 58 A30 30 0 0 1 90 58 Z" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.8" />
      <circle cx="60" cy="52" r="7" fill={color} style={{ animation: "ex-pulse 3.4s ease-in-out infinite", transformOrigin: "60px 52px" }} />
      <line x1="14" y1="58" x2="106" y2="58" stroke={color} strokeWidth="1.4" strokeOpacity="0.5" />
    </Svg>
  ),
  // Körperscan: Aufmerksamkeit wandert
  koerperscan: ({ color }) => (
    <Svg label="Ein Lichtstrich wandert den Körper hinab — der innere Beobachter">
      <ellipse cx="60" cy="18" rx="9" ry="10" fill="none" stroke={color} strokeWidth="1.6" strokeOpacity="0.6" />
      <rect x="48" y="30" width="24" height="30" rx="9" fill="none" stroke={color} strokeWidth="1.6" strokeOpacity="0.6" />
      <path d="M52 60 L50 74 M68 60 L70 74" stroke={color} strokeWidth="1.6" strokeOpacity="0.6" strokeLinecap="round" />
      <g style={{ animation: "ex-scan 5s ease-in-out infinite" }}>
        <rect x="42" y="6" width="36" height="3" rx="1.5" fill={color} />
      </g>
    </Svg>
  ),
  // Pendeln: hin und her zwischen Belastung und Ressource
  pendeln: ({ color }) => (
    <Svg label="Ein Punkt pendelt zwischen Belastung und Ressource">
      <circle cx="26" cy="40" r="10" fill="#c98a8a" fillOpacity="0.5" />
      <circle cx="94" cy="40" r="10" fill={color} fillOpacity="0.6" />
      <line x1="36" y1="40" x2="84" y2="40" stroke={color} strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.5" />
      <circle cx="60" cy="40" r="5" fill="#f3e7d3" style={{ animation: "ex-pendel 3s ease-in-out infinite" }} />
    </Svg>
  ),
  // Aktivieren: Energie steigt
  aktivieren: ({ color }) => (
    <Svg label="Pfeile steigen auf — der Körper wird bei Erstarrung aktiviert">
      {[0, 1, 2].map((i) => (
        <g key={i} style={{ animation: `ex-rise 1.8s ${i * 0.6}s ease-out infinite` }}>
          <path d={`M${38 + i * 22} 52 l0 -14 m-5 6 l5 -7 l5 7`} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <line x1="24" y1="58" x2="96" y2="58" stroke={color} strokeWidth="1.4" strokeOpacity="0.5" strokeLinecap="round" />
    </Svg>
  ),
  // Abend: die Sonne geht unter, das Licht dämmt
  abend: ({ color }) => (
    <Svg label="Die Sonne sinkt hinter den Horizont — der Tag wird heruntergefahren">
      <line x1="14" y1="52" x2="106" y2="52" stroke={color} strokeWidth="1.6" strokeOpacity="0.5" />
      <g style={{ animation: "ex-set 6s ease-in-out infinite" }}>
        <circle cx="60" cy="46" r="11" fill={color} style={{ animation: "ex-dim 6s ease-in-out infinite" }} />
      </g>
      <path d="M14 52 Q60 42 106 52" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.35" />
    </Svg>
  ),
  // Selbstberührung: Hände finden sich
  selbstberuehrung: ({ color }) => (
    <Svg label="Zwei Kreise nähern sich dem Zentrum — selbstberuhigende Berührung">
      <circle cx="60" cy="40" r="12" fill="none" stroke={color} strokeWidth="1.6" strokeOpacity="0.6" />
      <circle cx="34" cy="40" r="8" fill={color} style={{ animation: "ex-converge 3.6s ease-in-out infinite", ["--cx" as never]: "19px" }} />
      <circle cx="86" cy="40" r="8" fill={color} style={{ animation: "ex-converge 3.6s ease-in-out infinite", ["--cx" as never]: "-19px" }} />
    </Svg>
  ),
  // Co-Regulation: zwei Systeme im gemeinsamen Rhythmus
  "co-regulation": ({ color }) => (
    <Svg label="Zwei Orbits kreisen umeinander — Co-Regulation im gemeinsamen Rhythmus">
      <circle cx="60" cy="40" r="3" fill={color} fillOpacity="0.7" />
      <circle cx="60" cy="40" r="7" fill={color} style={{ animation: "ex-orbit 4s linear infinite", transformOrigin: "60px 40px" }} />
      <circle cx="60" cy="40" r="7" fill="#c9a0a8" style={{ animation: "ex-orbit2 4s linear infinite", transformOrigin: "60px 40px" }} />
    </Svg>
  ),
};

/** Bewegte Illustration je Übung. */
export function ExerciseVisual({ id, effect, large }: { id: string; effect: keyof typeof EFFECT_COLOR; large?: boolean }) {
  const render = V[id];
  const color = EFFECT_COLOR[effect];
  if (!render) return null;
  return (
    <div className={large ? "h-32 w-full" : "h-20 w-full"} style={{ opacity: 0.95 }}>
      {render({ color, large })}
    </div>
  );
}
