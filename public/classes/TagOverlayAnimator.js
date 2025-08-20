class TagOverlayAnimator {
  constructor({
    baseX = 5,
    targetX = 105,
    y = 750,
    w = 100,
    h = 50,
    font = null,
    slideDur = 300,
    fadeDur = 200,
  } = {}) {
    this.baseX = baseX;
    this.targetX = targetX;
    this.y = y;
    this.w = w;
    this.h = h;
    this.font = font;

    // Overlay animation (used under the Clues notebook)
    this.slide = new Tween({ from: 0, to: 1, dur: slideDur });
    this.fade = new Tween({ from: 255, to: 255, dur: fadeDur }); // only used on Clues->Log path

    this.overlayActive = false;
    this.overlayDir = +1; // +1: L->R (Log→Clues, no fade), -1: R->L (Clues→Log, fade in)
    this.screenRect = { x: -9999, y: -9999, w: 0, h: 0 }; // for clickable tag on LOG page
  }

  // Called when clicking the tag on LOG page
  startLogToClues() {
    this.overlayActive = true;
    this.overlayDir = +1;
    this.slide.start(0, 1);
    this.fade.start(255, 255, 1); // keep alpha as-is (no fade)
  }

  // Called when clicking the "log" button on CLUES page
  startCluesToLog() {
    this.overlayActive = true;
    this.overlayDir = -1;
    this.slide.start(0, 1);
    this.fade.start(0, 255); // fade in while sliding back under the book
  }

  update() {
    const tSlide = this.slide.update();
    const alpha = this.fade.update();
    const done = !this.slide.active && !this.fade.active;
    return { tSlide, alpha, done };
  }

  // Draw the stationary clickable tag on LOG page (behind the book)
  drawClickable() {
    const xNow = this.baseX;
    const baseY = this.y - 576;

    // hit rect
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
    text("clues", xNow + this.w / 2, baseY + this.h / 2 - 2);
    pop();
  }

  // Draw the animated overlay tag UNDER the Clues notebook
  drawUnder() {
    const t = this.slide.value;
    const baseY = this.y - 576;

    // Direction mapping
    const x0 = this.overlayDir === -1 ? this.targetX : this.baseX;
    const x1 = this.overlayDir === -1 ? this.baseX : this.targetX;
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
    text("clues", xNow + this.w / 2, baseY + this.h / 2 - 2);
    pop();
  }

  hit(mx, my) {
    const r = this.screenRect;
    return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }
}
window.TagOverlayAnimator = TagOverlayAnimator;
