# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deploy

This app is a Vite SPA with `BrowserRouter`, so route fallbacks are required in production.

### Option 1 (recommended): Vercel

```bash
npm run build
npx vercel --prod
```

`vercel.json` is included to rewrite all routes to `index.html` (no 404 on refresh).

### Option 2: Netlify

```bash
npm run build
npx netlify deploy --prod --dir dist
```

`netlify.toml` is included with the same SPA redirect behavior.

## Cloud Accounts + Shared Profiles

This project supports Supabase auth, cloud profile sync (`/account`), and global ladders (`/ranks`).

By default, cloud auth uses this project's built-in Supabase public config.

If you want to point to another Supabase project, override with env values:

1. Copy env values:

```bash
cp .env.example .env
```

2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
3. Run SQL script `docs/supabase-player-profiles.sql` in Supabase SQL editor (creates `player_profiles` + `player_ladder`).
4. Start app (`npm run dev`) and open `/account`.
5. Use `/ranks` to see:
   - leaderboard by owned cards
   - leaderboard by highest peak rank

### Optional: Mock Global Ladders

Set `VITE_ENABLE_MOCK_LADDER=true` (or `1`) in `.env` to inject 10 fixed mock users with varied progression.

- Local tester profiles are included in ladders by default (not only cloud-synced users).
- Works even if Supabase is not configured.
- If Supabase is configured, real rows are merged with mock rows and sorted globally.
- If cloud ladder fetch fails, the UI falls back to mock rows.
