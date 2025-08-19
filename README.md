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
3. Configurer les variables d'environnement dans un fichier `.env` :
   - `DATABASE_URL`
   - `GOOGLE_API_KEY`
   - `GEMINI_MODEL`
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

## Tests

Exécuter les tests unitaires:
```bash
npm test
```
