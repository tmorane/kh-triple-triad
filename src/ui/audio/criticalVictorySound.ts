import { playTonePattern } from './runtime'

export function playCriticalVictorySound() {
  playTonePattern([
    { waveform: 'sawtooth', frequency: 523.25, duration: 0.14, gain: 0.05 },
    { waveform: 'sawtooth', frequency: 783.99, duration: 0.16, gain: 0.045, delay: 0.12 },
    { waveform: 'sawtooth', frequency: 1046.5, duration: 0.28, gain: 0.042, delay: 0.26 },
  ])
}
