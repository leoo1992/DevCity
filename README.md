# DevCity

DevCity transforma a estrutura de um repositório GitHub em uma **cidade 3D navegável**.

- pastas de primeiro nível viram distritos;
- arquivos viram prédios;
- tamanho do arquivo controla a altura;
- linguagem/ extensão controla a identidade visual;
- clique em um prédio para inspecionar o arquivo;
- busca e filtros alteram a cidade em tempo real.

## Stack

### Front-end
- Next.js 16
- React 19
- TypeScript
- React Three Fiber + Three.js + Drei
- Redux Toolkit
- Tailwind CSS 4

### API
- NestJS
- GitHub REST API
- endpoint serverless compatível com Vercel

## Funcionalidades do MVP

- cidade 3D com câmera orbital, zoom e pan;
- layout determinístico de distritos;
- escala logarítmica para altura dos prédios;
- dois modos de cor: linguagem e heatmap por tamanho;
- busca por arquivo/caminho;
- filtro por linguagem;
- inspector de arquivo selecionado;
- métricas do repositório;
- demo embutida para carregamento instantâneo;
- consulta de qualquer repositório GitHub público;
- API Nest opcional para usar GITHUB_TOKEN sem expô-lo ao browser;
- responsivo;
- testes do gerador da cidade;
- CI, Docker, ESLint, licença e .env.example.

## Executar localmente

Requisito: Node.js 22.12+.

```bash
npm install
npm run dev:api
```

Em outro terminal:

```bash
npm run dev:web
```

Web: http://localhost:3000  
API: http://localhost:3001

Sem a API Nest, o frontend continua funcionando para repositórios públicos usando diretamente a API pública do GitHub.

## Variáveis de ambiente

Copie `.env.example`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
GITHUB_TOKEN=
```

O token do GitHub é opcional e deve existir somente no backend.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Docker

```bash
docker compose up --build
```

## Deploy na Vercel

### Opção simples
Publique apenas `apps/web`. O frontend usa a API pública do GitHub.

### Opção completa
Crie dois projetos Vercel no mesmo repositório:

1. root directory `apps/api`;
2. root directory `apps/web`;
3. configure `GITHUB_TOKEN` no projeto da API;
4. configure `NEXT_PUBLIC_API_URL` no projeto web apontando para a URL da API.

## Como a cidade é gerada

O algoritmo em `apps/web/src/lib/city.ts`:

1. limita a quantidade de arquivos renderizados para preservar FPS;
2. agrupa arquivos pelo primeiro segmento do caminho;
3. cria uma malha de distritos;
4. distribui os arquivos em quarteirões;
5. usa escala logarítmica para transformar bytes em altura;
6. deriva largura/profundidade de um hash determinístico do caminho;
7. associa linguagem a uma cor.

A mesma entrada sempre produz a mesma cidade.

## Próximas evoluções

- animação temporal de commits;
- ruas representando imports/dependências;
- comparação visual entre branches;
- modo de passeio automático;
- WebGPU quando disponível;
- análise de complexidade;
- colaboração e links compartilháveis.

## Licença

MIT © 2026 Leonardo Santos Custódio.
