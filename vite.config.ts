import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAdminImageDeleteRequest } from './src/app/admin/adminImageDeleteApi'
import { handleAdminImageGenerateRequest } from './src/app/admin/adminImageApi'
import { handleAdminImageMoveRequest } from './src/app/admin/adminImageMoveApi'
import { handleAdminImageRenameRequest } from './src/app/admin/adminImageRenameApi'
import {
  deletePublicImage,
  listAllPublicImages,
  movePublicImageToDirectory,
  persistGeneratedImagesToPublic,
  renamePublicImage,
} from './api/admin/images/publicGalleryStore'

function readBooleanEnv(value: string | undefined): boolean | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') {
    return true
  }
  if (normalized === 'false' || normalized === '0') {
    return false
  }
  return null
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve(undefined)
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(undefined)
      }
    })
    req.on('error', () => resolve(undefined))
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (!process.env.AI_GATEWAY_API_KEY && env.AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = env.AI_GATEWAY_API_KEY
  }

  const bypassAuth = readBooleanEnv(env.ADMIN_BYPASS_LOCAL_AUTH) ?? true

  return {
    plugins: [
      react(),
      {
        name: 'admin-images-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/admin/images/gallery', async (req, res) => {
            if (req.method !== 'GET') {
              res.statusCode = 405
              res.setHeader('allow', 'GET')
              res.setHeader('content-type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            try {
              const images = await listAllPublicImages()
              res.statusCode = 200
              res.setHeader('content-type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ images }))
            } catch {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Unable to read public gallery.' }))
            }
          })

          server.middlewares.use('/api/admin/images/generate', async (req, res) => {
            const body = await readRequestBody(req)
            const result = await handleAdminImageGenerateRequest(
              {
                method: req.method,
                headers: {
                  authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
                },
                body,
              },
              {
                verifyAccessToken: async () => ({ email: null }),
                persistGeneratedImages: persistGeneratedImagesToPublic,
                allowedEmailsRaw: env.ADMIN_ALLOWED_EMAILS,
                bypassAuth,
              },
            )

            res.statusCode = result.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            if (result.status === 405) {
              res.setHeader('allow', 'POST')
            }
            res.end(JSON.stringify(result.body))
          })

          server.middlewares.use('/api/admin/images/move', async (req, res) => {
            const body = await readRequestBody(req)
            const result = await handleAdminImageMoveRequest(
              {
                method: req.method,
                headers: {
                  authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
                },
                body,
              },
              {
                verifyAccessToken: async () => ({ email: null }),
                moveImage: movePublicImageToDirectory,
                allowedEmailsRaw: env.ADMIN_ALLOWED_EMAILS,
                bypassAuth,
              },
            )

            res.statusCode = result.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            if (result.status === 405) {
              res.setHeader('allow', 'POST')
            }
            res.end(JSON.stringify(result.body))
          })

          server.middlewares.use('/api/admin/images/delete', async (req, res) => {
            const body = await readRequestBody(req)
            const result = await handleAdminImageDeleteRequest(
              {
                method: req.method,
                headers: {
                  authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
                },
                body,
              },
              {
                verifyAccessToken: async () => ({ email: null }),
                deleteImage: deletePublicImage,
                allowedEmailsRaw: env.ADMIN_ALLOWED_EMAILS,
                bypassAuth,
              },
            )

            res.statusCode = result.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            if (result.status === 405) {
              res.setHeader('allow', 'POST')
            }
            res.end(JSON.stringify(result.body))
          })

          server.middlewares.use('/api/admin/images/rename', async (req, res) => {
            const body = await readRequestBody(req)
            const result = await handleAdminImageRenameRequest(
              {
                method: req.method,
                headers: {
                  authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
                },
                body,
              },
              {
                verifyAccessToken: async () => ({ email: null }),
                renameImage: renamePublicImage,
                allowedEmailsRaw: env.ADMIN_ALLOWED_EMAILS,
                bypassAuth,
              },
            )

            res.statusCode = result.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            if (result.status === 405) {
              res.setHeader('allow', 'POST')
            }
            res.end(JSON.stringify(result.body))
          })
        },
      },
    ],
  }
})
