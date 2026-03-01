export type BackgroundMode = 'light' | 'dark'

export const BACKGROUND_MODE_STORAGE_KEY = 'kh-triple-triad-background-mode-v1'

function isBackgroundMode(value: string | null): value is BackgroundMode {
  return value === 'light' || value === 'dark'
}

export function readStoredBackgroundMode(): BackgroundMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(BACKGROUND_MODE_STORAGE_KEY)
    return isBackgroundMode(storedValue) ? storedValue : null
  } catch {
    return null
  }
}

export function resolveSystemBackgroundMode(): BackgroundMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveBackgroundMode(): BackgroundMode {
  const storedMode = readStoredBackgroundMode()
  if (storedMode) {
    return storedMode
  }

  return resolveSystemBackgroundMode()
}

export function persistBackgroundMode(mode: BackgroundMode): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, mode)
  } catch {
    // Ignore storage write errors (private mode, disabled storage, etc.).
  }
}

export function toggleBackgroundMode(mode: BackgroundMode): BackgroundMode {
  return mode === 'dark' ? 'light' : 'dark'
}
