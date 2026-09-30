# Arquitetura

DevCity é um monorepo com duas aplicações:

- **apps/web**: interface Next.js responsável pela visualização e interação com os repositórios.
- **apps/api**: API de aplicação e integração com os dados usados pela experiência.
- **Delivery**: Docker para web/API e GitHub Actions para validação contínua.

O pipeline executa type checking, lint, testes, cobertura mínima de 80% e build de todos os workspaces.
