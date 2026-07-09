import { useState, useEffect } from 'react';

export type Region = 'IN' | 'US' | 'UNKNOWN';

let cached: Region | null = null;

function detectFromBrowser(): Region {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') return 'IN';
  const lang = navigator.language || '';
  if (lang === 'en-IN' || lang.startsWith('hi') || lang.startsWith('ta') || lang.startsWith('te')) return 'IN';
  if (lang === 'en-US' || tz?.startsWith('America/')) return 'US';
  return 'UNKNOWN';
}

async function fetchRegion(): Promise<Region> {
  if (cached) return cached;
  const browser = detectFromBrowser();
  if (browser !== 'UNKNOWN') { cached = browser; return browser; }
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const json = await res.json();
    const cc: string = json?.country_code || '';
    cached = cc === 'IN' ? 'IN' : cc === 'US' ? 'US' : 'UNKNOWN';
  } catch {
    cached = 'UNKNOWN';
  }
  return cached!;
}

export function useRegion() {
  const [region, setRegion] = useState<Region>(() => cached ?? detectFromBrowser());

  useEffect(() => {
    if (cached) { setRegion(cached); return; }
    fetchRegion().then(setRegion);
  }, []);

  const isIndia = region === 'IN';
  const isUSA = region === 'US';

  return { region, isIndia, isUSA };
}
