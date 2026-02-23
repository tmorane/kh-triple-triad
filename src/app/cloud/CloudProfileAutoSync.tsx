import { useEffect } from 'react'
import { useGame } from '../useGame'
import { getCloudSessionUser, isCloudAuthEnabled } from './cloudAuth'
import { saveCloudProfile } from './cloudProfileStore'

export function CloudProfileAutoSync() {
  const { profile } = useGame()

  useEffect(() => {
    if (!isCloudAuthEnabled()) {
      return
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const sessionUser = await getCloudSessionUser()
          if (!sessionUser) {
            return
          }
          await saveCloudProfile(sessionUser.id, profile)
        } catch {
          // Silent background sync failure; explicit sync remains available in Account page.
        }
      })()
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [profile])

  return null
}
