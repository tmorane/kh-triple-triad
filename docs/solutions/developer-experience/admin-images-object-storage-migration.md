# Admin Images: migration vers object storage (S3-compatible)

Ce runbook migre `public/admin-images/` vers un backend S3/R2/B2 compatible.

## 1. Pré-requis

- Un bucket object storage accessible en lecture/écriture.
- Une URL publique de diffusion (CDN/custom domain), par ex. `https://cdn.example.com`.
- AWS CLI (ou outil équivalent) disponible localement.

## 2. Variables d’environnement

Configurer les variables suivantes:

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

Notes:
- `ADMIN_IMAGES_S3_PREFIX` doit pointer vers le namespace gallery (par défaut `admin-images`).
- `ADMIN_IMAGES_PUBLIC_BASE_URL` doit servir les objets sous ce prefix.

## 3. Migration one-shot des assets existants

Sync recommandé avec AWS CLI:

```bash
aws s3 sync public/admin-images "s3://$ADMIN_IMAGES_S3_BUCKET/$ADMIN_IMAGES_S3_PREFIX" \
  --exclude "gallery.json"
```

Pourquoi exclure `gallery.json`:
- Le backend S3 liste directement les objets images; le manifest local n’est plus source de vérité.

## 4. Vérification smoke test (production-like)

1. Démarrer l’API avec les variables S3.
2. Appeler `GET /api/admin/images/gallery` (auth admin valide).
3. Vérifier:
   - Les URLs retournées pointent vers `ADMIN_IMAGES_PUBLIC_BASE_URL`.
   - `POST /api/admin/images/generate` crée des objets dans le bucket.
   - `POST /api/admin/images/move`, `POST /api/admin/images/rename`, `POST /api/admin/images/delete` modifient bien le bucket.

## 5. Rollback rapide

Pour revenir en backend local:

```bash
ADMIN_IMAGES_STORAGE_BACKEND=local
```

Puis redémarrer le serveur.
