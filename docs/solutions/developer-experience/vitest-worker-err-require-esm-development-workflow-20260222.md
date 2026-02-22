---
module: Development Workflow
date: 2026-02-22
problem_type: developer_experience
component: testing_framework
symptoms:
  - "Vitest workers failed to start with '[vitest-pool]: Failed to start forks worker'."
  - "Runtime error: 'require() of ES Module .../encoding-lite.js ... not supported' from html-encoding-sniffer."
  - "Typecheck failed with 'No overload matches this call' when `test` was defined in `vite.config.ts`."
root_cause: config_error
resolution_type: dependency_update
severity: high
tags: [vitest, vite, jsdom, node-version, test-harness]
---

# Troubleshooting: Vitest Worker Startup Fails With ESM/Version Mismatch

## Problem
During Phase 1 implementation, the test harness was blocked: unit/integration tests could not run because Vitest workers crashed during startup and TypeScript config typing failed.

## Environment
- Module: Development Workflow
- Project Stage: post-implementation validation (Phase 1)
- Affected Component: Vite/Vitest/Testing stack
- Date: 2026-02-22
- Runtime: Node v20.15.1

## Symptoms
- Running `npm run test` produced:
  - `Error: [vitest-pool]: Failed to start forks worker`
  - `Error: require() of ES Module .../encoding-lite.js ... not supported`
- Running `npm run typecheck` produced:
  - `No overload matches this call`
  - `Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'.`

## What Didn't Work

**Attempted Solution 1:** Use latest scaffolded dependencies from Vite 7 + Vitest 4 with Node 20.15.1.
- **Why it failed:** Latest packages expected newer Node/runtime behavior and triggered ESM compatibility issues in test worker startup.

**Attempted Solution 2:** Keep Vitest config inline in `vite.config.ts` using `vitest/config` while mixed Vite versions were installed.
- **Why it failed:** TypeScript saw incompatible plugin/config types between Vite dependency trees and failed compilation.

## Solution
Pin test/build dependencies to versions compatible with the local Node runtime and split Vite/Vitest config files.

**Code changes:**
```json
// package.json (devDependencies)
{
  "vite": "6.4.1",
  "@vitejs/plugin-react": "4.4.1",
  "vitest": "2.1.9",
  "@vitest/coverage-v8": "2.1.9",
  "jsdom": "24.1.3"
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

**Commands run:**
```bash
npm install -D vite@6.4.1 @vitejs/plugin-react@4.4.1 vitest@2.1.9 @vitest/coverage-v8@2.1.9 jsdom@24.1.3
npm run typecheck
npm run test
```

## Why This Works
The failures came from a tooling compatibility mismatch: package versions and config loading paths did not align with the local Node/runtime constraints. Pinning compatible versions removed the worker startup ESM conflict, and separating `vite.config.ts` from `vitest.config.ts` removed cross-tool typing conflicts in TypeScript.

## Prevention
- Pin core test/build tools in lockstep when Node version is fixed.
- Keep `vite.config.ts` and `vitest.config.ts` separate in TS projects to avoid mixed config typings.
- Run `npm run typecheck` immediately after toolchain upgrades before adding domain code.
- Treat scaffold default versions as provisional; verify against the active Node version before committing.

## Related Issues
No related issues documented yet.
