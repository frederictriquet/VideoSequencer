# VideoSequencer

[![CI](https://github.com/frederictriquet/VideoSequencer/actions/workflows/ci.yml/badge.svg)](https://github.com/frederictriquet/VideoSequencer/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frederictriquet/VideoSequencer/branch/master/graph/badge.svg)](https://codecov.io/gh/frederictriquet/VideoSequencer)

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

MIT — Frédéric Triquet
