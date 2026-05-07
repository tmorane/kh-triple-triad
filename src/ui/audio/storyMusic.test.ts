import { beforeEach, describe, expect, mock, test } from 'bun:test'

const stopLoop = mock(() => undefined)
const playToneLoop = mock(() => stopLoop)

mock.module('./runtime', () => ({
  playToneLoop,
}))

const { getActiveStoryMusicId, playPalletTownMusic, stopStoryMusic } = await import('./storyMusic')

describe('storyMusic', () => {
  beforeEach(() => {
    stopStoryMusic()
    stopLoop.mockClear()
    playToneLoop.mockClear()
  })

  test('does not start Pallet Town music anymore', () => {
    const stop = playPalletTownMusic()

    expect(playToneLoop).not.toHaveBeenCalled()
    expect(getActiveStoryMusicId()).toBeNull()

    stop()

    expect(stopLoop).not.toHaveBeenCalled()
    expect(getActiveStoryMusicId()).toBeNull()
  })

  test('repeated story music calls do not leave a loop active', () => {
    playPalletTownMusic()
    playPalletTownMusic()

    expect(playToneLoop).not.toHaveBeenCalled()
    expect(stopLoop).not.toHaveBeenCalled()
    expect(getActiveStoryMusicId()).toBeNull()

    stopStoryMusic()

    expect(stopLoop).not.toHaveBeenCalled()
    expect(getActiveStoryMusicId()).toBeNull()
  })
})
