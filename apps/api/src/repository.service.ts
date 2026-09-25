import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

interface GitHubRepositoryResponse {
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
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

interface GitHubTreeResponse {
  truncated: boolean;
  tree: Array<{
    path: string;
    type: string;
    size?: number;
    sha?: string;
  }>;
}

function parseSlug(input: string) {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = cleaned.split('/');

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1] ||
    !/^[A-Za-z0-9_.-]+$/.test(parts[0]) ||
    !/^[A-Za-z0-9_.-]+$/.test(parts[1])
  ) {
    throw new Error('Use owner/repository ou uma URL válida do GitHub.');
  }

  return {
    owner: parts[0],
    repo: parts[1],
    slug: cleaned,
  };
}

@Injectable()
export class RepositoryService {
  private headers() {
    const token = process.env.GITHUB_TOKEN;

    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    };
  }

  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: this.headers(),
    });

    if (response.status === 404) {
      throw new NotFoundException(
        'Repositório não encontrado ou não é público.',
      );
    }

    if (response.status === 403 || response.status === 429) {
      throw new HttpException(
        'Limite da API do GitHub atingido. Configure GITHUB_TOKEN.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        'GitHub respondeu com status ' + response.status + '.',
      );
    }

    return (await response.json()) as T;
  }

  async listRepositories(owner: string) {
    const normalizedOwner = owner.trim();

    if (!/^[A-Za-z0-9_.-]+$/.test(normalizedOwner)) {
      throw new NotFoundException('Usuário do GitHub inválido.');
    }

    const repositories = await this.request<GitHubOwnerRepositoryResponse[]>(
      'https://api.github.com/users/' +
        encodeURIComponent(normalizedOwner) +
        '/repos?per_page=100&sort=updated&type=owner',
    );

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

  async readRepository(input: string) {
    let parsed: ReturnType<typeof parseSlug>;

    try {
      parsed = parseSlug(input);
    } catch (error) {
      throw new NotFoundException(
        error instanceof Error ? error.message : 'Repositório inválido.',
      );
    }

    const base = 'https://api.github.com/repos/' + parsed.slug;
    const repository = await this.request<GitHubRepositoryResponse>(base);
    const tree = await this.request<GitHubTreeResponse>(
      base +
        '/git/trees/' +
        encodeURIComponent(repository.default_branch) +
        '?recursive=1',
    );

    return {
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: repository.default_branch,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      url: repository.html_url,
      files: tree.tree
        .filter((entry) => entry.type === 'blob')
        .map((entry) => ({
          path: entry.path,
          size: entry.size ?? 0,
          sha: entry.sha,
        })),
      truncated: tree.truncated,
    };
  }
}
