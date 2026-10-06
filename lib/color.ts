/** Utilidades de contraste (WCAG 2.x) para los colores de cada tenant. */
function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Texto blanco o casi negro, el que mejor contraste tenga sobre `bg`. */
export function readableOn(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#1a1a1a") ? "#ffffff" : "#1a1a1a";
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Oscurece `hex` hasta alcanzar `ratio` contra `bg` (para usar el color de marca como texto). */
export function ensureContrast(hex: string, bg = "#ffffff", ratio = 4.5): string {
  let rgb = channels(hex);
  for (let i = 0; i < 20 && contrastRatio(toHex(rgb), bg) < ratio; i++) {
    rgb = rgb.map((c) => c * 0.88) as [number, number, number];
  }
  return toHex(rgb);
}

export function tenantCssVars(colors: { primary: string; accent: string }): Record<string, string> {
  return {
    "--primary": colors.primary,
    "--on-primary": readableOn(colors.primary),
    "--primary-ink": ensureContrast(colors.primary),
    "--accent": colors.accent,
    "--on-accent": readableOn(colors.accent),
  };
}
