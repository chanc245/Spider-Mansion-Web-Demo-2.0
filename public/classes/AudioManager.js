// public/classes/AudioManager.js
class AudioManager {
  constructor({ masterVolume = 1.0 } = {}) {
    this._audios = new Map(); // path -> HTMLAudioElement
    this._fades = new Map(); // path -> cancel fn
    this._baseVolumes = new Map(); // path -> base 0..1 (pre-master)
    this.masterVolume = masterVolume;
  }

  _applyMaster(v) {
    const vol = Math.max(0, Math.min(1, v));
    const mv = Math.max(0, Math.min(1, this.masterVolume));
    return vol * mv;
  }

  _ensure(path, { loop = false, volume = 1.0 } = {}) {
    let a = this._audios.get(path);
    const base = Math.max(0, Math.min(1, volume));
    if (!a) {
      try {
        a = new Audio(path);
        a.loop = !!loop;
        a.preload = "auto";
        this._audios.set(path, a);
      } catch {
        return null;
      }
    } else {
      a.loop = !!loop;
    }
    // always update base + actual
    this._baseVolumes.set(path, base);
    try {
      a.volume = this._applyMaster(base);
    } catch {}
    return a;
  }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    // Re-apply preserving each audio's base volume
    for (const [path, a] of this._audios.entries()) {
      const base = this._baseVolumes.get(path) ?? 1;
      try {
        a.volume = this._applyMaster(base);
      } catch {}
    }
  }

  load(path, { loop = false, volume = 1.0 } = {}) {
    return this._ensure(path, { loop, volume });
  }

  play(path, { loop = false, volume = 1.0, from = 0 } = {}) {
    const a = this._ensure(path, { loop, volume });
    if (!a) return;
    this._cancelFade(path);
    try {
      if (!Number.isNaN(from)) a.currentTime = Math.max(0, from);
      const base = Math.max(0, Math.min(1, volume));
      this._baseVolumes.set(path, base);
      a.volume = this._applyMaster(base);
      a.play().catch(() => {});
    } catch {}
  }

  /** Stop a single sound; optional fade in ms. */
  stop(path, { fadeMs = 0 } = {}) {
    const a = this._audios.get(path);
    if (!a) return;
    if (!fadeMs || fadeMs <= 0) {
      this._cancelFade(path);
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      return;
    }
    this._fadeOut(path, fadeMs);
  }

  /** Stop every loaded/played sound; optional fade in ms. */
  stopAll({ fadeMs = 0 } = {}) {
    for (const path of this._audios.keys()) {
      this.stop(path, { fadeMs });
    }
  }

  setVolume(path, volume) {
    const a = this._audios.get(path);
    if (!a) return;
    this._cancelFade(path);
    const base = Math.max(0, Math.min(1, volume));
    this._baseVolumes.set(path, base);
    try {
      a.volume = this._applyMaster(base);
    } catch {}
  }

  isPlaying(path) {
    const a = this._audios.get(path);
    if (!a) return false;
    return !a.paused && !a.ended;
  }

  _fadeOut(path, durationMs) {
    const a = this._audios.get(path);
    if (!a) return;
    this._cancelFade(path);

    let start = null;
    const startVol = typeof a.volume === "number" ? a.volume : 1;

    const tick = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / Math.max(1, durationMs));
      const vol = startVol * (1 - t);
      try {
        a.volume = Math.max(0, vol);
      } catch {}
      if (t < 1) {
        const id = requestAnimationFrame(tick);
        this._fades.set(path, () => cancelAnimationFrame(id));
      } else {
        try {
          a.pause();
          a.currentTime = 0;
          a.volume = this._applyMaster(1);
        } catch {}
        this._fades.delete(path);
      }
    };

    const id = requestAnimationFrame(tick);
    this._fades.set(path, () => cancelAnimationFrame(id));
  }

  _cancelFade(path) {
    const cancel = this._fades.get(path);
    if (cancel) {
      try {
        cancel();
      } catch {}
      this._fades.delete(path);
    }
  }
}

window.AudioManager = AudioManager;
