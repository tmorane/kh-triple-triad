import { useEffect } from 'react'
import { useGame } from '../useGame'

function isJsdomRuntime(): boolean {
  if (import.meta.env.MODE === 'test') {
    return true
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback !== 'function') {
    return true
  }

  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')
}

function requestBackgroundWork(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  let cancelIdleWork: (() => void) | null = null
  const delayMs = isJsdomRuntime() ? 0 : 5_000

  const timeoutId = window.setTimeout(() => {
    const requestIdleCallback = window.requestIdleCallback
    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(callback, { timeout: 8_000 })
      cancelIdleWork = () => window.cancelIdleCallback?.(idleId)
      return
    }

    callback()
  }, delayMs)

  return () => {
    window.clearTimeout(timeoutId)
    cancelIdleWork?.()
  }
}

export function CloudProfileAutoSync() {
  const { profile } = useGame()

  useEffect(() => {
    const cancelBackgroundWork = requestBackgroundWork(() => {
      void (async () => {
        try {
          const [{ getCloudSessionUser, isCloudAuthEnabled }, { saveCloudProfile }] = await Promise.all([
            import('./cloudAuth'),
            import('./cloudProfileStore'),
          ])
          if (!isCloudAuthEnabled()) {
            return
          }

          const sessionUser = await getCloudSessionUser()
          if (!sessionUser) {
            return
          }
          await saveCloudProfile(sessionUser.id, profile)
        } catch {
          // Silent background sync failure; explicit sync remains available in Account page.
        }
      })()
    })

    return cancelBackgroundWork
  }, [profile])

  return null
}
