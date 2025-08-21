class AssetCache {
  constructor(loadFn = loadImage) {
    this._cache = new Map(); // path -> asset
    this._loadFn = loadFn;
  }
  get(path) {
    return this._cache.get(path) || null;
  }
  has(path) {
    return this._cache.has(path);
  }
  load(path, cb) {
    if (!path) {
      cb?.(null);
      return;
    }
    if (this._cache.has(path)) {
      cb?.(this._cache.get(path));
      return;
    }
    this._loadFn(
      path,
      (asset) => {
        this._cache.set(path, asset);
        cb?.(asset);
      },
      (err) => {
        console.warn("Failed to load:", path, err);
        cb?.(null);
      }
    );
  }
}
window.AssetCache = AssetCache;

class CrossfadeLayer {
  /**
   * @param {Object} opts
   * @param {AssetCache} opts.cache
   * @param {number} opts.fadeMs
   * @param {(img)=>void} [opts.onChange] optional callback when current asset is ready
   * @param {(p5.Image)=>void} [opts.drawFn] how to draw the image
   */
  constructor({ cache, fadeMs = 300, onChange = null, drawFn = null } = {}) {
    this.cache = cache;
    this.fadeMs = fadeMs;
    this.onChange = onChange;
    this.drawFn = drawFn || ((img) => image(img, 0, 0, width, height));

    this.prev = null;
    this.prevPath = null;
    this.cur = null;
    this.curPath = null;

    this.alpha = 255; // 0..255 for current
    this._fade = new Tween({ from: 255, to: 255, dur: fadeMs });
  }

  /** set a new path; handles none -> img, img -> none, same, diff */
  set(path) {
    const had = !!this.curPath;

    // move current to prev
    this.prev = this.cur;
    this.prevPath = this.curPath;

    if (!path) {
      // fade OUT to nothing if we had an image
      this.cur = null;
      this.curPath = null;
      if (had) this._fade.start(0, 255, this.fadeMs);
      // render uses (255 - alpha) for prev
      else this._fade.start(255, 255, 1);
      this.alpha = this._fade.value;
      return;
    }

    // same as current: no transition
    if (had && path === this.curPath) {
      this.prev = null;
      this.prevPath = null;
      this._fade.start(255, 255, 1);
      this.alpha = 255;
      return;
    }

    // load new, crossfade
    this.cache.load(path, (img) => {
      this.cur = img;
      this.curPath = path;
      this._fade.start(0, 255, this.fadeMs); // fade current in
      this.alpha = 0;
      if (typeof this.onChange === "function") this.onChange(img);
    });
  }

  /** Immediately clear current/prev (e.g., at Dialog end for CG) */
  clearInstant() {
    this.prev = null;
    this.prevPath = null;
    this.cur = null;
    this.curPath = null;
    this._fade.active = false;
    this.alpha = 255;
  }

  update() {
    this.alpha = this._fade.update();
  }

  /** Render crossfade; `layerA` lets parent decouple BG from UI alpha */
  render(layerA = 255) {
    if (this.prev && (this._fade.active || this.alpha < 255)) {
      push();
      tint(255, (255 - this.alpha) * (layerA / 255));
      this.drawFn(this.prev);
      pop();
    }
    if (this.cur) {
      push();
      tint(255, this.alpha * (layerA / 255));
      this.drawFn(this.cur);
      pop();
    }
  }
}
window.CrossfadeLayer = CrossfadeLayer;

class Typewriter {
  constructor({ charMs = 20, punctExtraMs = 80 } = {}) {
    this.charMs = charMs;
    this.punctExtraMs = punctExtraMs;
    this.full = "";
    this.visible = 0;
    this.typing = false;
    this._acc = 0;
    this._last = 0;
    this._nextDelay = charMs;
  }

  start(text) {
    this.full = String(text || "");
    this.visible = 0;
    this.typing = this.full.length > 0;
    this._acc = 0;
    this._last = millis();
    this._nextDelay = this.charMs;
  }

  revealAll() {
    this.visible = this.full.length;
    this.typing = false;
  }

  update() {
    if (!this.typing) return;
    const now = millis();
    let dt = now - this._last;
    this._last = now;

    this._acc += dt;
    while (this._acc >= this._nextDelay && this.visible < this.full.length) {
      this._acc -= this._nextDelay;
      this.visible++;
      const ch = this.full[this.visible - 1];
      this._nextDelay = /[\,\.\!\?\:\;]/.test(ch)
        ? this.charMs + this.punctExtraMs
        : this.charMs;
    }
    if (this.visible >= this.full.length) this.typing = false;
  }

  get visibleText() {
    return this.typing ? this.full.substring(0, this.visible) : this.full;
  }
}
window.Typewriter = Typewriter;

class Blinker {
  constructor({ periodMs = 900, min = 64, max = 255 } = {}) {
    this.period = periodMs;
    this.min = min;
    this.max = max;
    this._start = millis();
    this.enabled = false;
  }
  reset() {
    this._start = millis();
  }
  setEnabled(v) {
    this.enabled = !!v;
    if (v) this.reset();
  }
  get alpha() {
    if (!this.enabled) return 0;
    const t = Math.max(0, millis() - this._start);
    const phase = (t % this.period) / this.period;
    const s = 0.5 * (1 + Math.sin(phase * Math.PI * 2 - Math.PI / 2));
    return Math.round(this.min + s * (this.max - this.min));
  }
}
window.Blinker = Blinker;
