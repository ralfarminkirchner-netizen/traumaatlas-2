import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

/** Mobil-Erkennung für reduzierte 3D-Detailstufe und Layoutwechsel. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
