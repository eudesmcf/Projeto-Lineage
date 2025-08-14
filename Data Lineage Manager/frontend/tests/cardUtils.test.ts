import { describe, it, expect } from 'vitest';
import { lighten, pickReadable, sanitizeSvg, buildSafeIconHtml, buildCardHtml } from '../src/utils/cardUtils';

describe('cardUtils', () => {
  it('lighten increases channel values', () => {
    const base = '#000000';
    const result = lighten(base, 20);
    expect(result).not.toBe(base);
    expect(/^#/.test(result)).toBe(true);
  });

  it('pickReadable chooses dark text for light bg', () => {
    expect(pickReadable('#ffffff')).toBe('#1F2937');
    expect(pickReadable('#000000')).toBe('#fff');
  });

  it('sanitizeSvg rejects empty or unsafe svg', () => {
    expect(sanitizeSvg('<svg></svg>').valid).toBe(false);
    expect(sanitizeSvg('<svg><script>alert(1)</script></svg>').valid).toBe(false);
    expect(sanitizeSvg('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>').valid).toBe(true);
  });

  it('buildSafeIconHtml falls back when invalid raw svg', () => {
    const html = buildSafeIconHtml('<svg></svg>', { categoria: 'Test' }, '#123456');
    expect(html).toMatch(/svg/);
  });

  it('buildCardHtml renders expanded state', () => {
    const html = buildCardHtml({
      showIcons: true,
      expanded: true,
      nome: 'Node A',
      second: 'Subtitle',
      code: 'SELECT 1',
      baseColor: '#336699',
      fg: '#fff',
      iconHtml: '<svg></svg>',
      id: 'n1',
      categoria: 'Cat'
    });
    expect(html).toContain('dlm-card');
    expect(html).toContain('is-expanded');
    expect(html).toContain('Node A');
  });
});
