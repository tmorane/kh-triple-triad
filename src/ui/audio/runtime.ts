export interface ToneStep {
  frequency: number
  duration: number
  gain: number
  delay?: number
  waveform?: OscillatorType
}

export interface ToneLoop {
  steps: ToneStep[]
  loopDuration: number
}

let sharedAudioContext: AudioContext | null = null

interface ScheduledTone {
  oscillator: OscillatorNode
  gain: GainNode
}

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

function scheduleTone(context: AudioContext, startAt: number, step: ToneStep): ScheduledTone {
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

  return { oscillator, gain }
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

export function playToneLoop(loop: ToneLoop): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  let stopped = false
  const scheduledTones = new Set<ScheduledTone>()
  const scheduledTimeouts = new Set<number>()

  const rememberTimeout = (handler: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      scheduledTimeouts.delete(timeoutId)
      handler()
    }, delay)
    scheduledTimeouts.add(timeoutId)
  }

  const releaseTones = (tones: ScheduledTone[]) => {
    for (const tone of tones) {
      scheduledTones.delete(tone)
    }
  }

  const scheduleLoop = () => {
    if (stopped) {
      return
    }

    try {
      const context = getSharedAudioContext()
      if (!context) {
        return
      }

      if (context.state === 'suspended') {
        void context.resume()
      }

      const baseStartAt = context.currentTime + 0.02
      const tones = loop.steps.map((step) => scheduleTone(context, baseStartAt + (step.delay ?? 0), step))
      for (const tone of tones) {
        scheduledTones.add(tone)
      }

      rememberTimeout(() => releaseTones(tones), Math.ceil((loop.loopDuration + 0.5) * 1000))
      rememberTimeout(scheduleLoop, Math.max(100, Math.ceil(loop.loopDuration * 1000)))
    } catch {
      // Audio playback is non-critical.
    }
  }

  scheduleLoop()

  return () => {
    stopped = true

    for (const timeoutId of scheduledTimeouts) {
      window.clearTimeout(timeoutId)
    }
    scheduledTimeouts.clear()

    const context = getSharedAudioContext()
    for (const tone of scheduledTones) {
      try {
        if (context) {
          const stopAt = context.currentTime + 0.04
          tone.gain.gain.cancelScheduledValues(context.currentTime)
          tone.gain.gain.setValueAtTime(Math.max(0.0001, tone.gain.gain.value), context.currentTime)
          tone.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
          tone.oscillator.stop(stopAt + 0.01)
        }
      } catch {
        // The oscillator may already have stopped.
      }
    }
    scheduledTones.clear()
  }
}
