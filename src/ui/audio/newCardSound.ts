import { playTonePattern } from './runtime'

export function playNewCardSound() {
  playTonePattern([
    { waveform: 'triangle', frequency: 659.25, duration: 0.12, gain: 0.045 },
    { waveform: 'triangle', frequency: 783.99, duration: 0.14, gain: 0.04, delay: 0.1 },
    { waveform: 'triangle', frequency: 987.77, duration: 0.18, gain: 0.038, delay: 0.2 },
  ])
}
