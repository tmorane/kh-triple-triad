/* global process */
import { createClient } from '@supabase/supabase-js'
import { handleAdminImageDeleteRequest } from '../../../src/app/admin/adminImageDeleteApi.js'
import { isAdminAuthBypassEnabled } from './adminAuthPolicy.js'
import { deletePublicImage } from './publicGalleryStore.js'

const DEFAULT_SUPABASE_URL = 'https://dufnghfphczftetkpcqf.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_RyP064ovRl0TW8yypqtyag_xuZ-TsQL'

interface NodeRequestLike {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

interface NodeResponseLike {
  status: (code: number) => NodeResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  if (fallback) {
    return fallback
  }

  throw new Error(`Missing required environment variable: ${name}`)
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value[0]
  }
  return undefined
}

async function verifySupabaseAccessToken(token: string): Promise<{ email: string | null }> {
  const supabaseUrl = readEnv('VITE_SUPABASE_URL', DEFAULT_SUPABASE_URL)
  const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Invalid token')
  }

  return { email: data.user.email ?? null }
}

export default async function handler(req: NodeRequestLike, res: NodeResponseLike): Promise<void> {
  const bypassAuth = isAdminAuthBypassEnabled({
    rawBypassValue: process.env.ADMIN_BYPASS_LOCAL_AUTH,
    nodeEnv: process.env.NODE_ENV,
  })

  const result = await handleAdminImageDeleteRequest(
    {
      method: req.method,
      headers: {
        authorization: headerValue(req.headers.authorization),
      },
      body: req.body,
    },
    {
      verifyAccessToken: verifySupabaseAccessToken,
      deleteImage: deletePublicImage,
      allowedEmailsRaw: process.env.ADMIN_ALLOWED_EMAILS,
      bypassAuth,
    },
  )

  if (result.status === 405) {
    res.setHeader('Allow', 'POST')
  }

  res.status(result.status).json(result.body)
}
