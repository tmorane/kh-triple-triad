const SPLASHART_BASE_PATH = '/splashart'
const SHINY_SPLASHART_BASE_PATH = '/splashart-shiny'
const ART_EXTENSIONS = ['png', 'webp', 'jpg'] as const
const CARD_ART_NAME_ALIASES: Record<string, string[]> = {
  'Minute Bombe': ['Bombe Minute'],
  Surveillant: ['Robot de Surveillance'],
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeSeparators(value: string): string {
  return value.replace(/[/:]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    result.push(value)
  }

  return result
}

interface CardArtOptions {
  shiny?: boolean
}

function buildCandidates(basePath: string, filenameVariants: string[], fileSuffix: string = ''): string[] {
  const candidates: string[] = []
  for (const filename of filenameVariants) {
    const encodedFilename = encodeURIComponent(`${filename}${fileSuffix}`)
    for (const extension of ART_EXTENSIONS) {
      candidates.push(`${basePath}/${encodedFilename}.${extension}`)
    }
  }

  return candidates
}

export function getCardArtCandidates(cardName: string, options: CardArtOptions = {}): string[] {
  const trimmedName = cardName.trim()
  if (!trimmedName) {
    return []
  }

  const asciiName = stripDiacritics(trimmedName)
  const normalizedName = normalizeSeparators(asciiName)

  const aliasNameVariants = (CARD_ART_NAME_ALIASES[trimmedName] ?? []).flatMap((alias) => {
    const asciiAlias = stripDiacritics(alias)
    const normalizedAlias = normalizeSeparators(asciiAlias)

    return [alias, asciiAlias, normalizedAlias]
  })

  const filenameVariants = unique([
    trimmedName,
    asciiName,
    normalizedName,
    ...aliasNameVariants,
  ])

  const normalCandidates = buildCandidates(SPLASHART_BASE_PATH, filenameVariants)
  if (!options.shiny) {
    return normalCandidates
  }

  const shinyCandidates = buildCandidates(SHINY_SPLASHART_BASE_PATH, filenameVariants, '_Shiny')
  return unique([...shinyCandidates, ...normalCandidates])
}
