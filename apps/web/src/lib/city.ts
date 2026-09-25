export interface RepositoryFile {
  path: string;
  size: number;
  sha?: string;
}

export interface RepositorySnapshot {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  forks: number;
  url: string;
  files: RepositoryFile[];
  truncated?: boolean;
}

export type CityColorMode = 'language' | 'size';

export interface CityBuilding {
  id: string;
  path: string;
  name: string;
  district: string;
  extension: string;
  language: string;
  color: string;
  size: number;
  position: [number, number, number];
  dimensions: [number, number, number];
}

export interface CityDistrict {
  id: string;
  name: string;
  center: [number, number, number];
  width: number;
  depth: number;
  buildings: CityBuilding[];
}

export interface CityModel {
  districts: CityDistrict[];
  buildings: CityBuilding[];
  languages: Array<{ language: string; count: number; color: string }>;
  totalBytes: number;
  renderedFiles: number;
  totalFiles: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4f8cff',
  JavaScript: '#f7d84a',
  TSX: '#61dafb',
  JSX: '#7cc7ff',
  CSS: '#ff69b4',
  HTML: '#ff7b54',
  JSON: '#9aa2ad',
  Markdown: '#a99cff',
  Python: '#50c878',
  Java: '#ff6b4a',
  SQL: '#47e1d2',
  'PL/SQL': '#40c9b0',
  YAML: '#ff8ca1',
  Shell: '#b5ff55',
  Other: '#87909f',
};

const languageByExtension: Record<string, string> = {
  ts: 'TypeScript',
  mts: 'TypeScript',
  cts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  jsx: 'JSX',
  css: 'CSS',
  scss: 'CSS',
  sass: 'CSS',
  less: 'CSS',
  html: 'HTML',
  htm: 'HTML',
  json: 'JSON',
  md: 'Markdown',
  mdx: 'Markdown',
  py: 'Python',
  java: 'Java',
  sql: 'SQL',
  pks: 'PL/SQL',
  pkb: 'PL/SQL',
  yml: 'YAML',
  yaml: 'YAML',
  sh: 'Shell',
  bash: 'Shell',
};

export function parseRepositoryInput(input: string) {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const [owner, repo] = cleaned.split('/');

  if (!owner || !repo || cleaned.split('/').length !== 2) {
    throw new Error('Use owner/repository ou uma URL válida do GitHub.');
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error('O nome do repositório contém caracteres inválidos.');
  }

  return { owner, repo, slug: owner + '/' + repo };
}

export function inferLanguage(path: string) {
  const filename = path.split('/').pop() ?? path;
  const extension = filename.includes('.')
    ? filename.split('.').pop()!.toLowerCase()
    : '';

  if (/\.module\.css$/i.test(filename)) return 'CSS';
  if (/dockerfile/i.test(filename)) return 'Shell';

  return languageByExtension[extension] ?? 'Other';
}

