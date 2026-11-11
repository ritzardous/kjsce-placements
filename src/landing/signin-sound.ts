let context: AudioContext | undefined;

/** A short, quiet tap, created only inside an explicit landing sign-in click. */
export function playSignInClick() {
  try {
    if (!window.AudioContext) return;
    context ??= new AudioContext();
    const audio = context;
    void audio.resume().then(() => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = audio.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(620, start);
      oscillator.frequency.exponentialRampToValueAtTime(360, start + .045);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.025, start + .003);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .055);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + .06);
    }).catch(() => { /* Audio availability never blocks Google sign-in. */ });
  } catch { /* Unsupported or blocked audio is optional. */ }
}
