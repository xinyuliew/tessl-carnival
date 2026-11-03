import { describe, expect, it } from 'vitest';
import { carnivalLink, REPO_URL, shareLinks } from './share';

describe('carnivalLink', () => {
  it('shares the carnival page without the game route or query', () => {
    expect(carnivalLink('https://ada.github.io/tessl-carnival/?x=1#/play/water-cannon')).toBe(
      'https://ada.github.io/tessl-carnival/',
    );
  });

  it('has nothing to share on a local or preview server', () => {
    expect(carnivalLink('http://localhost:5173/')).toBeUndefined();
    expect(carnivalLink('https://127.0.0.1:5173/')).toBeUndefined();
    expect(carnivalLink('https://ada-carnival-5173.app.github.dev/')).toBeUndefined();
  });
});

describe('REPO_URL', () => {
  it("points at this project's repository", () => {
    expect(REPO_URL).toBe('https://github.com/xinyuliew/tessl-carnival');
  });
});

describe('shareLinks', () => {
  it('puts the carnival link in both posts', () => {
    const links = shareLinks('https://ada.github.io/tessl-carnival/');
    const x = new URL(links.x);
    expect(x.hostname).toBe('x.com');
    expect(x.searchParams.get('url')).toBe('https://ada.github.io/tessl-carnival/');
    expect(x.searchParams.get('text')).toContain('Carnival Arcade');
    expect(x.searchParams.get('text')).not.toContain('@');
    expect(new URL(links.linkedIn).searchParams.get('url')).toBe(
      'https://ada.github.io/tessl-carnival/',
    );
  });
});
