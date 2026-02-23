let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) {
    return null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass()
  }

  return sharedAudioContext
}

function scheduleTone(context: AudioContext, startAt: number, frequency: number, duration: number, maxGain: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(frequency, startAt)

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(maxGain, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

export function playCriticalVictorySound() {
  try {
    const context = getAudioContext()
    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume()
    }

    const startAt = context.currentTime + 0.01
    scheduleTone(context, startAt, 523.25, 0.14, 0.05)
    scheduleTone(context, startAt + 0.12, 783.99, 0.16, 0.045)
    scheduleTone(context, startAt + 0.26, 1046.5, 0.28, 0.042)
  } catch {
    // Audio is non-critical. Ignore runtime/playback errors.
  }
}
