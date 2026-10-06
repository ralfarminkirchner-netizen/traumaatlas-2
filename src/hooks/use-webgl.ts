import { useMemo } from "react";

/** Erkennt, ob WebGL2 verfügbar ist (graceful degradation). */
export function webgl2Available(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

export function useWebGL2(): boolean {
  return useMemo(webgl2Available, []);
}
