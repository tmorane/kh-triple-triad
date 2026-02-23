const SPLASHART_BASE_PATH = '/splashart'
const ART_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const
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

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

export function getCardArtCandidates(cardName: string): string[] {
  const trimmedName = cardName.trim()
  if (!trimmedName) {
    return []
  }

  const asciiName = stripDiacritics(trimmedName)
  const normalizedName = normalizeSeparators(asciiName)
  const kebabName = toKebabCase(normalizedName)
  const snakeName = kebabName.replace(/-/g, '_')

  const aliasNameVariants = (CARD_ART_NAME_ALIASES[trimmedName] ?? []).flatMap((alias) => {
    const asciiAlias = stripDiacritics(alias)
    const normalizedAlias = normalizeSeparators(asciiAlias)
    const kebabAlias = toKebabCase(normalizedAlias)

    return [alias, asciiAlias, normalizedAlias, normalizedAlias.toLowerCase(), kebabAlias, kebabAlias.replace(/-/g, '_')]
  })

  const filenameVariants = unique([
    trimmedName,
    asciiName,
    normalizedName,
    normalizedName.toLowerCase(),
    kebabName,
    snakeName,
    ...aliasNameVariants,
  ])

  const candidates: string[] = []
  for (const filename of filenameVariants) {
    const encodedFilename = encodeURIComponent(filename)
    for (const extension of ART_EXTENSIONS) {
      candidates.push(`${SPLASHART_BASE_PATH}/${encodedFilename}.${extension}`)
    }
  }

  return candidates
}
