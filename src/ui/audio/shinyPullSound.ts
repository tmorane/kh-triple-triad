import { playTonePattern } from './runtime'

export function playShinyPullSound() {
  playTonePattern([
    { waveform: 'sawtooth', frequency: 659.25, duration: 0.12, gain: 0.042, delay: 0 },
    { waveform: 'sawtooth', frequency: 783.99, duration: 0.12, gain: 0.042, delay: 0.1 },
    { waveform: 'sawtooth', frequency: 987.77, duration: 0.13, gain: 0.041, delay: 0.2 },
    { waveform: 'sawtooth', frequency: 1174.66, duration: 0.15, gain: 0.039, delay: 0.33 },
    { waveform: 'sawtooth', frequency: 1318.51, duration: 0.18, gain: 0.037, delay: 0.48 },
    { waveform: 'sawtooth', frequency: 1567.98, duration: 0.34, gain: 0.035, delay: 0.66 },
    { waveform: 'triangle', frequency: 329.63, duration: 0.15, gain: 0.016, delay: 0 },
    { waveform: 'triangle', frequency: 392, duration: 0.15, gain: 0.016, delay: 0.1 },
    { waveform: 'triangle', frequency: 493.88, duration: 0.16, gain: 0.016, delay: 0.2 },
    { waveform: 'triangle', frequency: 523.25, duration: 0.22, gain: 0.015, delay: 0.48 },
    { waveform: 'sine', frequency: 2093, duration: 0.2, gain: 0.011, delay: 0.74 },
    { waveform: 'sine', frequency: 2637.02, duration: 0.18, gain: 0.009, delay: 0.8 },
  ])
}
