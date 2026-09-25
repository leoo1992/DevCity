import {
  parseRepositoryInput,
  type RepositoryFile,
  type RepositorySnapshot,
} from './city';

interface GitHubRepositoryResponse {
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
}

interface GitHubTreeResponse {
  truncated: boolean;
  tree: Array<{
    path: string;
    type: string;
    size?: number;
    sha?: string;
  }>;
}

interface GitHubOwnerRepositoryResponse {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
}

export interface RepositoryOption {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  updatedAt: string;
  url: string;
  fork: boolean;
  archived: boolean;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(
        'Limite da API pública do GitHub atingido. Configure o backend Nest com GITHUB_TOKEN.',
      );
    }

    if (response.status === 404) {
      throw new Error('Usuário ou repositório não encontrado no GitHub.');
    }

    throw new Error('GitHub respondeu com status ' + response.status + '.');
  }

  return (await response.json()) as T;
}

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
}

function normalizeRepositoryOptions(
  repositories: GitHubOwnerRepositoryResponse[],
): RepositoryOption[] {
  return repositories
    .map((repository) => ({
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      language: repository.language,
      stars: repository.stargazers_count,
      updatedAt: repository.updated_at,
      url: repository.html_url,
      fork: repository.fork,
      archived: repository.archived,
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function listOwnerRepositories(
  owner: string,
): Promise<RepositoryOption[]> {
  const normalizedOwner = owner.trim();

  if (!/^[A-Za-z0-9_.-]+$/.test(normalizedOwner)) {
    return [];
  }

  const apiUrl = getApiUrl();

  if (apiUrl) {
    const response = await fetch(
      apiUrl + '/api/repositories?owner=' + encodeURIComponent(normalizedOwner),
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      throw new Error(
        body?.message ?? 'Não foi possível listar os repositórios.',
      );
    }

    return (await response.json()) as RepositoryOption[];
  }

  const repositories = await fetchJson<GitHubOwnerRepositoryResponse[]>(
    'https://api.github.com/users/' +
      encodeURIComponent(normalizedOwner) +
      '/repos?per_page=100&sort=updated&type=owner',
  );

  return normalizeRepositoryOptions(repositories);
}

export async function loadRepository(
  input: string,
): Promise<RepositorySnapshot> {
  const parsed = parseRepositoryInput(input);
  const apiUrl = getApiUrl();

  if (apiUrl) {
    const response = await fetch(
      apiUrl + '/api/repository?repo=' + encodeURIComponent(parsed.slug),
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      throw new Error(body?.message ?? 'Não foi possível consultar a API DevCity.');
    }

    return (await response.json()) as RepositorySnapshot;
  }

  const base = 'https://api.github.com/repos/' + parsed.slug;
  const repository = await fetchJson<GitHubRepositoryResponse>(base);
  const tree = await fetchJson<GitHubTreeResponse>(
    base +
      '/git/trees/' +
      encodeURIComponent(repository.default_branch) +
      '?recursive=1',
  );

  const files: RepositoryFile[] = tree.tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({
      path: entry.path,
      size: entry.size ?? 0,
      sha: entry.sha,
    }));

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: repository.default_branch,
    description: repository.description,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    url: repository.html_url,
    files,
    truncated: tree.truncated,
  };
}
