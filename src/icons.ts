/** Original, consistent 24px line icons. No external artwork or icon runtime. */
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  hint: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 1v1H9v-1z"/>',
  star: '<path d="m12 2 3.1 6.4 7.1 1-5.1 5 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5.1-5 7.1-1z"/>',
  moon: '<path d="M20 15a8.5 8.5 0 0 1-11-11 8.5 8.5 0 1 0 11 11z"/>',
  leaf: '<path d="M5 19c-7-14 9-16 15-16 0 6-1 22-15 16zm0 0L15 9"/>',
  spark: '<path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/>',
  jewel: '<path d="m3 8 4-5h10l4 5-9 13zm0 0h18M7 3l5 18 5-18M7 3l5 5 5-5"/>',
  window: '<path d="M4 21V8a8 8 0 0 1 16 0v13zM12 1v20M4 10h16"/>',
  door: '<path d="M4 21V3h16v18M7 21V6h10v15M13 13h.1M2 21h20"/>',
  terrace: '<path d="M3 20h18M6 20v-5h15M11 15v-5h10M16 10V5h5M3 7V3h10M7 3v8"/>',
  planter: '<path d="m6 14 2 8h8l2-8zM5 14h14M12 14V8M12 9C4 9 5 2 5 2c7 0 7 7 7 7zm0 1c0-7 7-7 7-7s1 7-7 7z"/>',
  bench: '<path d="M3 8h18v6H3zM2 17h20M5 17v5M19 17v5M5 4v4M19 4v4"/>',
  clock: '<path d="M5 22h14l-1-3V3l-6-2-6 2v16z"/><circle cx="12" cy="8" r="3"/><path d="M12 6v2l1 1m-1 5v5"/>',
  pedestal: '<path d="M4 22h16M6 22V12h12v10M4 12h16M9 9 7 5l5-3 5 3-2 4z"/>',
  fabric: '<path d="m6 3 7-1 5 14-5 3zM7 6 7 22l5-1M14 19l1 3m1-4 1 3m1-4 1 3"/>',
  tread: '<path d="M7 3c3-2 7-1 7 3l-1 8H5L4 7c0-2 1-3 3-4zm-2 14h8v4H5z"/><path d="M7 6h4M7 9h4"/>',
  dots: '<circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>',
  zigzag: '<path d="m3 6 4 4 5-4 5 4 4-4M3 14l4 4 5-4 5 4 4-4"/>',
  bars: '<path d="M5 6h14M5 12h14M5 18h14"/>',
  charm: '<circle cx="12" cy="4" r="2"/><path d="m12 7 3 4 5 1-4 4v5l-4-2-4 2v-5l-4-4 5-1z"/>',
  mask: '<path d="M2 8c5 1 5-2 10 0 5-2 5 1 10 0v4c-1 7-7 6-10 2-3 4-9 5-10-2z"/><path d="M5 11h3m8 0h3"/>',
  medal: '<circle cx="12" cy="9" r="7"/><path d="m7 15-2 7 7-3 7 3-2-7"/>',
  sunbird: '<path d="M4 18c1-4 0-7 4-9L7 3l6 5c5-4 8-1 7 3l-3 1c-1 6-6 9-13 6zm1-1 8-4M15 7l4 1"/>',
  pear: '<path d="M12 6c-5 0-3 4-6 7-5 6 8 11 12 5 3-5-3-6-3-9 0-2-1-3-3-3zm0 0V2m0 3c1-4 5-4 5-4s0 4-5 4z"/>',
  teapot: '<path d="M5 10h12c0 6-1 9-6 9s-6-3-6-9zm3-3h6M11 4v3M5 12 2 8v8l4 1M17 11c8-4 8 5 0 5M7 21h8"/>',
  comet: '<circle cx="9" cy="15" r="6"/><path d="m10 9 8-7M15 13l7-8M17 17l5-4M7 13l1 4 4-1"/>',
  shell: '<path d="M4 5c-7 7 1 13 8 17 7-4 15-10 8-17-4-4-7 0-8 0s-4-4-8 0zM6 7l6 15m0-15v15m6-15-6 15"/>',
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName, className = ''): string {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
export function relicIcon(id: string): string {
  const names: Record<string, IconName> = { moonstone: 'jewel', sunbird: 'sunbird', pear: 'pear', teapot: 'teapot', comet: 'comet', shell: 'shell' };
  return icon(names[id] ?? 'jewel');
}
