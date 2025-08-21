class TagOverlayAnimator {
  constructor({
    label = "clues",
    baseX = 5, // stationary/clickable x
    y = 750, // image-space y (notebook strip)
    w = 100,
    h = 50,
    font = null,
    overlayStartX = null,
    overlayEndX = null,
    slideDur = 300,
    fadeDur = 200,
  } = {}) {
    this.label = label;
    this.baseX = baseX;
    this.y = y;
    this.w = w;
    this.h = h;
    this.font = font;

    this.overlayStartX = overlayStartX ?? baseX;
    this.overlayEndX = overlayEndX ?? baseX + 100;

    this.slide = new Tween({ from: 0, to: 1, dur: slideDur });
    this.fade = new Tween({ from: 255, to: 255, dur: fadeDur });

    this.overlayActive = false;
    this.overlayDir = +1;

    this.screenRect = { x: -9999, y: -9999, w: 0, h: 0 };
  }

  startEntrance() {
    this.overlayActive = true;
    this.overlayDir = +1;
    this.slide.start(0, 1);
    this.fade.start(255, 255, 1);
  }

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

  // Stationary tag behind the notebook
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

  // Under-notebook animated overlay
  drawUnder() {
    const t = this.slide.value;
    const baseY = this.y - height;

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
