# GitHub Actions Workflows

Ce répertoire contient trois workflows automatisés pour le projet SvelteBase.

## ⚠️ Configuration requise

**IMPORTANT :** Avant d'utiliser ces workflows, vous devez configurer les permissions GitHub Actions.

👉 **Suivez le guide : [SETUP_GITHUB.md](../SETUP_GITHUB.md)**

En résumé :

1. **Settings** → **Actions** → **General**
2. Sélectionner **"Read and write permissions"**
3. ✅ Cocher **"Allow GitHub Actions to create and approve pull requests"**

Sans cette configuration, Release Please ne pourra pas créer de PRs automatiquement.

## Vue d'ensemble des workflows

### 1. CI (`ci.yml`)

**Déclencheurs:** Tous les pushs et pull requests sur n'importe quelle branche

**Objectif:** Assure la qualité et le bon fonctionnement du code

**Jobs:**

- **quality-checks**: Exécute des vérifications complètes incluant:
  - Vérification de types avec `svelte-check`
  - Tests unitaires avec Vitest
  - Tests e2e avec Playwright
  - Upload des rapports Playwright comme artifacts

- **build**: Vérifie que le projet se build correctement
  - Upload des artifacts de build pour inspection

**Notes importantes:**

- Les tests de mutation (`test:mutation`) sont **intentionnellement exclus** de la CI car trop longs
- Les navigateurs Playwright sont installés automatiquement
- Les artifacts de build sont conservés 3 jours
- Les rapports Playwright sont conservés 7 jours

### 2. Docker Build & Publish (`docker.yml`)

**Déclencheurs:** Pushs sur la branche `master` uniquement

**Objectif:** Build et publication des images Docker sur GitHub Container Registry

**Fonctionnalités:**

- Stratégie de tagging automatique:
  - `latest` pour la branche master
  - Tags basés sur le SHA pour la traçabilité
  - Tags de version sémantique (quand des releases sont créées)
- Cache des layers Docker via GitHub Actions cache
- Attestation de provenance pour la sécurité de la supply chain

**Registry:** `ghcr.io/<votre-username>/sveltebase`

**Authentification:** Utilise `GITHUB_TOKEN` (fourni automatiquement)

### 3. Release Please (`release.yml`)

**Déclencheurs:** Pushs sur la branche `master` uniquement

**Objectif:** Automatise le versioning sémantique et la création de releases

**Fonctionnement:**

1. Analyse les messages de commit suivant [Conventional Commits](https://www.conventionalcommits.org/)
2. Détermine automatiquement les bumps de version (major, minor, patch)
3. Crée/met à jour une PR de release avec changelog
4. Quand la PR de release est mergée, crée une release GitHub
5. Build et upload les artifacts de release

**Format des messages de commit:**

```
feat: ajout d'une nouvelle fonctionnalité (bump version mineure)
fix: correction de bug (bump version patch)
feat!: changement breaking (bump version majeure)
docs: mise à jour documentation (pas de bump)
chore: tâche routinière (pas de bump)
```

## Secrets requis

Tous les workflows utilisent le secret `GITHUB_TOKEN` intégré, qui est automatiquement fourni par GitHub Actions. Aucun secret supplémentaire n'est nécessaire.

## Stratégie de cache

Tous les workflows implémentent un cache efficace:

- **Dépendances npm**: Cachées via `actions/setup-node` avec `cache: 'npm'`
- **Layers Docker**: Cachés via GitHub Actions cache (`type=gha`)
- Les navigateurs Playwright sont cachés automatiquement

## Recommandations de protection de branche

Pour une efficacité optimale des workflows, considérez activer ces règles de protection sur `master`:

1. **Require status checks to pass:**
   - CI / quality-checks
   - CI / build

2. **Require pull request reviews** avant merge

3. **Include administrators** dans les règles de protection

## Ordre d'exécution des workflows

Sur push vers `master`:

1. Workflow CI s'exécute (quality checks + build)
2. Workflow Release Please s'exécute (crée/met à jour la PR de release)
3. Workflow Docker s'exécute (build et push des images)

Quand la PR de release est mergée:

1. Workflow CI s'exécute
2. Release Please crée la release
3. Workflow Docker build les images avec les tags de version sémantique

## Dépannage

### CI Workflow échoue

- Vérifier que tous les scripts npm existent dans `package.json`
- Vérifier la compatibilité avec Node.js version (actuellement v20)
- Consulter les logs de test dans l'artifact du rapport Playwright

### Docker Build échoue

- Vérifier que le Dockerfile est valide et build localement
- Vérifier que tous les fichiers requis sont présents (pas dans `.dockerignore`)
- Vérifier la compatibilité du build multi-plateforme

### Release Please ne crée pas de releases

- Vérifier que les commits suivent le format Conventional Commits
- Vérifier que la version dans `package.json` est correctement formatée
- Vérifier que le workflow a les permissions d'écriture sur contents et pull-requests

## Maintenance

### Mise à jour de la version Node.js

Changer le `node-version` dans les trois fichiers de workflow:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20' # Changer cette valeur
```

### Ajout de nouvelles vérifications CI

Ajouter des steps au job `quality-checks` dans `ci.yml`:

```yaml
- name: Nouvelle vérification
  run: npm run votre-nouveau-script
```

### Modification des tags Docker

Éditer la section `tags:` dans `docker.yml` sous l'étape d'extraction des métadonnées.

## Références

- [Documentation GitHub Actions](https://docs.github.com/en/actions)
- [Documentation Release Please](https://github.com/googleapis/release-please)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Conventional Commits](https://www.conventionalcommits.org/)
