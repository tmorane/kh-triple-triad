import { beforeEach, describe, expect, test } from 'bun:test'
import {
  BACKGROUND_MODE_STORAGE_KEY,
  resolveBackgroundMode,
  resolveSystemBackgroundMode,
  type BackgroundMode,
} from './backgroundMode'

function setMatchMedia(matchesDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: () => {
        // deprecated no-op for compatibility
      },
      removeListener: () => {
        // deprecated no-op for compatibility
      },
      addEventListener: () => {
        // no-op
      },
      removeEventListener: () => {
        // no-op
      },
      dispatchEvent: () => false,
    }),
  })
}

describe('background mode resolution', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('defaults to system dark mode when no stored preference exists', () => {
    setMatchMedia(true)

    expect(resolveBackgroundMode()).toBe('dark')
  })

  test('defaults to system light mode when no stored preference exists', () => {
    setMatchMedia(false)

    expect(resolveBackgroundMode()).toBe('light')
  })

  test('falls back to light mode when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    })

    expect(resolveSystemBackgroundMode()).toBe('light')
    expect(resolveBackgroundMode()).toBe('light')
  })

  test('stored value overrides system preference', () => {
    setMatchMedia(false)
    window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, 'dark')

    expect(resolveBackgroundMode()).toBe('dark')
  })

  test('ignores invalid stored values', () => {
    setMatchMedia(true)
    window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, 'neon' as BackgroundMode)

    expect(resolveBackgroundMode()).toBe('dark')
  })
})
