#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const IMAGE_EXTENSIONS = new Set(['.png'])
const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const REPORT_DIR = path.resolve(process.cwd(), 'docs', 'reports')

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(2)} ${units[index]}`
}

function rel(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

async function collectFiles(rootDir) {
  const files = []

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(absolute)
      }
    }
  }

  await walk(rootDir)
  files.sort((a, b) => a.localeCompare(b))
  return files
}

async function totalSizeOfDirectory(rootDir) {
  let total = 0

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      const info = await stat(absolute)
      total += info.size
    }
  }

  await walk(rootDir)
  return total
}

async function toRawRgba(buffer) {
  return sharp(buffer, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

async function optimizePngLossless(buffer) {
  return sharp(buffer, { failOn: 'none' })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
      palette: false,
    })
    .toBuffer()
}

async function main() {
  const startedAt = new Date().toISOString()
  const publicBytesBefore = await totalSizeOfDirectory(PUBLIC_DIR)
  const pngFiles = await collectFiles(PUBLIC_DIR)

  const stats = {
    optimized: 0,
    skippedNotSmaller: 0,
    skippedInvalidOutput: 0,
    failed: 0,
    bytesBeforeCandidates: 0,
    bytesAfterCandidates: 0,
    bytesSavedCandidates: 0,
  }

  const savings = []

  for (const filePath of pngFiles) {
    try {
      const original = await readFile(filePath)
      stats.bytesBeforeCandidates += original.length

      const optimized = await optimizePngLossless(original)
      if (optimized.length >= original.length) {
        stats.skippedNotSmaller += 1
        stats.bytesAfterCandidates += original.length
        continue
      }

      const [originalRaw, optimizedRaw] = await Promise.all([toRawRgba(original), toRawRgba(optimized)])
      const sameGeometry =
        originalRaw.info.width === optimizedRaw.info.width &&
        originalRaw.info.height === optimizedRaw.info.height &&
        originalRaw.info.channels === optimizedRaw.info.channels
      const samePixels = sameGeometry && originalRaw.data.equals(optimizedRaw.data)

      if (!samePixels) {
        stats.skippedInvalidOutput += 1
        stats.bytesAfterCandidates += original.length
        continue
      }

      await writeFile(filePath, optimized)
      const gain = original.length - optimized.length
      stats.optimized += 1
      stats.bytesAfterCandidates += optimized.length
      stats.bytesSavedCandidates += gain
      savings.push({ filePath, gain, before: original.length, after: optimized.length })
    } catch {
      stats.failed += 1
      const fallbackSize = (await stat(filePath)).size
      stats.bytesAfterCandidates += fallbackSize
    }
  }

  const publicBytesAfter = await totalSizeOfDirectory(PUBLIC_DIR)
  await mkdir(REPORT_DIR, { recursive: true })

  savings.sort((a, b) => b.gain - a.gain)

  const reportLines = [
    '# Lossless Image Optimization Report',
    '',
    `- Date: ${startedAt}`,
    `- Scope: \`${rel(PUBLIC_DIR)}\``,
    '- Strategy: PNG optimization only, with strict pixel-identical guardrail (RGBA raw buffer equality).',
    '- Quality policy: if dimensions/channels/pixels differ, file is rejected and left unchanged.',
    '',
    '## Summary',
    '',
    `- PNG files scanned: ${pngFiles.length}`,
    `- PNG files optimized: ${stats.optimized}`,
    `- PNG skipped (not smaller): ${stats.skippedNotSmaller}`,
    `- PNG skipped (guardrail failed): ${stats.skippedInvalidOutput}`,
    `- PNG failed (read/encode error): ${stats.failed}`,
    `- Candidate bytes before: ${formatBytes(stats.bytesBeforeCandidates)} (${stats.bytesBeforeCandidates})`,
    `- Candidate bytes after: ${formatBytes(stats.bytesAfterCandidates)} (${stats.bytesAfterCandidates})`,
    `- Candidate bytes saved: ${formatBytes(stats.bytesSavedCandidates)} (${stats.bytesSavedCandidates})`,
    `- public/ total before: ${formatBytes(publicBytesBefore)} (${publicBytesBefore})`,
    `- public/ total after: ${formatBytes(publicBytesAfter)} (${publicBytesAfter})`,
    `- public/ total saved: ${formatBytes(publicBytesBefore - publicBytesAfter)} (${publicBytesBefore - publicBytesAfter})`,
    '',
    '## Top Savings',
    '',
    '| File | Before | After | Saved |',
    '| --- | ---: | ---: | ---: |',
  ]

  if (savings.length === 0) {
    reportLines.push('| (none) | 0 | 0 | 0 |')
  } else {
    for (const entry of savings.slice(0, 30)) {
      reportLines.push(
        `| \`${rel(entry.filePath)}\` | ${formatBytes(entry.before)} | ${formatBytes(entry.after)} | ${formatBytes(entry.gain)} |`,
      )
    }
  }

  const reportPath = path.join(REPORT_DIR, 'image-optimization-lossless.md')
  await writeFile(reportPath, `${reportLines.join('\n')}\n`, 'utf8')

  process.stdout.write(`Lossless optimization complete. Report: ${rel(reportPath)}\n`)
  process.stdout.write(`public/ saved: ${formatBytes(publicBytesBefore - publicBytesAfter)}\n`)
}

await main()
