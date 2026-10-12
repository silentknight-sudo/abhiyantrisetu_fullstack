import { describe, expect, it } from 'vitest';
import { colors, cssStylesheet, palette, tailwindPreset } from '../src';

describe('tokens', () => {
  it('keeps the brand colours', () => {
    expect(palette.navy[600]).toBe('#1A3A52');
    expect(palette.orange[400]).toBe('#FF9F43');
    expect(colors.light.primary).toBe('#1A3A52');
  });

  it('defines every semantic colour in both schemes', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });

  it('emits light, dark-preference and forced-dark CSS', () => {
    const css = cssStylesheet();
    expect(css).toContain('--setu-primary: #1A3A52;');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root[data-theme='dark']");
  });

  it('maps semantic colours to CSS variables in the Tailwind preset', () => {
    const c = tailwindPreset.theme.extend.colors as Record<string, unknown>;
    expect(c['primary']).toBe('var(--setu-primary)');
    expect(c['text-muted']).toBe('var(--setu-text-muted)');
  });
});
