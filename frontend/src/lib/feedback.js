// Retorno tátil/sonoro da leitura — essencial em loja barulhenta.

let audioCtx;

export function beep({ frequency = 1046, duration = 0.09 } = {}) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // sem áudio disponível
  }
}

export function vibrate(pattern = 60) {
  navigator.vibrate?.(pattern);
}

export function scanFeedback() {
  beep();
  vibrate();
}
