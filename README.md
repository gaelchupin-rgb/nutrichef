# Nutrichef

Ce projet contient une application Next.js située dans `Nutrishop/nutrishop-v2`.

## Installation

1. Aller dans le dossier de l'application:
   ```bash
   cd Nutrishop/nutrishop-v2
   ```
2. Installer les dépendances:
   ```bash
   npm install
   ```
3. (Optionnel) Configurer les variables d'environnement dans un fichier `.env` :
   - `DATABASE_URL`
   - `LLM_PROVIDER` (`gemini`, `openai`, `anthropic`)
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL` (optionnel)
4. Générer le client Prisma:
   ```bash
   npm run db:generate
   ```
5. Appliquer le schéma sur la base de données:
   ```bash
   npm run db:push
   ```
6. (Optionnel) Peupler la base:
   ```bash
   npm run db:seed
   ```
7. Lancer le serveur de développement:
   ```bash
   npm run dev
   ```

### Installation (PowerShell)

1. Ouvrir PowerShell (éventuellement en tant qu'administrateur).
2. Aller dans le dossier de l'application :
   ```powershell
   cd .\Nutrishop\nutrishop-v2
   ```
3. Installer les dépendances :
   ```powershell
   npm install
   ```
4. (Optionnel) Définir les variables d'environnement pour la session courante :
   ```powershell
   $env:DATABASE_URL="..."
   $env:LLM_PROVIDER="gemini"
   $env:GEMINI_API_KEY="..."
   $env:OPENAI_API_KEY="..."
   $env:ANTHROPIC_API_KEY="..."
   $env:GEMINI_MODEL="..."
   $env:OPENAI_MODEL="..."
   $env:ANTHROPIC_MODEL="..."
   ```
5. Générer le client Prisma :
   ```powershell
   npm run db:generate
   ```
6. Appliquer le schéma sur la base de données :
   ```powershell
   npm run db:push
   ```
7. (Optionnel) Peupler la base :
   ```powershell
   npm run db:seed
   ```
8. Lancer le serveur de développement :
   ```powershell
   npm run dev
   ```

> Assurez-vous d'avoir Node.js 20 ou supérieur installé.

## Tests

Exécuter les tests unitaires:

```bash
npm test
```

Le script de test définit automatiquement des valeurs fictives pour `DATABASE_URL`, `GEMINI_API_KEY` et `GEMINI_MODEL`.

> **Prérequis** : Node.js 20 ou supérieur est recommandé pour l'exécution des tests.