export function getLanguageColor(language: string) {
  return LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.Other;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function sizeToHeight(size: number) {
  return clamp(Math.log2(Math.max(size, 1) + 1) * 0.42, 0.8, 12);
}

export function sizeHeatColor(size: number, maxSize: number) {
  const ratio = maxSize <= 0 ? 0 : Math.min(size / maxSize, 1);

  if (ratio > 0.72) return '#ff5c5c';
  if (ratio > 0.42) return '#ff9d4d';
  if (ratio > 0.18) return '#f3da56';
  return '#73e6c2';
}

export function createCityModel(
  snapshot: RepositorySnapshot,
  maxFiles = 450,
): CityModel {
  const renderFiles = [...snapshot.files]
    .sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))
    .slice(0, maxFiles);

  const grouped = new Map<string, RepositoryFile[]>();

  renderFiles.forEach((file) => {
    const pieces = file.path.split('/');
    const district = pieces.length > 1 ? pieces[0]! : 'root';
    const current = grouped.get(district) ?? [];
    current.push(file);
    grouped.set(district, current);
  });

  const names = [...grouped.keys()].sort((a, b) => {
    if (a === 'root') return -1;
    if (b === 'root') return 1;
    return a.localeCompare(b);
  });

  const districtColumns = Math.max(1, Math.ceil(Math.sqrt(names.length)));
  const districtGap = 4;
  const districts: CityDistrict[] = [];
  const buildings: CityBuilding[] = [];
  const languageCounts = new Map<string, number>();
  names.forEach((districtName, districtIndex) => {
    const files = grouped.get(districtName) ?? [];
    const buildingColumns = Math.max(2, Math.ceil(Math.sqrt(files.length)));
    const blockGap = 0.38;
    const districtWidth = Math.max(8, buildingColumns * 1.55 + 2.5);
    const rows = Math.ceil(files.length / buildingColumns);
    const districtDepth = Math.max(8, rows * 1.55 + 2.5);

    const gridX = districtIndex % districtColumns;
    const gridZ = Math.floor(districtIndex / districtColumns);
    const centerX = gridX * (18 + districtGap);
    const centerZ = gridZ * (18 + districtGap);

    const districtBuildings = files.map((file, fileIndex) => {
      const column = fileIndex % buildingColumns;
      const row = Math.floor(fileIndex / buildingColumns);
      const seed = hashString(file.path);
      const width = 0.72 + (seed % 35) / 100;
      const depth = 0.72 + ((seed >> 5) % 35) / 100;
      const height = sizeToHeight(file.size);
      const x =
        centerX -
        districtWidth / 2 +
        1.45 +
        column * (1.22 + blockGap);
      const z =
        centerZ -
        districtDepth / 2 +
        1.45 +
        row * (1.22 + blockGap);
      const name = file.path.split('/').pop() ?? file.path;
      const extension = name.includes('.')
        ? name.split('.').pop()!.toLowerCase()
        : '';
      const language = inferLanguage(file.path);

      languageCounts.set(
        language,
        (languageCounts.get(language) ?? 0) + 1,
      );

      return {
        id: file.path,
        path: file.path,
        name,
        district: districtName,
        extension,
        language,
        color: getLanguageColor(language),
        size: file.size,
        position: [x, height / 2 + 0.08, z] as [number, number, number],
        dimensions: [width, height, depth] as [number, number, number],
      };
    });

    buildings.push(...districtBuildings);
    districts.push({
      id: districtName,
      name: districtName,
      center: [centerX, 0, centerZ],
      width: districtWidth,
      depth: districtDepth,
      buildings: districtBuildings,
    });
  });

  if (districts.length > 0) {
    const minX = Math.min(
      ...districts.map((district) => district.center[0] - district.width / 2),
    );
    const maxX = Math.max(
      ...districts.map((district) => district.center[0] + district.width / 2),
    );
    const minZ = Math.min(
      ...districts.map((district) => district.center[2] - district.depth / 2),
    );
    const maxZ = Math.max(
      ...districts.map((district) => district.center[2] + district.depth / 2),
    );
    const offsetX = (minX + maxX) / 2;
    const offsetZ = (minZ + maxZ) / 2;

    districts.forEach((district) => {
      district.center[0] -= offsetX;
      district.center[2] -= offsetZ;
      district.buildings.forEach((building) => {
        building.position[0] -= offsetX;
        building.position[2] -= offsetZ;
      });
    });
  }

  return {
    districts,
    buildings,
    languages: [...languageCounts.entries()]
      .map(([language, count]) => ({
        language,
        count,
        color: getLanguageColor(language),
      }))
      .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language)),
    totalBytes: snapshot.files.reduce((total, file) => total + file.size, 0),
    renderedFiles: renderFiles.length,
    totalFiles: snapshot.files.length,
  };
}

export function getBuildingColor(
  building: CityBuilding,
  mode: CityColorMode,
  maxSize: number,
) {
  return mode === 'language'
    ? building.color
    : sizeHeatColor(building.size, maxSize);
}

export function formatBytes(value: number) {
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
}
