# DevCity

DevCity turns a GitHub repository structure into a navigable 3D city. Top-level folders become districts, files become buildings, file size controls building height, and language or extension determines visual identity.

## Features
- 3D city with orbit camera, zoom, and pan
- Language and file-size heatmap views
- Search and language filters
- File inspector and repository metrics
- Public GitHub repository lookup
- Optional NestJS API for server-side GitHub token usage

## Stack
- Next.js 16, React 19, TypeScript
- React Three Fiber, Three.js, and Drei
- Redux Toolkit and Tailwind CSS 4
- NestJS API and GitHub REST API

## Run
Requires Node.js 22.12 or later.

```bash
npm install
npm run dev:api
```

In another terminal:

```bash
npm run dev:web
```

Web: http://localhost:3000 · API: http://localhost:3001
