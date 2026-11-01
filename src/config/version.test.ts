import { describe, expect, it } from 'vitest';
import { formatVersionLabel } from './version';

describe('formatVersionLabel', () => {
  it('shows only the version when no commit is available', () => {
    expect(formatVersionLabel('0.1.0')).toBe('v0.1.0');
    expect(formatVersionLabel('0.1.0', '')).toBe('v0.1.0');
  });

  it('uses the first 7 characters of the commit', () => {
    expect(formatVersionLabel('0.1.0', 'a1b2c3d4e5f6')).toBe('v0.1.0 · a1b2c3d');
  });

  it('trims whitespace around the commit', () => {
    expect(formatVersionLabel('0.2.0', '  abc1234  ')).toBe('v0.2.0 · abc1234');
  });
});
