class Dialog {
  /**
   * VN-style dialog box.
   * Name box: (x+14, y+9,  w=112, h=25) centered
   * Text box: (x+30, y+42, w=690, h=80) left/top
   *
   * Per-line fields: { bg, text, charCG, soundEffect, charName, stopSound, fadeSoundMs }
   * - stopSound can be:
   *    - string: "path" or "ALL"
   *    - object: { path: "path" | "ALL", fadeMs: number }
   * - If fadeSoundMs (number) is present on the line, it applies to stopSound when given as a string.
   */
  constructor(opts = {}) {
    // Box placement
    this.x = opts.x ?? 137;
    this.y = opts.y ?? 396;
    this.w = opts.w ?? 750;
    this.h = opts.h ?? 141;
    this.boxImagePath = opts.boxImage ?? "assets/ui_diaBox.png";

    // Font (Lexend by default)
    this.fontPath =
      opts.fontPath ?? "assets/fonts/Lexend-VariableFont_wght.ttf";
    this.font = null;

    // Text metrics
    this.textSize = opts.textSize ?? 20;
    this.leading = opts.leading ?? 26;
    this.nameSize = opts.nameSize ?? 20;

    // Overall dialog fade
    this.fadeInMs = opts.fadeInMs ?? 250;
    this.fadeOutMs = opts.fadeOutMs ?? 200;
    this.alpha = 0;
    this._fade = new Tween({ from: 0, to: 255, dur: this.fadeInMs });
    this._fadingOut = false;

    // Character CG transitions
    this.cgFadeMs = opts.cgFadeMs ?? 250;
    this.cgAlpha = 10; // keep your timing tweak
    this._cgFade = new Tween({ from: 255, to: 255, dur: this.cgFadeMs });

    // Background transitions
    this.bgFadeMs = opts.bgFadeMs ?? 300;
    this.bgAlpha = 0; // keep your timing tweak
    this._bgFade = new Tween({ from: 255, to: 255, dur: this.bgFadeMs });

    // Script & state
    this.script = [];
    this.index = 0;
    this._running = false;
    this._finished = false;
    this.onFinish = null;

    // Assets caches
    this.boxImg = null;
    this._imgCache = new Map(); // bg cache
    this._cgCache = new Map(); // cg cache
    this._audioCache = new Map(); // path -> HTMLAudioElement

    // Track active fades to prevent conflicts: path -> cancel function
    this._audioFades = new Map();

    // Current visuals (BG)
    this.prevBg = null;
    this.curBg = null;
    this.prevBgPath = null;
    this.curBgPath = null;

    // Current visuals (CG)
    this.prevCG = null;
    this.curCG = null;
    this.prevCGPath = null;
    this.curCGPath = null;

    // UI rects (relative to box)
    this._nameRect = { ox: 14, oy: 9, w: 112, h: 25 };
    this._textRect = { ox: 30, oy: 42, w: 690, h: 80 };

    // Fixed CG placement & size
    this._cgX = 207;
    this._cgY = 0;
    this._cgW = 610;
    this._cgH = 576;
  }

  preload() {
    this.boxImg = loadImage(this.boxImagePath);
    this.font = loadFont(this.fontPath);
  }

  setScript(lines) {
    this.script = Array.isArray(lines) ? lines.slice() : [];
    this.index = 0;
    this._finished = false;
  }

  start() {
    if (!this.script.length) {
      this._running = false;
      this._finished = true;
      if (typeof this.onFinish === "function") this.onFinish();
      return;
    }
    this._running = true;
    this._finished = false;
    this._fadingOut = false;

    this.alpha = 0;
    this._fade.start(0, 255, this.fadeInMs);

    this._applyLine(this.script[this.index], /*isFirst*/ true);
  }

  update() {
    if (!this._running && !this._fadingOut) return;

    // Overall dialog fade
    this.alpha = this._fade.update();

    // Tweens
    this.cgAlpha = this._cgFade.update();
    this.bgAlpha = this._bgFade.update();

    // Done fading out whole dialog?
    if (this._fadingOut && !this._fade.active && this.alpha <= 1) {
      this._fadingOut = false;
      this._running = false;
      this._finished = true;
      if (typeof this.onFinish === "function") this.onFinish();
    }
  }

