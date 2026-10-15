class HapticsEngine {
  private lastHapticTime = 0;

  public triggerStrokePulse(enabled: boolean) {
    if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const now = Date.now();
    // Throttle haptic pulses to ~60ms intervals for gentle paper tooth feel
    if (now - this.lastHapticTime < 60) return;
    this.lastHapticTime = now;
    try {
      navigator.vibrate(8);
    } catch {
      // ignore
    }
  }

  public triggerTap(enabled: boolean) {
    if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(14);
    } catch {
      // ignore
    }
  }

  public triggerSuccess(enabled: boolean) {
    if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate([15, 40, 25]);
    } catch {
      // ignore
    }
  }
}

export const hapticsEngine = new HapticsEngine();
