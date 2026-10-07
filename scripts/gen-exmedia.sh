#!/bin/bash
# Batch-Generierung der Übungsmedien (Lexikon) — ruhig, dunkel-warm, abstract-anatomisch.
PLUGIN="/Users/raki/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/video_generation"
OUT="/Users/raki/Documents/Kimi/Workspaces/TRAUMAATLAS/traumaatlas-3/src/assets/gen/exmedia"
mkdir -p "$OUT"
cd "$PLUGIN" || exit 1

gen() {
  local id="$1"; shift
  local desc="$1"; shift
  if [ -s "$OUT/$id.mp4" ]; then echo "SKIP $id"; return; fi
  echo "GEN $id ..."
  python3 scripts/video_generation_tool.py generate \
    --description "$desc" --ratio 16:9 --resolution 480p --duration 5 \
    --output "$OUT/$id.mp4" 2>&1 | tail -1
  sleep 2
}

gen "sos-ausatmen" "A soft luminous sphere slowly expands and contracts in dark warm mist, breathing rhythm, quick double inhale then long slow exhale visible as gently fading glow, amber light on deep dark background, abstract, meditative, no text"
gen "sos-orientieren" "A soft warm light beam slowly pans across a dark contemplative space like a gentle head turning to look around, amber highlights in deep shadows, slow meditative drift, abstract, no text"
gen "voo" "Concentric ripples of warm amber light pulsing outward from a center point through dark silky water, low gentle vibration waves, abstract anatomical resonance, slow and deeply calm, no text"
gen "schuetteln" "A soft fabric-like dark silhouette gently trembles and then releases tension, warm amber light shimmering through folds, slowly calming into stillness, abstract, dark warm palette, no text"
gen "sicherer-ort" "A small glowing sanctuary of warm candle-like light sheltered inside a dark protective dome, slow breathing glow, amber tones, abstract minimal landscape, deeply safe and calm, no text"
gen "koerperscan" "A slow warm band of light sweeps downward along a dark abstract human silhouette from head to feet, gentle gradient glow, amber light on deep dark background, meditative anatomical abstraction, no text"
gen "pendeln" "A small soft glowing point slowly swings back and forth like a pendulum between a warm amber light and a cooler dim light, dark abstract space, gentle calming rhythm, no text"
gen "aktivieren" "Warm amber light rays slowly rising and awakening through dark blue-grey stillness, gentle sparks of golden energy ascending, abstract body waking from freeze, hopeful dark warm mood, no text"
gen "abend" "A warm amber sun slowly sinks below a dark horizon line, afterglow gently dimming into deep indigo night, abstract minimal landscape, breathing darkness, deeply calming, no text"
gen "selbstberuehrung" "Two soft warm light surfaces gently approach and overlap in dark space, slow comforting contact glow, amber and soft rose tones, abstract tenderness, calm, no text"
gen "co-regulation" "Two glowing orbs slowly orbit each other in a shared rhythm inside dark warm space, softly synchronized pulsing light, amber and muted rose, abstract connection, deeply calm, no text"

echo "BATCH DONE"; ls -la "$OUT"
