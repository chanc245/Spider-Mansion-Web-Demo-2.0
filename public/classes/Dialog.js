// public/classes/Dialog.js
class Dialog {
  /**
   * VN-style dialog box with typewriter text + blinking advance arrow.
   * Name box: (x+14, y+9,  w=112, h=25) centered
   * Text box: (x+30, y+42, w=690, h=80) left/top
   *
   * Per-line fields:
   * { bg, text, charCG, soundEffect, charName, stopSound, fadeSoundMs }
   *
   * Audio is delegated to an injected AudioManager instance via opts.audio.
   */
  constructor(opts = {}) {
    // Injected audio manager (optional but recommended)
    this.audio = opts.audio ?? null;

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

    // Typewriter options
    this.charMs = opts.charMs ?? 20;
    this.punctExtraMs = opts.punctExtraMs ?? 80;
    this._typing = false;
    this._fullText = "";
    this._visibleChars = 0;
    this._typeAccMs = 0;
    this._lastTypeTs = 0;
    this._nextDelayMs = this.charMs;

    // Blinking advance arrow
    this.arrowBlinkPeriodMs = opts.arrowBlinkPeriodMs ?? 900;
    this.arrowAlpha = 0;
    this.showArrow = false;
    this._arrowStartMs = 0;

    // Overall dialog fade (UI/CG)
    this.fadeInMs = opts.fadeInMs ?? 250;
    this.fadeOutMs = opts.fadeOutMs ?? 200;
    this.alpha = 0;
    this._fade = new Tween({ from: 0, to: 255, dur: this.fadeInMs });
    this._fadingOut = false;

    // Character CG transitions
    this.cgFadeMs = opts.cgFadeMs ?? 250;
    this.cgAlpha = 10;
    this._cgFade = new Tween({ from: 255, to: 255, dur: this.cgFadeMs });

    // Background transitions
    this.bgFadeMs = opts.bgFadeMs ?? 300;
    this.bgAlpha = 0;
    this._bgFade = new Tween({ from: 255, to: 255, dur: this.bgFadeMs });

    // Preserve last BG at end to avoid flash
    this.preserveBgOnEnd = true;
    this._uiOnlyFade = false;
    this.holdBgAfterFinishMs = opts.holdBgAfterFinishMs ?? 150; // buffer frames
    this._holdBgUntil = 0;

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
    this._uiOnlyFade = false;
    this._holdBgUntil = 0;

    this.alpha = 0;
    this._fade.start(0, 255, this.fadeInMs);

    this._applyLine(this.script[this.index], true);
  }

  update() {
    const stillHoldingBg =
      this._holdBgUntil &&
      millis() < this._holdBgUntil &&
      (this.curBg || this.prevBg);

    if (!this._running && !this._fadingOut && !stillHoldingBg) return;

    this.alpha = this._fade.update();
    this.cgAlpha = this._cgFade.update();
    this.bgAlpha = this._bgFade.update();

    this._updateTyping();
    this._updateArrowBlink();

    if (this._fadingOut && !this._fade.active && this.alpha <= 1) {
      this._fadingOut = false;
      this._running = false;
      this._finished = true;
      if (typeof this.onFinish === "function") this.onFinish();
    }
  }

  render() {
    const stillHoldingBg =
      this._holdBgUntil &&
      millis() < this._holdBgUntil &&
      (this.curBg || this.prevBg);

    if (!this._running && !this._fadingOut && !stillHoldingBg) return;

    const globalA = this.alpha;
    let bgLayerA = globalA;
    if (this._fadingOut && this._uiOnlyFade) bgLayerA = 255;
    else if (!this._running && !this._fadingOut && stillHoldingBg)
      bgLayerA = 255;

    // --- BG crossfade ---
    if (this.prevBg && (this._bgFade.active || this.bgAlpha < 255)) {
      push();
      tint(255, (255 - this.bgAlpha) * (bgLayerA / 255));
      image(this.prevBg, 0, 0, width, height);
      pop();
    }
    if (this.curBg) {
      push();
      tint(255, this.bgAlpha * (bgLayerA / 255));
      image(this.curBg, 0, 0, width, height);
      pop();
    }

    // If only holding BG, skip CG/UI
    if (!this._running && !this._fadingOut && stillHoldingBg) return;

    // --- CG (first in = fade in, CG->CG = instant, CG->none = fade out) ---
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

    // --- Dialog box (UI) ---
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
      const nx = this.x + nr.ox,
        ny = this.y + nr.oy;
      if (this.font) textFont(this.font);
      textSize(this.nameSize);
      textLeading(this.nameSize * 1.25);
      textAlign(CENTER, CENTER);
      noStroke();
      fill(0, 0, 0, a);
      text(cur.charName, nx, ny, nr.w, nr.h);
    }

