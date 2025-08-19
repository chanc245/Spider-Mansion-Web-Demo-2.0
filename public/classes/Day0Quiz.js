class Day0Quiz {
  constructor() {
    // assets
    this.bg = null;
    this.notebookLog = null;
    this.notebookClues = null;
    this.userFont = null;

    // attic scroll
    this.yOffset = 0;
    this.startOffset = 0;
    this.targetOffset = 0;
    this.animStart = 0;
    this.animDuration = 700;
    this.animating = false;

    // state
    this.quizState = true;

    // notebook placement
    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;

    // which notebook
    this.currentNotebook = null;

    // notebook slide (0..1)
    this.nbT = 0;
    this.nbFrom = 0;
    this.nbTo = 0;
    this.nbStart = 0;
    this.nbDuration = 700;
    this.nbAnimating = false;

    // clues tag geometry (image-space)
    this.tagBaseX = 5;
    this.tagTargetX = 105;
    this.tagY = 750;
    this.tagW = 100;
    this.tagH = 50;

    // tag anim
    this.tagAlpha = 255;
    this.tagSlideT = 0; // 0..1
    this.tagSlideFrom = 0;
    this.tagSlideTo = 0;
    this.tagSlideStart = 0;
    this.tagSlideDuration = 300;
    this.tagSliding = false;

    this.tagFadeStart = 0;
    this.tagFadeDuration = 200;
    this.tagFading = false; // used only for Clues -> Log (fade in)

    // overlay system (plays UNDER the book on Clues page)
    this.tagOverlayActive = false;
    this.tagOverlayDir = +1; // +1: L->R (Log->Clues, no fade), -1: R->L (Clues->Log, fade in)
    this.pendingSwitchTo = null; // 'log' when waiting to switch after anim

    // hit rects
    this._tagScreenRect = { x: -9999, y: -9999, w: 0, h: 0 };
    this.logBtnX = 870;
    this.logBtnY = 527;
    this.logBtnW = 50;
    this.logBtnH = 50;
    this._logScreenRect = { x: -9999, y: -9999, w: 0, h: 0 };
  }

  preload() {
    this.bg = loadImage("assets/bg_quiz_day0_attic.png");
    this.notebookLog = loadImage("assets/notebook_QuestionLog_1.png");
    this.notebookClues = loadImage("assets/notebook_Clues.png");
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    this.notebookX = (width - this.NOTEBOOK_W) / 2;
    this.notebookY = height - this.NOTEBOOK_H;
    this.currentNotebook = this.notebookLog;

    textFont(this.userFont);
    textSize(32);
    fill(255);
    stroke(0);
    strokeWeight(3);
  }

  update() {
    background(220);

    // scroll
    if (this.animating) {
      const t = (millis() - this.animStart) / this.animDuration;
      const clamped = constrain(t, 0, 1);
      this.yOffset = lerp(
        this.startOffset,
        this.targetOffset,
        this.easeInOutCubic(clamped)
      );
      if (clamped >= 1) this.animating = false;
    }

    // attic
    image(this.bg, 0, -this.yOffset, width, 1152);

    // notebook slide in/out based on bottom state
    const atBottom = !this.animating && Math.abs(this.yOffset - 576) < 0.5;
    if (atBottom && this.nbTo !== 1) this.startNotebookAnim(1);
    else if (!atBottom && this.nbTo !== 0) this.startNotebookAnim(0);

    if (this.nbAnimating) {
      const t = (millis() - this.nbStart) / this.nbDuration;
      const clamped = constrain(t, 0, 1);
      this.nbT = lerp(this.nbFrom, this.nbTo, this.easeInOutCubic(clamped));
      if (clamped >= 1) this.nbAnimating = false;
    }

    // tag anims (overlay & log page)
    this.updateTagAnimations();

    // draw
    this.renderNotebookGroup();
  }

  // Expose "ready" for outside
  isNotebookShown() {
    return (
      this.nbT >= 0.999 &&
      !this.nbAnimating &&
      this.quizState &&
      Math.abs(this.yOffset - 576) < 0.5
    );
  }

  // ---------- Tag animation core ----------
  updateTagAnimations() {
    // slide
    if (this.tagSliding) {
      const t = (millis() - this.tagSlideStart) / this.tagSlideDuration;
      const clamped = constrain(t, 0, 1);
      this.tagSlideT = lerp(
        this.tagSlideFrom,
        this.tagSlideTo,
        this.easeInOutCubic(clamped)
      );
      if (clamped >= 1) this.tagSliding = false;
    }

    // fade (only for Clues -> Log, i.e., overlayDir = -1)
    if (this.tagFading && this.tagOverlayDir === -1) {
      const t = (millis() - this.tagFadeStart) / this.tagFadeDuration;
      const clamped = constrain(t, 0, 1);
      this.tagAlpha = lerp(0, 255, this.easeInOutCubic(clamped)); // fade IN
      if (clamped >= 1) this.tagFading = false;
    }

    // when overlay active on Clues page, finish then maybe switch to Log
    if (this.tagOverlayActive && !this.tagSliding && !this.tagFading) {
      this.tagOverlayActive = false;
      if (this.pendingSwitchTo === "log") {
        this.pendingSwitchTo = null;
        this.gotoLogPage(); // switch AFTER reverse anim completes
      } else {
        // reset for next time (Log->Clues path completes slide only)
        this.tagAlpha = 255;
        this.tagSlideT = 0;
      }
    }
  }

  // ---------- Draw ----------
  renderNotebookGroup() {
    if (!(this.nbT > 0 || this.nbAnimating)) return;
    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY);

    if (this.currentNotebook === this.notebookLog) {
      // LOG: tag behind, then book
      this.drawCluesTagInGroup(false);
      image(
        this.currentNotebook,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
    } else {
      // CLUES: draw overlay tag UNDER the book when active
      if (this.tagOverlayActive) this.drawCluesTagInGroup(true); // under the book
      image(
        this.currentNotebook,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
      // log button on top
      this.drawLogButtonInGroup();
    }

    pop();
  }

  drawCluesTagInGroup(overlayMode = false) {
    const baseY = this.tagY - 576;

    // Horizontal mapping:
    // - overlayDir +1 (Log->Clues): base -> target (no fade)
    // - overlayDir -1 (Clues->Log): target -> base (reverse)
    let x0 = this.tagBaseX,
      x1 = this.tagTargetX;
    if (overlayMode && this.tagOverlayDir === -1) {
      x0 = this.tagTargetX;
      x1 = this.tagBaseX;
    }
    const xNow = lerp(x0, x1, this.tagSlideT);

    if (!overlayMode) {
      // clickable only on LOG page
      this._tagScreenRect = { x: xNow, y: baseY, w: this.tagW, h: this.tagH };
    }

    push();
    noStroke();
    fill(0, 0, 0, 120 * (this.tagAlpha / 255));
    rect(xNow + 3, baseY + 3, this.tagW, this.tagH);
    fill(255, 255, 255, this.tagAlpha);
    rect(xNow, baseY, this.tagW, this.tagH);
    textFont(this.userFont);
    textSize(30);
    noStroke();
    fill(0, 0, 0, this.tagAlpha);
    textAlign(CENTER, CENTER);
    text("clues", xNow + this.tagW / 2, baseY + this.tagH / 2 - 2);
    pop();
  }

  drawLogButtonInGroup() {
    const baseX = this.logBtnX,
      baseY = this.logBtnY;
    this._logScreenRect = {
      x: baseX,
      y: baseY,
      w: this.logBtnW,
      h: this.logBtnH,
    };

    push();
    noStroke();
    fill(0, 0, 0, 120);
    rect(baseX + 3, baseY + 3, this.logBtnW, this.logBtnH);
    fill(255);
    rect(baseX, baseY, this.logBtnW, this.logBtnH);
    textFont(this.userFont);
    textSize(24);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text("log", baseX + this.logBtnW / 2, baseY + this.logBtnH / 2);
    pop();
  }

  // ---------- Input ----------
  keyPressed() {
    if (key === "q" || key === "Q") this.setQuizState(false);
    else if (key === "w" || key === "W") this.setQuizState(true);
    else if (key === "z" || key === "Z") this.gotoCluesPage();
    else if (key === "x" || key === "X") this.gotoLogPage();
  }

  mousePressed() {
    // LOG page: click "clues" → switch immediately; overlay slides L->R, NO FADE
    if (this.currentNotebook === this.notebookLog) {
      if (this.nbT > 0 || this.nbAnimating) {
        const { x, y, w, h } = this._tagScreenRect;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          // prep overlay
          this.tagOverlayDir = +1; // L->R
          this.tagSlideFrom = 0;
          this.tagSlideTo = 1;
          this.tagSlideStart = millis();
          this.tagSliding = true;
          this.tagAlpha = 255; // keep fully opaque
          this.tagFading = false; // NO fade on this path
          this.tagOverlayActive = true;
          this.pendingSwitchTo = null;

          // switch now
          this.gotoCluesPage();
          return;
        }
      }
    }

    // CLUES page: click "log" → overlay slides R->L while fading IN, then switch to Log
    if (this.currentNotebook === this.notebookClues) {
      if (this.nbT > 0 || this.nbAnimating) {
        const { x, y, w, h } = this._logScreenRect;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          this.tagOverlayDir = -1; // R->L
          this.tagSlideFrom = 0;
          this.tagSlideTo = 1;
          this.tagSlideStart = millis();
          this.tagSliding = true;
          this.tagAlpha = 0; // start invisible
          this.tagFadeStart = millis();
          this.tagFading = true; // fade in
          this.tagOverlayActive = true;
          this.pendingSwitchTo = "log"; // switch after anim completes
          return;
        }
      }
    }
  }

  // ---------- Page switches ----------
  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
  }

  gotoLogPage() {
    this.currentNotebook = this.notebookLog;
    // reset tag state on log page
    this.tagAlpha = 255;
    this.tagSliding = false;
    this.tagFading = false;
    this.tagSlideT = 0;
    this.tagOverlayActive = false;
    this.pendingSwitchTo = null;
  }

  // ---------- Anim helpers ----------
  setQuizState(state) {
    this.quizState = state;
    this.startOffset = this.yOffset;
    this.targetOffset = this.quizState ? 576 : 0;
    this.animStart = millis();
    this.animating = true;
  }

  startNotebookAnim(target) {
    this.nbFrom = this.nbT;
    this.nbTo = target;
    this.nbStart = millis();
    this.nbAnimating = true;
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
  }
}
