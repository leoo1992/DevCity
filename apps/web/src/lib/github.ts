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

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        'Limite da API pública do GitHub atingido. Configure o backend Nest com GITHUB_TOKEN.',
      );
    }

    if (response.status === 404) {
      throw new Error('Repositório não encontrado ou não é público.');
    }

    throw new Error('GitHub respondeu com status ' + response.status + '.');
  }

  return (await response.json()) as T;
}

export async function loadRepository(
  input: string,
): Promise<RepositorySnapshot> {
  const parsed = parseRepositoryInput(input);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

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
    base + '/git/trees/' + encodeURIComponent(repository.default_branch) + '?recursive=1',
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
