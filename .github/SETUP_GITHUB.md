# Configuration GitHub pour les Workflows

Ce guide vous explique comment configurer votre repository GitHub pour que tous les workflows fonctionnent correctement.

## ⚠️ Configuration requise

### 1. Activer les permissions pour GitHub Actions

**Erreur si non configuré :**

```
GitHub Actions is not permitted to create or approve pull requests
```

**Solution :**

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** (⚙️)
3. Dans le menu de gauche : **Actions** → **General**
4. Descendez jusqu'à la section **"Workflow permissions"**
5. Sélectionnez **"Read and write permissions"**
6. ✅ **Cochez** la case **"Allow GitHub Actions to create and approve pull requests"**
7. Cliquez sur **Save**

![Workflow Permissions](https://docs.github.com/assets/cb-52221/mw-1440/images/help/repository/actions-workflow-permissions-repository.webp)

---

### 2. Activer GitHub Packages pour Docker

Pour publier les images Docker sur GitHub Container Registry (ghcr.io) :

1. Allez sur votre repository GitHub
2. **Settings** → **Actions** → **General**
3. Vérifiez que **"Read and write permissions"** est activé (même paramètre que ci-dessus)

**Note :** Les images seront publiées sur `ghcr.io/<votre-username>/sveltebase`

#### Rendre l'image publique (optionnel)

Par défaut, les images Docker sont privées. Pour les rendre publiques :

1. Allez sur votre profil GitHub
2. Cliquez sur **Packages**
3. Sélectionnez le package **sveltebase**
4. **Package settings** → **Change visibility** → **Public**

---

### 3. Vérifier que les workflows sont activés

1. Allez sur votre repository GitHub
2. **Settings** → **Actions** → **General**
3. Dans **"Actions permissions"**, vérifiez que l'une de ces options est sélectionnée :
   - ✅ **"Allow all actions and reusable workflows"** (recommandé)
   - ✅ **"Allow \<username\> actions and reusable workflows"**

---

## 🔒 Sécurité : Protection de branche (Recommandé)

Pour garantir la qualité du code sur la branche `master` :

1. Allez sur **Settings** → **Branches**
2. Cliquez sur **Add branch protection rule**
3. Branch name pattern : `master`
4. Activez :
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Ajoutez : `CI / quality-checks`
     - Ajoutez : `CI / build`
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Do not allow bypassing the above settings** (optionnel)
5. Cliquez sur **Create**

---

## 🚀 Test de la configuration

Une fois configuré, testez que tout fonctionne :

### Test 1 : CI Workflow

```bash
# Créez une branche de test
git checkout -b test/ci-setup
git commit --allow-empty -m "ci: test github actions setup"
git push -u origin test/ci-setup
```

✅ Le workflow CI devrait s'exécuter automatiquement

### Test 2 : Release Please

```bash
# Mergez votre branche de test dans master
# (ou poussez directement sur master)
git checkout master
git commit --allow-empty -m "feat: test release please setup"
git push origin master
```

✅ Release Please devrait créer une PR de release automatiquement

### Test 3 : Docker Build

✅ Sur push vers `master`, une image Docker devrait être construite et publiée

---

## 📋 Checklist de configuration

Avant de pousser sur `master`, vérifiez :

- [ ] Workflow permissions : **Read and write** activé
- [ ] **Allow GitHub Actions to create and approve pull requests** coché
- [ ] Actions permissions : Actions autorisées
- [ ] Protection de branche configurée (recommandé)
- [ ] Secrets disponibles : `GITHUB_TOKEN` (automatique)

---

## ❓ Dépannage

### Release Please ne crée pas de PR

**Causes possibles :**

1. Permissions insuffisantes → Vérifier les paramètres ci-dessus
2. Aucun commit conventional depuis la dernière release → Vérifier les messages de commit
3. Fichiers de config manquants → Vérifier `release-please-config.json` et `.release-please-manifest.json`

**Test manuel :**

```bash
# Vérifier les logs du workflow
# GitHub → Actions → Sélectionner le workflow → Voir les logs
```

### Docker build échoue

**Causes possibles :**

1. Permissions insuffisantes → Vérifier "Read and write permissions"
2. Dockerfile invalide → Tester localement : `docker build .`
3. Erreur de build → Vérifier les logs dans Actions

### CI échoue

**Causes possibles :**

1. Tests unitaires échouent → Lancer localement : `npm test`
2. Tests e2e échouent → Lancer localement : `npm run test:e2e`
3. Type checking échoue → Lancer localement : `npm run check`
4. Build échoue → Lancer localement : `npm run build`

---

## 📚 Documentation GitHub

- [Managing GitHub Actions permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## ✅ Configuration terminée !

Une fois tous ces paramètres configurés, vos workflows GitHub Actions fonctionneront automatiquement :

- ✅ CI vérifie la qualité du code
- ✅ Release Please gère les versions automatiquement
- ✅ Docker build publie les images sur ghcr.io
- ✅ Husky valide les commits localement

**Bon développement ! 🚀**
