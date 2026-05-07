type StoryMusicId = 'pallet-town-theme'

export function playPalletTownMusic(): () => void {
  stopStoryMusic()

  return () => undefined
}

export function stopStoryMusic(): void {
  // Story ambience was intentionally retired; short UI sound effects still use the shared audio runtime.
}

export function getActiveStoryMusicId(): StoryMusicId | null {
  return null
}
