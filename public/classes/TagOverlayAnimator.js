// public/classes/TagOverlayAnimator.js
class TagOverlayAnimator {
  constructor({
    label = "clues",
    // Stationary/clickable location (drawn behind the notebook)
    baseX = 5,
    y = 750,
    w = 100,
    h = 50,
    font = null,
    // Overlay animation path (drawn UNDER the notebook while animating).
    // Default to sweeping from baseX → targetX (like the left-side tags).
    overlayStartX = null,
    overlayEndX = null,
    slideDur = 300,
    fadeDur = 200,
  } = {}) {
    this.label = label;

    // Stationary placement
    this.baseX = baseX;
    this.y = y;
    this.w = w;
    this.h = h;
    this.font = font;

    // Overlay path
    this.overlayStartX = overlayStartX ?? baseX;
    this.overlayEndX = overlayEndX ?? baseX + 100; // sensible default

    // Tweens
    this.slide = new Tween({ from: 0, to: 1, dur: slideDur });
    this.fade = new Tween({ from: 255, to: 255, dur: fadeDur }); // used for reverse/fade-in

    // State for overlay
    this.overlayActive = false;
    // +1: "entrance" along overlayStartX → overlayEndX (no fade change)
    // -1: "reverse"  along overlayEndX   → overlayStartX (fade in)
    this.overlayDir = +1;

    // Hit rect for stationary tag
    this.screenRect = { x: -9999, y: -9999, w: 0, h: 0 };
  }

  // Play entrance sweep (overlayStartX -> overlayEndX), keep current alpha
  startEntrance() {
    this.overlayActive = true;
    this.overlayDir = +1;
    this.slide.start(0, 1);
    this.fade.start(255, 255, 1);
  }

  // Play reverse sweep (overlayEndX -> overlayStartX), fade in as it moves
  startReverseWithFade() {
    this.overlayActive = true;
    this.overlayDir = -1;
    this.slide.start(0, 1);
    this.fade.start(0, 255);
  }

  update() {
    const tSlide = this.slide.update();
    const alpha = this.fade.update();
    const done = !this.slide.active && !this.fade.active;
    return { tSlide, alpha, done };
  }

  // Stationary, clickable tag rendered behind the notebook
  drawClickable() {
    const xNow = this.baseX;
    const baseY = this.y - 576;

    this.screenRect = { x: xNow, y: baseY, w: this.w, h: this.h };

    push();
    noStroke();
    fill(0, 0, 0, 120);
    rect(xNow + 3, baseY + 3, this.w, this.h);
    fill(255);
    rect(xNow, baseY, this.w, this.h);
    if (this.font) textFont(this.font);
    textSize(30);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text(this.label, xNow + this.w / 2, baseY + this.h / 2 - 2);
    pop();
  }

  // Animated overlay under the notebook
  drawUnder() {
    const t = this.slide.value;
    const baseY = this.y - 576;

    const x0 = this.overlayDir === -1 ? this.overlayEndX : this.overlayStartX;
    const x1 = this.overlayDir === -1 ? this.overlayStartX : this.overlayEndX;
    const xNow = lerp(x0, x1, t);

    push();
    noStroke();
    fill(0, 0, 0, 120 * (this.fade.value / 255));
    rect(xNow + 3, baseY + 3, this.w, this.h);
    fill(255, 255, 255, this.fade.value);
    rect(xNow, baseY, this.w, this.h);
    if (this.font) textFont(this.font);
    textSize(30);
    noStroke();
    fill(0, 0, 0, this.fade.value);
    textAlign(CENTER, CENTER);
    text(this.label, xNow + this.w / 2, baseY + this.h / 2 - 2);
    pop();
  }

  hit(mx, my) {
    const r = this.screenRect;
    return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }
}

window.TagOverlayAnimator = TagOverlayAnimator;
