class TagOverlayAnimator {
  constructor({
    label = "clues",
    baseX = 5, // stationary/clickable x
    y = 750, // image-space y (notebook strip)
    w = 100,
    h = 50,
    font = null,

    // NEW: Animation direction helper
    aniDirection = "LTR", // "LTR" or "RTL"

    // Optional explicit overrides (if omitted we auto-compute from aniDirection)
    overlayStartX = null,
    overlayEndX = null,

    slideDur = 300,
  } = {}) {
    this.label = label;
    this.baseX = baseX;
    this.y = y;
    this.w = w;
    this.h = h;
    this.font = font;

    // Auto-compute start/end if not provided, based on direction
    // LTR:  start = baseX, end = baseX + w
    // RTL:  start = baseX, end = baseX - w
    this.aniDirection = aniDirection;
    const autoStart = this.aniDirection === "RTL" ? baseX - w : baseX;
    const autoEnd = this.aniDirection === "RTL" ? baseX : baseX + w;

    this.overlayStartX = overlayStartX ?? autoStart;
    this.overlayEndX = overlayEndX ?? autoEnd;

    this.slide = new Tween({ from: 0, to: 1, dur: slideDur });

    this.overlayActive = false;
    // +1 = forward (start->end), -1 = reverse (end->start)
    this.overlayDir = +1;

    this.screenRect = { x: -9999, y: -9999, w: 0, h: 0 };
  }

  // Forward (start -> end)
  startEntrance() {
    this.overlayActive = true;
    this.overlayDir = +1;
    this.slide.start(0, 1);
  }

  // Reverse (end -> start)
  startReverse() {
    this.overlayActive = true;
    this.overlayDir = -1;
    this.slide.start(0, 1);
  }

  // Kept for backward compatibility with your existing calls
  startReverseWithFade() {
    // same as startReverse, but no fading anymore
    this.startReverse();
  }

  update() {
    const tSlide = this.slide.update();
    const done = !this.slide.active;
    return { tSlide, done };
  }

  // Stationary tag behind the notebook (click target)
  drawClickable() {
    const xNow = this.baseX;
    const baseY = this.y - height; // map image-space to screen

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

  // Under-notebook animated overlay (now always fully opaque; no fading)
  drawUnder() {
    const t = this.slide.value;
    const baseY = this.y - height;

    const x0 = this.overlayDir === -1 ? this.overlayEndX : this.overlayStartX;
    const x1 = this.overlayDir === -1 ? this.overlayStartX : this.overlayEndX;
    const xNow = lerp(x0, x1, t);

    push();
    noStroke();
    // subtle drop shadow
    fill(0, 0, 0, 120);
    rect(xNow + 3, baseY + 3, this.w, this.h);
    // solid tag
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

  hit(mx, my) {
    const r = this.screenRect;
    return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }
}
window.TagOverlayAnimator = TagOverlayAnimator;
