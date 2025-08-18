class Day0Quiz {
  constructor() {
    // resources
    this.bg = null;
    this.notebookLog = null;
    this.notebookClues = null;
    this.userFont = null;

    // scroll state (attic)
    this.yOffset = 0;
    this.startOffset = 0;
    this.targetOffset = 0;
    this.animStart = 0;
    this.animDuration = 700;
    this.animating = false;

    // quiz state: false = top, true = bottom
    this.quizState = true;

    // notebook placement
    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;

    // which notebook page is shown (set in setup)
    this.currentNotebook = null;

    // unified notebook animation progress (0..1)
    this.nbT = 0; // eased 0..1 used by *everything* in the notebook group
    this.nbFrom = 0;
    this.nbTo = 0;
    this.nbStart = 0;
    this.nbDuration = 700;
    this.nbAnimating = false;

    // --- "clues" tag (image-space coords; shows only on LOG page) ---
    this.tagBaseX = 5; // start x
    this.tagTargetX = 105; // end x (after click)
    this.tagY = 750; // image Y (bottom half)
    this.tagW = 100;
    this.tagH = 50;

    // visual fade (after slide completes on click)
    this.tagAlpha = 255; // fades to 0 on click
    this.tagFading = false;
    this.tagFadeStart = 0;
    this.tagFadeDuration = 180; // ms

    // internal horizontal slide (x: 5 <-> 105)
    this.tagSlideT = 0; // 0 = at 5, 1 = at 105
    this.tagSlideFrom = 0;
    this.tagSlideTo = 0;
    this.tagSlideStart = 0;
    this.tagSlideDuration = 250; // ms
    this.tagSliding = false;

    // hit-test caches
    this._tagScreenRect = { x: -9999, y: -9999, w: 0, h: 0 };

    // --- "log" button (screen coords when at bottom; shows on CLUES page) ---
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
    // compute notebook placement AFTER canvas exists
    this.notebookX = (width - this.NOTEBOOK_W) / 2; // center horizontally
    this.notebookY = height - this.NOTEBOOK_H; // bottom aligned

    // default page: Log
    this.currentNotebook = this.notebookLog;

    textFont(this.userFont);
    textSize(32);
    fill(255);
    stroke(0);
    strokeWeight(3);
  }

  getState() {
    const page = this.currentNotebook === this.notebookLog ? "LOG" : "CLUE";
    const atBottom = !this.animating && Math.abs(this.yOffset - 576) < 0.5;
    const notebookVisible = this.nbT > 0 || this.nbAnimating;
    const tagVisible = page === "LOG" && this.tagAlpha > 0; // tag shows only on LOG page
    const logButtonVisible = page === "CLUE";

    return {
      page, // "LOG" or "CLUE"
      atBottom, // true when fully scrolled to bottom
      nbT: +this.nbT.toFixed(3), // 0..1 slide progress
      notebookVisible, // notebook group currently on screen (animating or shown)
      tag: {
        visible: tagVisible,
        alpha: Math.round(this.tagAlpha),
        slideT: +this.tagSlideT.toFixed(3), // 0..1 (x: 5 -> 105)
      },
      logButtonVisible, // true only on CLUE page
    };
  }

  update() {
    background(220);

    // --- update attic scroll animation ---
    if (this.animating) {
      const t = (millis() - this.animStart) / this.animDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.yOffset = lerp(this.startOffset, this.targetOffset, eased);
      if (clamped >= 1) this.animating = false;
    }

    // draw attic image with vertical offset
    image(this.bg, 0, -this.yOffset, width, 1152);

    // --- trigger notebook slide based on bottom state ---
    const atBottom = !this.animating && Math.abs(this.yOffset - 576) < 0.5;
    if (atBottom && this.nbTo !== 1) {
      this.startNotebookAnim(1); // show
    } else if (!atBottom && this.nbTo !== 0) {
      this.startNotebookAnim(0); // hide
    }

    // --- update unified notebook animation (nbT) ---
    if (this.nbAnimating) {
      const t = (millis() - this.nbStart) / this.nbDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.nbT = lerp(this.nbFrom, this.nbTo, eased);
      if (clamped >= 1) this.nbAnimating = false;
    }

    // --- update tag slide + fade (only relevant on LOG page) ---
    this.updateTagAnimations();

    // --- render the unified group (book + UI) using ONE translate driven by nbT ---
    this.renderNotebookGroup();
  }

  updateTagAnimations() {
    // horizontal slide (both directions)
    if (this.tagSliding) {
      const t = (millis() - this.tagSlideStart) / this.tagSlideDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.tagSlideT = lerp(this.tagSlideFrom, this.tagSlideTo, eased);
      if (clamped >= 1) {
        this.tagSliding = false;

        // If we just finished sliding IN (after click), start fade, then go to clues.
        if (this.tagSlideTo === 1 && !this.tagFading) {
          this.tagFading = true;
          this.tagFadeStart = millis();
        }
      }
    }

    // fade (after slide-in on click). When done: switch page.
    if (this.tagFading) {
      const t = (millis() - this.tagFadeStart) / this.tagFadeDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.tagAlpha = lerp(255, 0, eased);
      if (clamped >= 1) {
        this.tagFading = false;
        this.gotoCluesPage(); // switch page after finishing fade
      }
    }
  }

  renderNotebookGroup() {
    // Only render while visible/animating
    if (!(this.nbT > 0 || this.nbAnimating)) return;

    // single slide offset shared by everything in the group
    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY); // move group together

    if (this.currentNotebook === this.notebookLog) {
      // LOG page: draw tag *first* (behind), then notebook on top
      this.drawCluesTagInGroup();
      image(
        this.currentNotebook,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
    } else {
      // CLUE page: draw notebook first, then log button on top
      image(
        this.currentNotebook,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
      this.drawLogButtonInGroup();
    }

    pop();
  }

  // ----- UI: Clues Tag (only on LOG page), drawn inside the translated group -----
  drawCluesTagInGroup() {
    // base screen position (when at bottom)
    const baseY = this.tagY - 576;
    const xNow = lerp(this.tagBaseX, this.tagTargetX, this.tagSlideT);

    // cache screen-space rect for hit testing (remember: group is translated already)
    this._tagScreenRect = { x: xNow, y: baseY, w: this.tagW, h: this.tagH };

    // draw (inside translated group, so use base coords)
    push();
    noStroke();
    // shadow
    fill(0, 0, 0, 120 * (this.tagAlpha / 255));
    rect(xNow + 3, baseY + 3, this.tagW, this.tagH);

    // button
    fill(255, 255, 255, this.tagAlpha);
    rect(xNow, baseY, this.tagW, this.tagH);

    // label
    textFont(this.userFont);
    textSize(30);
    noStroke();
    fill(0, 0, 0, this.tagAlpha);
    textAlign(CENTER, CENTER);
    text("clues", xNow + this.tagW / 2, baseY + this.tagH / 2 - 2);
    pop();
  }

  // ----- UI: Log Button (only on CLUES page), drawn inside the translated group -----
  drawLogButtonInGroup() {
    // base screen position (when at bottom)
    const baseX = this.logBtnX;
    const baseY = this.logBtnY;

    // cache rect for hit testing
    this._logScreenRect = {
      x: baseX,
      y: baseY,
      w: this.logBtnW,
      h: this.logBtnH,
    };

    push();
    noStroke();
    // shadow
    fill(0, 0, 0, 120);
    rect(baseX + 3, baseY + 3, this.logBtnW, this.logBtnH);

    // button
    fill(255);
    rect(baseX, baseY, this.logBtnW, this.logBtnH);

    // label
    textFont(this.userFont);
    textSize(24);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text("log", baseX + this.logBtnW / 2, baseY + this.logBtnH / 2);
    pop();
  }

  // ----- Input -----
  keyPressed() {
    if (key === "q" || key === "Q") {
      this.setQuizState(false); // top
    } else if (key === "w" || key === "W") {
      this.setQuizState(true); // bottom
    } else if (key === "z" || key === "Z") {
      this.gotoCluesPage(); // manual switch to clues (no tag animation)
    } else if (key === "x" || key === "X") {
      this.gotoLogPage(); // manual switch to log (plays tag reset)
    }
  }

  mousePressed() {
    // Click "clues" tag (only on LOG page, only if visible and not already fading/sliding)
    if (
      this.currentNotebook === this.notebookLog &&
      !this.tagFading &&
      !this.tagSliding
    ) {
      if (this.nbT > 0 || this.nbAnimating) {
        const { x, y, w, h } = this._tagScreenRect;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          // Start in-book slide to x=105; fade + page switch happen automatically after
          this.startTagSlide(1); // 0->1
          return;
        }
      }
    }

    // Click "log" button (only on CLUE page)
    if (this.currentNotebook === this.notebookClues) {
      if (this.nbT > 0 || this.nbAnimating) {
        const { x, y, w, h } = this._logScreenRect;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          this.gotoLogPage();
          return;
        }
      }
    }
  }

  // ----- Page switches -----
  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
    // On clue page: no clue tag, yes log button
  }

  gotoLogPage() {
    this.currentNotebook = this.notebookLog;

    // On log page: re-show the clue tag (reset fully), then animate it OUT (105->5)
    this.tagAlpha = 255;
    this.tagFading = false;

    // Ensure it's at the end first (so the "animate out" is visible); then play 1->0
    this.tagSlideT = 1;
    this.startTagSlide(0); // animate out to base x=5
  }

  // ----- Anim helpers -----
  startTagSlide(target01) {
    this.tagSlideFrom = this.tagSlideT;
    this.tagSlideTo = constrain(target01, 0, 1);
    this.tagSlideStart = millis();
    this.tagSliding = true;
  }

  setQuizState(state) {
    this.quizState = state;
    this.startOffset = this.yOffset;
    this.targetOffset = this.quizState ? 576 : 0;
    this.animStart = millis();
    this.animating = true;
  }

  startNotebookAnim(target) {
    this.nbFrom = this.nbT;
    this.nbTo = target; // 1 = show, 0 = hide
    this.nbStart = millis();
    this.nbAnimating = true;
  }

  // easing helper
  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
  }
}
