let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.stop(ac.currentTime + duration);
}

export const sound = {
  saleComplete() {
    beep(880, 0.12, "sine", 0.06);
    setTimeout(() => beep(1320, 0.18, "sine", 0.06), 110);
  },
  lowStock() {
    beep(330, 0.18, "triangle", 0.07);
    setTimeout(() => beep(247, 0.25, "triangle", 0.07), 160);
  },
  error() {
    beep(196, 0.2, "sawtooth", 0.05);
  },
  barcodeScan() {
    beep(1047, 0.06, "square", 0.04);
  },
  enabled: localStorage.getItem("kirana_sound") !== "off",
};
