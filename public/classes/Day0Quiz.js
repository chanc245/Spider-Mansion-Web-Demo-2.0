class Day0Quiz {
  constructor() {
    this.bg = null;
    this.notebookLog = null;
    this.notebookClues = null;
    this.userFont = null;

    this.yOffset = 0;
    this.startOffset = 0;
    this.targetOffset = 0;
    this.animStart = 0;
    this.animDuration = 700;
    this.animating = false;

    this.quizState = true;

    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;

    this.currentNotebook = null;

    this.nbT = 0;
    this.nbFrom = 0;
    this.nbTo = 0;
    this.nbStart = 0;
    this.nbDuration = 700;
    this.nbAnimating = false;

    this.tagBaseX = 5;
    this.tagTargetX = 105;
    this.tagY = 750;
    this.tagW = 100;
    this.tagH = 50;

    this.tagAlpha = 255;
    this.tagFading = false;
    this.tagFadeStart = 0;
    this.tagFadeDuration = 180;

    this.tagSlideT = 0;
    this.tagSlideFrom = 0;
    this.tagSlideTo = 0;
    this.tagSlideStart = 0;
    this.tagSlideDuration = 250;
    this.tagSliding = false;

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

    if (this.animating) {
      const t = (millis() - this.animStart) / this.animDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.yOffset = lerp(this.startOffset, this.targetOffset, eased);
      if (clamped >= 1) this.animating = false;
    }

    image(this.bg, 0, -this.yOffset, width, 1152);

    const atBottom = !this.animating && Math.abs(this.yOffset - 576) < 0.5;
    if (atBottom && this.nbTo !== 1) this.startNotebookAnim(1);
    else if (!atBottom && this.nbTo !== 0) this.startNotebookAnim(0);

    if (this.nbAnimating) {
      const t = (millis() - this.nbStart) / this.nbDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.nbT = lerp(this.nbFrom, this.nbTo, eased);
      if (clamped >= 1) this.nbAnimating = false;
    }

    this.updateTagAnimations();
    this.renderNotebookGroup();
  }

  // expose this to the sketch to know when to show log text
  isNotebookShown() {
    return (
      this.nbT >= 0.999 &&
      !this.nbAnimating &&
      this.quizState &&
      Math.abs(this.yOffset - 576) < 0.5
    );
  }

  updateTagAnimations() {
    if (this.tagSliding) {
      const t = (millis() - this.tagSlideStart) / this.tagSlideDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.tagSlideT = lerp(this.tagSlideFrom, this.tagSlideTo, eased);
      if (clamped >= 1) {
        this.tagSliding = false;
        if (this.tagSlideTo === 1 && !this.tagFading) {
          this.tagFading = true;
          this.tagFadeStart = millis();
        }
      }
    }

    if (this.tagFading) {
      const t = (millis() - this.tagFadeStart) / this.tagFadeDuration;
      const clamped = constrain(t, 0, 1);
      const eased = this.easeInOutCubic(clamped);
      this.tagAlpha = lerp(255, 0, eased);
      if (clamped >= 1) {
        this.tagFading = false;
        this.gotoCluesPage();
      }
    }
  }

  renderNotebookGroup() {
    if (!(this.nbT > 0 || this.nbAnimating)) return;

    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY);

    if (this.currentNotebook === this.notebookLog) {
      this.drawCluesTagInGroup();
      image(
        this.currentNotebook,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
    } else {
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

  drawCluesTagInGroup() {
    const baseY = this.tagY - 576;
    const xNow = lerp(this.tagBaseX, this.tagTargetX, this.tagSlideT);
    this._tagScreenRect = { x: xNow, y: baseY, w: this.tagW, h: this.tagH };

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
    const baseX = this.logBtnX;
    const baseY = this.logBtnY;
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

  keyPressed() {
    if (key === "q" || key === "Q") this.setQuizState(false);
    else if (key === "w" || key === "W") this.setQuizState(true);
    else if (key === "z" || key === "Z") this.gotoCluesPage();
    else if (key === "x" || key === "X") this.gotoLogPage();
  }

  mousePressed() {
    if (
      this.currentNotebook === this.notebookLog &&
      !this.tagFading &&
      !this.tagSliding
    ) {
      if (this.nbT > 0 || this.nbAnimating) {
        const { x, y, w, h } = this._tagScreenRect;
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          this.startTagSlide(1);
          return;
        }
      }
    }

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

  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
  }

  gotoLogPage() {
    this.currentNotebook = this.notebookLog;
    this.tagAlpha = 255;
    this.tagFading = false;
    this.tagSlideT = 1;
    this.startTagSlide(0);
  }

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
    this.nbTo = target;
    this.nbStart = millis();
    this.nbAnimating = true;
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
  }
}
