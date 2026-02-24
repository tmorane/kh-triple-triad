export interface ToneStep {
  frequency: number
  duration: number
  gain: number
  delay?: number
  waveform?: OscillatorType
}

let sharedAudioContext: AudioContext | null = null

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  return AudioContextClass ?? null
}

function getSharedAudioContext(): AudioContext | null {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) {
    return null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass()
  }

  return sharedAudioContext
}

function scheduleTone(context: AudioContext, startAt: number, step: ToneStep) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = step.waveform ?? 'triangle'
  oscillator.frequency.setValueAtTime(step.frequency, startAt)

  const safeGain = Math.max(0.0001, step.gain)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(safeGain, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + step.duration)

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + step.duration + 0.02)
}

export function playTonePattern(steps: ToneStep[]) {
  try {
    const context = getSharedAudioContext()
    if (!context) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume()
    }

    const baseStartAt = context.currentTime + 0.01
    for (const step of steps) {
      scheduleTone(context, baseStartAt + (step.delay ?? 0), step)
    }
  } catch {
    // Audio playback is non-critical.
  }
}
