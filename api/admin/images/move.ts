/* global process */
import { createClient } from '@supabase/supabase-js'
import { handleAdminImageMoveRequest } from '../../../src/app/admin/adminImageMoveApi'
import { movePublicImageToDirectory } from './publicGalleryStore'

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

function readBooleanEnv(name: string): boolean | null {
  const value = process.env[name]
  if (typeof value !== 'string') {
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

function isLocalAuthBypassEnabled(): boolean {
  const explicit = readBooleanEnv('ADMIN_BYPASS_LOCAL_AUTH')
  if (explicit !== null) {
    return explicit
  }

  return process.env.NODE_ENV !== 'production'
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
  const bypassAuth = isLocalAuthBypassEnabled()

  const result = await handleAdminImageMoveRequest(
    {
      method: req.method,
      headers: {
        authorization: headerValue(req.headers.authorization),
      },
      body: req.body,
    },
    {
      verifyAccessToken: verifySupabaseAccessToken,
      moveImage: movePublicImageToDirectory,
      allowedEmailsRaw: process.env.ADMIN_ALLOWED_EMAILS,
      bypassAuth,
    },
  )

  if (result.status === 405) {
    res.setHeader('Allow', 'POST')
  }

  res.status(result.status).json(result.body)
}
