/**
 * Короткое звуковое уведомление при новом сообщении клиента в чате поддержки.
 * Без аудиофайлов: Web Audio API. Может быть заблокировано политикой автоплея до первого жеста на странице.
 */
let sharedAudioCtx: AudioContext | null = null;

export function playAdminChatCustomerMessageSound(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    sharedAudioCtx ??= new AC();
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const pulse = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    pulse(784, 0, 0.12);
    pulse(1046, 0.14, 0.15);
  } catch {
    // автоплей / контекст недоступен
  }
}