    // Body (typewriter)
    if (cur && typeof cur.text === "string") {
      const tr = this._textRect;
      const tx = this.x + tr.ox,
        ty = this.y + tr.oy;
      if (this.font) textFont(this.font);
      textSize(this.textSize);
      textLeading(this.leading);
      textAlign(LEFT, TOP);
      noStroke();
      fill(0, 0, 0, a);

      const toShow = this._typing
        ? this._fullText.substring(0, this._visibleChars)
        : this._fullText;

      const lines = this._wrap(toShow, tr.w);
      const maxLines = Math.max(1, Math.floor(tr.h / this.leading));
      for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        text(lines[i], tx, ty + i * this.leading);
      }
    }

    // Advance arrow
    if (this.showArrow && a > 0) {
      const ax = this.x + this.w - 18;
      const ay = this.y + this.h - 15;
      textAlign(RIGHT, BOTTOM);
      if (this.font) textFont(this.font);
      textSize(24);
      noStroke();
      fill(0, 0, 0, Math.min(255, this.arrowAlpha * (a / 255)));
      text(">", ax, ay);
    }
    pop();
  }

  next() {
    if (!this._running) return;

    if (this._typing && this._visibleChars < this._fullText.length) {
      this._revealAll();
      return;
    }

    this.index++;
    if (this.index >= this.script.length) {
      // End: remove CG instantly, fade UI only, hold BG a moment
      this._clearCgImmediately();
      this._fadingOut = true;
      this._uiOnlyFade = !!this.preserveBgOnEnd;
      this._holdBgUntil = millis() + this.holdBgAfterFinishMs;
      this._fade.start(this.alpha, 0, this.fadeOutMs);
      return;
    }

    this._applyLine(this.script[this.index], false);

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

  _applyLine(line) {
    // --- BG crossfade ---
    const newBgPath = line.bg || null;
    const hadBg = !!this.curBgPath;

    this.prevBg = this.curBg;
    this.prevBgPath = this.curBgPath;

    if (!newBgPath) {
      this.curBg = null;
      this.curBgPath = null;
      if (hadBg) {
        this._bgFade.start(0, 255, this.bgFadeMs);
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

    // --- stop sound (optional fade) ---
    if (this.audio && line.stopSound) {
      const { path, fadeMs } = this._normalizeStopSound(
        line.stopSound,
        line.fadeSoundMs
      );
      if (path === "ALL") this.audio.stopAll({ fadeMs: fadeMs ?? 0 });
      else this.audio.stop(path, { fadeMs: fadeMs ?? 0 });
    }

    // --- play sound ---
    if (this.audio && line.soundEffect) {
      this.audio.play(line.soundEffect, { loop: false, volume: 1, from: 0 });
    }

    // --- CG policy ---
    const newCGPath = line.charCG || null;
    const hadPrevCG = !!this.curCGPath;

    if (!newCGPath) {
      if (hadPrevCG) {
        this.prevCG = this.curCG;
        this.prevCGPath = this.curCGPath;
        this.curCG = null;
        this.curCGPath = null;
        this._cgFade.start(0, 255, this.cgFadeMs);
        this.cgAlpha = 0;
      } else {
        this.prevCG = null;
        this.prevCGPath = null;
        this._cgFade.start(255, 255, 1);
        this.cgAlpha = 255;
      }
    } else if (!hadPrevCG) {
      this.prevCG = null;
      this.prevCGPath = null;
      this._loadImage(newCGPath, this._cgCache, (img) => {
        this.curCG = img;
        this.curCGPath = newCGPath;
        this._cgFade.start(0, 255, this.cgFadeMs);
        this.cgAlpha = 0;
      });
    } else {
      this.prevCG = null;
      this.prevCGPath = null;
      this._cgFade.start(255, 255, 1);
      this.cgAlpha = 255;

      if (newCGPath !== this.curCGPath) {
        const keep = this.curCG;
        const keepPath = this.curCGPath;
        this._loadImage(newCGPath, this._cgCache, (img) => {
          this.curCG = img || keep;
          this.curCGPath = img ? newCGPath : keepPath;
        });
      }
    }

    // --- Typewriter ---
    const textStr = typeof line.text === "string" ? line.text : "";
    this._startTyping(textStr);
  }

  _clearCgImmediately() {
    this._cgFade.active = false;
    this.cgAlpha = 255;
    this.prevCG = null;
    this.prevCGPath = null;
    this.curCG = null;
    this.curCGPath = null;
  }

  _startTyping(textStr) {
    this._fullText = textStr;
    this._visibleChars = 0;
    this._typing = textStr.length > 0;
    this._typeAccMs = 0;
    this._lastTypeTs = millis();
    this._nextDelayMs = this.charMs;

    this.showArrow = !this._typing;
    this._arrowStartMs = millis();
  }

  _updateTyping() {
    if (!this._typing) return;
    const now = millis();
    let dt = now - this._lastTypeTs;
    this._lastTypeTs = now;

    this._typeAccMs += dt;
    while (
      this._typeAccMs >= this._nextDelayMs &&
      this._visibleChars < this._fullText.length
    ) {
      this._typeAccMs -= this._nextDelayMs;
      this._visibleChars++;

      const ch = this._fullText[this._visibleChars - 1];
      this._nextDelayMs = /[\,\.\!\?\:\;]/.test(ch)
        ? this.charMs + this.punctExtraMs
        : this.charMs;
    }

    if (this._visibleChars >= this._fullText.length) {
      this._typing = false;
      this.showArrow = true;
      this._arrowStartMs = millis();
    }
  }

  _revealAll() {
    this._visibleChars = this._fullText.length;
    this._typing = false;
    this.showArrow = true;
    this._arrowStartMs = millis();
  }

  _updateArrowBlink() {
    if (!this.showArrow) {
      this.arrowAlpha = 0;
      return;
    }
    const t = Math.max(0, millis() - this._arrowStartMs);
    const phase = (t % this.arrowBlinkPeriodMs) / this.arrowBlinkPeriodMs;
    const s = 0.5 * (1 + Math.sin(phase * Math.PI * 2 - Math.PI / 2));
    this.arrowAlpha = Math.round(64 + s * 191);
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

  _normalizeStopSound(stopSound, fallbackFadeMs) {
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