  render() {
    if (!this._running && !this._fadingOut) return;

    const globalA = this.alpha; // multiply sub-layers for coherent fades

    // ---------- Background crossfade ----------
    if (this.prevBg && (this._bgFade.active || this.bgAlpha < 255)) {
      push();
      tint(255, (255 - this.bgAlpha) * (globalA / 255));
      image(this.prevBg, 0, 0, width, height);
      pop();
    }
    if (this.curBg) {
      push();
      tint(255, this.bgAlpha * (globalA / 255));
      image(this.curBg, 0, 0, width, height);
      pop();
    }

    // ---------- Character CG (first=fade in, CG->CG=instant swap, CG->none=fade out) ----------
    if (this.prevCG && (this._cgFade.active || this.cgAlpha < 255)) {
      push();
      tint(255, (255 - this.cgAlpha) * (globalA / 255));
      image(this.prevCG, this._cgX, this._cgY, this._cgW, this._cgH);
      pop();
    }
    if (this.curCG) {
      push();
      tint(255, this.cgAlpha * (globalA / 255));
      image(this.curCG, this._cgX, this._cgY, this._cgW, this._cgH);
      pop();
    }

    // ---------- Dialog box ----------
    push();
    const a = globalA;
    if (this.boxImg) {
      tint(255, a);
      image(this.boxImg, this.x, this.y, this.w, this.h);
    } else {
      noStroke();
      fill(255, 255, 255, a);
      rect(this.x, this.y, this.w, this.h, 10);
      stroke(0, 0, 0, a);
      noFill();
      rect(this.x, this.y, this.w, this.h, 10);
    }

    const cur = this.script[this.index];

    // Name
    if (cur && cur.charName) {
      const nr = this._nameRect;
      const nx = this.x + nr.ox;
      const ny = this.y + nr.oy;
      const nw = nr.w;
      const nh = nr.h;

      if (this.font) textFont(this.font);
      textSize(this.nameSize);
      textLeading(this.nameSize * 1.25);
      textAlign(CENTER, CENTER);
      noStroke();
      fill(0, 0, 0, a);
      text(cur.charName, nx, ny, nw, nh);
    }

    // Body
    if (cur && cur.text) {
      const tr = this._textRect;
      const tx = this.x + tr.ox;
      const ty = this.y + tr.oy;
      const tw = tr.w;
      const th = tr.h;

      if (this.font) textFont(this.font);
      textSize(this.textSize);
      textLeading(this.leading);
      textAlign(LEFT, TOP);
      noStroke();
      fill(0, 0, 0, a);

      const lines = this._wrap(cur.text, tw);
      const maxLines = Math.max(1, Math.floor(th / this.leading));
      for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        text(lines[i], tx, ty + i * this.leading);
      }
    }
    pop();
  }

  next() {
    if (!this._running) return;

    this.index++;

    if (this.index >= this.script.length) {
      // Fade out the whole dialog at the end
      this._fadingOut = true;
      this._fade.start(this.alpha, 0, this.fadeOutMs);
      return;
    }

    this._applyLine(this.script[this.index], /*isFirst*/ false);

    // If we advanced during a partial dialog fade-out, re-brighten quickly
    if (this.alpha < 200 && !this._fadingOut) {
      this._fade.start(this.alpha, 255, Math.max(120, this.fadeInMs * 0.5));
    }
  }

  mousePressed() {
    if (this._running) this.next();
  }
  keyPressed(k = key) {
    if (this._running && (k === " " || k === "Enter")) this.next();
  }

  isActive() {
    return this._running;
  }
  isFinished() {
    return this._finished;
  }

  // ---------- internal ----------

  _applyLine(line, isFirst) {
    // --- BG CROSSFADE POLICY ---
    const newBgPath = line.bg || null;
    const hadBg = !!this.curBgPath;

    this.prevBg = this.curBg;
    this.prevBgPath = this.curBgPath;

    if (!newBgPath) {
      this.curBg = null;
      this.curBgPath = null;
      if (hadBg) {
        this._bgFade.start(0, 255, this.bgFadeMs); // render uses (255-bgAlpha) on prev
        this.bgAlpha = 0;
      } else {
        this._bgFade.start(255, 255, 1);
        this.bgAlpha = 255;
      }
    } else if (hadBg && newBgPath === this.curBgPath) {
      this.prevBg = null;
      this.prevBgPath = null;
      this._bgFade.start(255, 255, 1);
      this.bgAlpha = 255;
    } else {
      this._loadImage(newBgPath, this._imgCache, (img) => {
        this.curBg = img;
        this.curBgPath = newBgPath;
        this._bgFade.start(0, 255, this.bgFadeMs);
        this.bgAlpha = 0;
      });
    }

    // --- STOP SOUND (with optional fade) ---
    if (line.stopSound) {
      const { path, fadeMs } = this._normalizeStopSound(
        line.stopSound,
        line.fadeSoundMs
      );
      if (path === "ALL") this._stopAllSfx(fadeMs);
      else this._stopSfx(path, fadeMs);
    }

    // --- PLAY SOUND ---
    if (line.soundEffect) this._playSfx(line.soundEffect);

    // --- CG POLICY (first CG fades in; CG->CG instant swap; CG->none fades out) ---
    const newCGPath = line.charCG || null;
    const hadPrevCG = !!this.curCGPath;

    if (!newCGPath) {
      if (hadPrevCG) {
        this.prevCG = this.curCG;
        this.prevCGPath = this.curCGPath;
        this.curCG = null;
        this.curCGPath = null;
        this._cgFade.start(0, 255, this.cgFadeMs); // use 255-cgAlpha on prev in render
        this.cgAlpha = 0;
      } else {
        this.prevCG = null;
        this.prevCGPath = null;
        this._cgFade.start(255, 255, 1);
        this.cgAlpha = 255;
      }
    } else if (!hadPrevCG) {
      // first CG: fade in
      this.prevCG = null;
      this.prevCGPath = null;
      this._loadImage(newCGPath, this._cgCache, (img) => {
        this.curCG = img;
        this.curCGPath = newCGPath;
        this._cgFade.start(0, 255, this.cgFadeMs);
        this.cgAlpha = 0;
      });
    } else {
      // CG -> CG : instant swap (no fade)
      this.prevCG = null;
      this.prevCGPath = null;
      this._cgFade.start(255, 255, 1);
      this.cgAlpha = 255;

      if (newCGPath === this.curCGPath) return;
      const keep = this.curCG;
      const keepPath = this.curCGPath;
      this._loadImage(newCGPath, this._cgCache, (img) => {
        this.curCG = img || keep;
        this.curCGPath = img ? newCGPath : keepPath;
      });
    }
  }

  _loadImage(path, cache, setCb) {
    if (cache.has(path)) {
      setCb(cache.get(path));
      return;
    }
    loadImage(
      path,
      (img) => {
        cache.set(path, img);
        setCb(img);
      },
      (err) => {
        console.warn("Failed to load image:", path, err);
        setCb(null);
      }
    );
  }

  _playSfx(path) {
    let audio = this._audioCache.get(path);
    if (!audio) {
      try {
        audio = new Audio(path);
        this._audioCache.set(path, audio);
      } catch {
        return;
      }
    }
    // If a fade-out was running for this sound, cancel it before playing again
    this._cancelFade(path);

    try {
      audio.currentTime = 0;
      // Restore to full volume if a previous fade reduced it
      if (typeof audio.volume === "number") audio.volume = 1;
      audio.play().catch(() => {});
    } catch {}
  }

  _normalizeStopSound(stopSound, fallbackFadeMs) {
    // Returns { path: "path" | "ALL", fadeMs: number | null }
    if (typeof stopSound === "string") {
      return {
        path: stopSound,
        fadeMs: typeof fallbackFadeMs === "number" ? fallbackFadeMs : null,
      };
    }
    if (stopSound && typeof stopSound === "object") {
      const path = stopSound.path ?? "ALL";
      const fadeMs =
        typeof stopSound.fadeMs === "number"
          ? stopSound.fadeMs
          : typeof fallbackFadeMs === "number"
          ? fallbackFadeMs
          : null;
      return { path, fadeMs };
    }
    return {
      path: "ALL",
      fadeMs: typeof fallbackFadeMs === "number" ? fallbackFadeMs : null,
    };
  }

  _stopSfx(path, fadeMs = null) {
    const audio = this._audioCache.get(path);
    if (!audio) return;

    if (!fadeMs || fadeMs <= 0) {
      // immediate stop
      this._cancelFade(path);
      try {
        audio.pause();
        audio.currentTime = 0;
        if (typeof audio.volume === "number") audio.volume = 1;
      } catch {}
      return;
    }
    // fade out
    this._fadeOutSfx(path, fadeMs);
  }

  _stopAllSfx(fadeMs = null) {
    for (const [path] of this._audioCache.entries()) {
      this._stopSfx(path, fadeMs);
    }
  }

  _fadeOutSfx(path, durationMs) {
    const audio = this._audioCache.get(path);
    if (!audio) return;

    this._cancelFade(path);

    let start = null;
    const startVol = typeof audio.volume === "number" ? audio.volume : 1;

    const tick = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / Math.max(1, durationMs));
      const vol = startVol * (1 - t);
      try {
        if (typeof audio.volume === "number") audio.volume = Math.max(0, vol);
      } catch {}
      if (t < 1) {
        const id = requestAnimationFrame(tick);
        this._audioFades.set(path, () => cancelAnimationFrame(id));
      } else {
        // finished
        try {
          audio.pause();
          audio.currentTime = 0;
          if (typeof audio.volume === "number") audio.volume = 1; // reset for next play
        } catch {}
        this._audioFades.delete(path);
      }
    };

    const id = requestAnimationFrame(tick);
    this._audioFades.set(path, () => cancelAnimationFrame(id));
  }

  _cancelFade(path) {
    const cancel = this._audioFades.get(path);
    if (cancel) {
      try {
        cancel();
      } catch {}
      this._audioFades.delete(path);
    }
  }

  _wrap(textStr, maxWidth) {
    if (this.font) textFont(this.font);
    textSize(this.textSize);
    const words = String(textStr).split(/\s+/);
    const out = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (textWidth(test) <= maxWidth) line = test;
      else {
        if (line) out.push(line);
        if (textWidth(w) > maxWidth) {
          let chunk = "";
          for (const ch of Array.from(w)) {
            const t = chunk + ch;
            if (textWidth(t) <= maxWidth) chunk = t;
            else {
              if (chunk) out.push(chunk);
              chunk = ch;
            }
          }
          line = chunk;
        } else line = w;
      }
    }
    if (line) out.push(line);
    return out;
  }
}
window.Dialog = Dialog;
