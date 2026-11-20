// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyAQI } from '../../src/shared/aqi.ts';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractTailwindHex(classToken: string): string {
  const match = classToken.match(/#([0-9A-Fa-f]{6})/);
  if (!match) {
    throw new Error(`Expected hex color in Tailwind token "${classToken}"`);
  }
  return `#${match[1]}`;
}

describe('WCAG 2.2 AA Color Contrast Compliance (W3C Relative Luminance)', () => {
  it('meets >= 4.5:1 contrast for all core AIRWISE UI text and button color pairs', () => {
    const pairs: Array<{ name: string; fg: string; bg: string; minRatio: number }> = [
      { name: 'Primary ink on white surface', fg: '#111C18', bg: '#FFFFFF', minRatio: 4.5 },
      { name: 'Primary ink on canvas', fg: '#111C18', bg: '#F6F8F7', minRatio: 4.5 },
      { name: 'Secondary ink on white surface', fg: '#4A5B54', bg: '#FFFFFF', minRatio: 4.5 },
      { name: 'Secondary ink on canvas', fg: '#4A5B54', bg: '#F6F8F7', minRatio: 4.5 },
      { name: 'Muted metadata on white surface', fg: '#5E7068', bg: '#FFFFFF', minRatio: 4.5 },
      { name: 'Muted metadata on canvas', fg: '#5E7068', bg: '#F6F8F7', minRatio: 4.5 },
      { name: 'Forest primary button text', fg: '#FFFFFF', bg: '#11382B', minRatio: 4.5 },
      { name: 'Forest accent on mint tint', fg: '#11382B', bg: '#F2FAF6', minRatio: 4.5 },
      { name: 'Mint CTA button in onboarding hero', fg: '#0B261D', bg: '#6EE7B7', minRatio: 4.5 },
      { name: 'Hero subtitle on forest surface', fg: '#D1FAE5', bg: '#11382B', minRatio: 4.5 },
      { name: 'Hero kicker on forest surface', fg: '#A7F3D0', bg: '#11382B', minRatio: 4.5 },
      { name: 'Mint accent text on white', fg: '#1F7A5C', bg: '#FFFFFF', minRatio: 4.5 },
      { name: 'Error alert text on white', fg: '#991B1B', bg: '#FFFFFF', minRatio: 4.5 },
      { name: 'Safety warning text on red tint', fg: '#7F1D1D', bg: '#FEF2F2', minRatio: 4.5 },
      { name: 'Demo banner warning text on yellow tint', fg: '#854D0E', bg: '#FEFCE8', minRatio: 4.5 },
    ];

    for (const pair of pairs) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(
        ratio,
        `${pair.name} (${pair.fg} on ${pair.bg}) ratio=${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(pair.minRatio);
    }
  });

  it('meets >= 4.5:1 contrast for all 6 Indian CPCB and all 6 US EPA AQI category text/background tokens', () => {
    const cpcbSamples = [25, 75, 150, 250, 350, 450];
    const usEpaSamples = [25, 75, 125, 175, 250, 350];

    for (const aqi of cpcbSamples) {
      const cat = classifyAQI(aqi, 'INDIA_CPCB');
      const fg = extractTailwindHex(cat.textColorClass);
      const bg = extractTailwindHex(cat.bgTintClass);
      expect(
        contrastRatio(fg, '#FFFFFF'),
        `CPCB ${cat.label} text (${fg}) on white`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(fg, bg),
        `CPCB ${cat.label} text (${fg}) on tint (${bg})`
      ).toBeGreaterThanOrEqual(4.5);
    }

    for (const aqi of usEpaSamples) {
      const cat = classifyAQI(aqi, 'US_EPA');
      const fg = extractTailwindHex(cat.textColorClass);
      const bg = extractTailwindHex(cat.bgTintClass);
      expect(
        contrastRatio(fg, '#FFFFFF'),
        `US EPA ${cat.label} text (${fg}) on white`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(fg, bg),
        `US EPA ${cat.label} text (${fg}) on tint (${bg})`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
