import { afterEach, expect, mock, vi } from 'bun:test'
import { getQueriesForElement, queries, screen } from '@testing-library/dom'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { JSDOM } from 'jsdom'

const jsdom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
const { window } = jsdom
const runtimeWindow =
  ((globalThis as unknown as { window?: Window }).window as Window | undefined) ?? window

if (!('window' in globalThis)) {
  ;(globalThis as Record<string, unknown>).window = runtimeWindow
}
if (!('document' in globalThis)) {
  ;(globalThis as Record<string, unknown>).document = runtimeWindow.document
}
if (!('navigator' in globalThis)) {
  ;(globalThis as Record<string, unknown>).navigator = runtimeWindow.navigator
}
let rafTimestamp = 0
const requestAnimationFramePolyfill = (callback: FrameRequestCallback) =>
  setTimeout(() => {
    rafTimestamp += 16
    callback(rafTimestamp)
  }, 0) as unknown as number
const cancelAnimationFramePolyfill = (handle: number) => {
  clearTimeout(handle)
}

;(globalThis as Record<string, unknown>).requestAnimationFrame = requestAnimationFramePolyfill
;(globalThis as Record<string, unknown>).cancelAnimationFrame = cancelAnimationFramePolyfill
;(runtimeWindow as unknown as Record<string, unknown>).requestAnimationFrame = requestAnimationFramePolyfill
;(runtimeWindow as unknown as Record<string, unknown>).cancelAnimationFrame = cancelAnimationFramePolyfill
const runtimeHTMLElement = (runtimeWindow as unknown as { HTMLElement?: { prototype: Record<string, unknown> } }).HTMLElement
if (runtimeHTMLElement?.prototype && !('attachEvent' in runtimeHTMLElement.prototype)) {
  runtimeHTMLElement.prototype.attachEvent = () => undefined
}
if (runtimeHTMLElement?.prototype && !('detachEvent' in runtimeHTMLElement.prototype)) {
  runtimeHTMLElement.prototype.detachEvent = () => undefined
}
if (!('matchMedia' in globalThis)) {
  ;(globalThis as Record<string, unknown>).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}

for (const key of Object.getOwnPropertyNames(runtimeWindow)) {
  if (key in globalThis) {
    continue
  }
  Object.defineProperty(globalThis, key, {
    configurable: true,
    get() {
      return (runtimeWindow as unknown as Record<string, unknown>)[key]
    },
  })
}

expect.extend(matchers)
Object.assign(screen, getQueriesForElement(runtimeWindow.document.body, queries))

const stubbedEnvByKey = new Map<string, string | undefined>()
const stubbedGlobalsByKey = new Map<string, unknown>()
const viCompat = vi as unknown as Record<string, unknown>

if (!viCompat.mocked) {
  viCompat.mocked = <T>(value: T) => value
}
if (!viCompat.stubEnv) {
  viCompat.stubEnv = (key: string, value: string) => {
    if (!stubbedEnvByKey.has(key)) {
      stubbedEnvByKey.set(key, process.env[key])
    }
    process.env[key] = value
  }
}
if (!viCompat.unstubAllEnvs) {
  viCompat.unstubAllEnvs = () => {
    for (const [key, previousValue] of stubbedEnvByKey.entries()) {
      if (previousValue === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previousValue
      }
    }
    stubbedEnvByKey.clear()
  }
}
if (!viCompat.stubGlobal) {
  viCompat.stubGlobal = (key: string, value: unknown) => {
    if (!stubbedGlobalsByKey.has(key)) {
      stubbedGlobalsByKey.set(key, (globalThis as Record<string, unknown>)[key])
    }
    ;(globalThis as Record<string, unknown>)[key] = value
  }
}
if (!viCompat.unstubAllGlobals) {
  viCompat.unstubAllGlobals = () => {
    for (const [key, previousValue] of stubbedGlobalsByKey.entries()) {
      if (previousValue === undefined) {
        delete (globalThis as Record<string, unknown>)[key]
      } else {
        ;(globalThis as Record<string, unknown>)[key] = previousValue
      }
    }
    stubbedGlobalsByKey.clear()
  }
}
if (!viCompat.advanceTimersByTimeAsync) {
  viCompat.advanceTimersByTimeAsync = async (ms: number) => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
  }
}
if (!viCompat.runOnlyPendingTimersAsync) {
  viCompat.runOnlyPendingTimersAsync = async () => {
    vi.runOnlyPendingTimers()
    await Promise.resolve()
  }
}
if (!viCompat.resetModules) {
  viCompat.resetModules = () => undefined
}
if (!viCompat.hoisted) {
  viCompat.hoisted = <T>(factory: () => T) => factory()
}
if (!viCompat.doMock) {
  viCompat.doMock = (specifier: string, factory: () => unknown) => {
    mock.module(specifier, factory)
  }
}
if (!viCompat.doUnmock) {
  viCompat.doUnmock = () => {
    mock.restore()
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  ;(vi as unknown as { unstubAllGlobals?: () => void }).unstubAllGlobals?.()
})
