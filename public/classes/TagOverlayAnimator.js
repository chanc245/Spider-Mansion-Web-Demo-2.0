class TagOverlayAnimator {
  constructor({
    label = "clues",
    baseX = 5,
    targetX = 105,
    y = 750,
    w = 100,
    h = 50,
    font = null,
    slideDur = 300,
    fadeDur = 200,
  } = {}) {
    this.label = label;
    this.baseX = baseX;
    this.targetX = targetX;
    this.y = y;
    this.w = w;
    this.h = h;
    this.font = font;

    this.slide = new Tween({ from: 0, to: 1, dur: slideDur });
    this.fade = new Tween({ from: 255, to: 255, dur: fadeDur }); // only used on reverse path

    this.overlayActive = false;
    this.overlayDir = +1; // +1: L->R (Log→Page, no fade), -1: R->L (Page→Log, fade in)
    this.screenRect = { x: -9999, y: -9999, w: 0, h: 0 }; // clickable rect on LOG page
  }

  startLogToPage() {
    // click on LOG tag → switch immediately; slide L→R, no fade
    this.overlayActive = true;
    this.overlayDir = +1;
    this.slide.start(0, 1);
    this.fade.start(255, 255, 1); // keep alpha as-is
  }
  startPageToLog() {
    // click “log” on PAGE → slide R→L, fade in, switch after
    this.overlayActive = true;
    this.overlayDir = -1;
    this.slide.start(0, 1);
    this.fade.start(0, 255); // fade in while sliding back
  }

  startPageToBase() {
    // Reverse sweep R→L with fade-in, used when switching between pages (Rules ⇄ Clues)
    // No page switch will be triggered by Day0Quiz for this path.
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

  // Draw stationary, clickable tag on LOG page
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

  // Draw animated overlay UNDER the notebook (while transitioning)
  drawUnder() {
    const t = this.slide.value;
    const baseY = this.y - 576;

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
    text(this.label, xNow + this.w / 2, baseY + this.h / 2 - 2);
    pop();
  }

  hit(mx, my) {
    const r = this.screenRect;
    return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }
}

window.TagOverlayAnimator = TagOverlayAnimator;
