let __audioCtx = null;
let __muted = localStorage.getItem('mr_muted') === '1';

function __getCtx() {
  if (!__audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    __audioCtx = new AC();
  }
  if (__audioCtx.state === 'suspended') __audioCtx.resume();
  return __audioCtx;
}

function isMuted() {
  return __muted;
}

function setMuted(value) {
  __muted = !!value;
  localStorage.setItem('mr_muted', __muted ? '1' : '0');
}

function toggleMuted() {
  setMuted(!__muted);
  return __muted;
}

function playSeed() {
  if (__muted) return;
  const ac = __getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.18, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.08);
}

function playTick() {
  if (__muted) return;
  const ac = __getCtx();
  if (!ac) return;
  const bufferSize = Math.floor(ac.sampleRate * 0.15);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const gain = ac.createGain();
  gain.gain.value = 0.12;
  noise.connect(filter).connect(gain).connect(ac.destination);
  noise.start();
  noise.stop(ac.currentTime + 0.15);
}

function playWin() {
  if (__muted) return;
  const ac = __getCtx();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const t = ac.currentTime + i * 0.2;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
