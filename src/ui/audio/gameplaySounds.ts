import { playTonePattern } from './runtime'

export function playCardSelectionSound() {
  playTonePattern([
    { waveform: 'triangle', frequency: 660, duration: 0.06, gain: 0.024 },
    { waveform: 'triangle', frequency: 780, duration: 0.05, gain: 0.02, delay: 0.05 },
  ])
}

export function playCardPlacementSound() {
  playTonePattern([
    { waveform: 'square', frequency: 240, duration: 0.08, gain: 0.03 },
  ])
}

export function playCaptureSound() {
  playTonePattern([
    { waveform: 'sawtooth', frequency: 330, duration: 0.08, gain: 0.028 },
    { waveform: 'sawtooth', frequency: 420, duration: 0.1, gain: 0.024, delay: 0.07 },
  ])
}

export function playWinSound() {
  playTonePattern([
    { waveform: 'triangle', frequency: 523.25, duration: 0.1, gain: 0.03 },
    { waveform: 'triangle', frequency: 659.25, duration: 0.12, gain: 0.028, delay: 0.09 },
    { waveform: 'triangle', frequency: 783.99, duration: 0.16, gain: 0.026, delay: 0.2 },
  ])
}

export function playLoseSound() {
  playTonePattern([
    { waveform: 'square', frequency: 293.66, duration: 0.12, gain: 0.026 },
    { waveform: 'square', frequency: 246.94, duration: 0.14, gain: 0.024, delay: 0.1 },
    { waveform: 'square', frequency: 207.65, duration: 0.18, gain: 0.022, delay: 0.22 },
  ])
}

export function playDrawSound() {
  playTonePattern([
    { waveform: 'triangle', frequency: 392, duration: 0.1, gain: 0.024 },
    { waveform: 'triangle', frequency: 392, duration: 0.1, gain: 0.022, delay: 0.1 },
  ])
}
