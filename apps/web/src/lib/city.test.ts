import { describe, expect, it } from 'vitest';
import {
  createCityModel,
  inferLanguage,
  parseRepositoryInput,
  sizeToHeight,
  type RepositorySnapshot,
} from './city';

const snapshot: RepositorySnapshot = {
  owner: 'leoo1992',
  repo: 'demo',
  defaultBranch: 'main',
  description: 'Demo',
  stars: 2,
  forks: 1,
  url: 'https://github.com/leoo1992/demo',
  files: [
    { path: 'src/app/page.tsx', size: 2200 },
    { path: 'src/app/layout.tsx', size: 1200 },
    { path: 'src/styles.css', size: 800 },
    { path: 'README.md', size: 500 },
  ],
};

describe('DevCity city generator', () => {
  it('parses GitHub URLs and slugs', () => {
    expect(parseRepositoryInput('https://github.com/leoo1992/DevCity.git').slug)
      .toBe('leoo1992/DevCity');
    expect(parseRepositoryInput('vercel/next.js').owner).toBe('vercel');
  });

  it('infers common languages', () => {
    expect(inferLanguage('src/page.tsx')).toBe('TSX');
    expect(inferLanguage('database/query.sql')).toBe('SQL');
    expect(inferLanguage('README.md')).toBe('Markdown');
  });

  it('creates deterministic districts and buildings', () => {
    const first = createCityModel(snapshot);
    const second = createCityModel(snapshot);

    expect(first.districts.map((district) => district.name))
      .toEqual(['root', 'src']);
    expect(first.buildings).toEqual(second.buildings);
  });

  it('makes larger files taller', () => {
    expect(sizeToHeight(10000)).toBeGreaterThan(sizeToHeight(100));
  });

  it('respects the render cap while keeping total stats', () => {
    const model = createCityModel(snapshot, 2);

    expect(model.renderedFiles).toBe(2);
    expect(model.totalFiles).toBe(4);
  });
});
