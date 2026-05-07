# PokeTriad

PokeTriad est un jeu de cartes tactique en React + TypeScript inspiré de Triple Triad, avec progression, ranked, shop/packs, missions, succès, Pokédex, et comptes cloud (optionnels).

## Quickstart

```bash
bun install
cp .env.example .env
bun run dev
```

App locale: `http://localhost:5173`

## Scripts

```bash
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run preview
bun run images:optimize:lossless
```

## Quality Gates (CI parity)

Avant PR/merge, exécute exactement:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Le workflow GitHub CI (`.github/workflows/ci.yml`) exécute ces 4 checks avec Bun `1.3.9`.

## Environment Variables

Base:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ENABLE_MOCK_LADDER=false
```

Admin images:

```bash
AI_GATEWAY_API_KEY=your_ai_gateway_api_key
ADMIN_ALLOWED_EMAILS=admin@example.com,another-admin@example.com
VITE_ADMIN_ALLOWED_EMAILS=admin@example.com,another-admin@example.com
ADMIN_BYPASS_LOCAL_AUTH=false
VITE_ADMIN_BYPASS_LOCAL_AUTH=false
```

Notes:
- `ADMIN_BYPASS_LOCAL_AUTH` et `VITE_ADMIN_BYPASS_LOCAL_AUTH` ne s’appliquent qu’en local/dev.
- En production, le bypass admin est forcé à `false` même si les env sont à `true`.

Object storage admin images (optionnel, recommandé prod):

```bash
ADMIN_IMAGES_STORAGE_BACKEND=s3
ADMIN_IMAGES_PUBLIC_BASE_URL=https://cdn.example.com
ADMIN_IMAGES_S3_BUCKET=your-bucket-name
ADMIN_IMAGES_S3_REGION=eu-west-1
ADMIN_IMAGES_S3_ACCESS_KEY_ID=your-access-key-id
ADMIN_IMAGES_S3_SECRET_ACCESS_KEY=your-secret-access-key
ADMIN_IMAGES_S3_PREFIX=admin-images
ADMIN_IMAGES_S3_ENDPOINT=
ADMIN_IMAGES_S3_FORCE_PATH_STYLE=false
```

## Cloud Profiles & Accounts

Le mode cloud utilise Supabase auth + synchronisation de profil.

1. Configure `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
2. Exécute `docs/supabase-player-profiles.sql` dans Supabase SQL editor.
3. Ouvre `/account` pour te connecter et synchroniser.

Optionnel: `VITE_ENABLE_MOCK_LADDER=true` pour injecter un ladder mock local.

## Admin Image Generation

Page admin: `/admin/images`

- Génération d’images via AI Gateway.
- Galerie limitée au namespace `admin-images` (filesystem local ou object storage S3-compatible).
- Endpoints API protégés (`401` non auth, `403` non admin).
- Endpoints:
  - `GET /api/admin/images/gallery`
  - `POST /api/admin/images/generate`
  - `POST /api/admin/images/move`
  - `POST /api/admin/images/rename`
  - `POST /api/admin/images/delete`
- Migration vers object storage documentée ici:
  - `docs/solutions/developer-experience/admin-images-object-storage-migration.md`

## Image Optimization (Lossless)

Commande:

```bash
bun run images:optimize:lossless
```

Garanties du script:
- PNG uniquement (pas de JPEG lossy).
- Vérification pixel-par-pixel RGBA obligatoire.
- Si dimensions/channels/pixels diffèrent, le fichier est rejeté et laissé intact.
- Rapport généré dans `docs/reports/image-optimization-lossless.md` avec avant/après.

## Legal & Privacy

- Mentions IP: `/legal`
- Politique de confidentialité: `/privacy`

## Deploy

### Vercel (recommandé)

```bash
bun run build
bunx vercel --prod
```

### Netlify

```bash
bun run build
bunx netlify deploy --prod --dir dist
```

## Troubleshooting

- Si l’API admin locale renvoie `404`: relance `bun run dev`.
- Si `401` sur admin: vérifie session cloud + token Supabase.
- Si `403` sur admin: vérifie `ADMIN_ALLOWED_EMAILS`.
- Si build signale de gros chunks: vérifier le découpage routes lazy dans `src/App.tsx`.
