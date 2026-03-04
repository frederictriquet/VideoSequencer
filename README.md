# VideoSequencer

[![CI](https://github.com/frederictriquet/VideoSequencer/actions/workflows/ci.yml/badge.svg)](https://github.com/frederictriquet/VideoSequencer/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frederictriquet/VideoSequencer/branch/master/graph/badge.svg)](https://codecov.io/gh/frederictriquet/VideoSequencer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

Séquenceur vidéo interactif basé sur un timeline à la mesure. Compose des vidéos en plaçant des clips sur une grille NxN synchronisée au BPM.

## Stack

- **Frontend** : SvelteKit 2 (Svelte 5), TypeScript
- **Rendu vidéo** : service FastAPI + MoviePy (Python)
- **Déploiement** : Docker Compose + Traefik

## Démarrage rapide

```bash
npm install
npm run dev
```

Pour le rendu vidéo, démarrer les services Docker :

```bash
npm run docker:up
```

## Tests

```bash
npm test                   # Vitest (unitaires)
npm run test:e2e           # Playwright (e2e)
npm run test:mutation      # Stryker (mutation)
```

## Licence

[MIT](LICENSE) — Frédéric Triquet
