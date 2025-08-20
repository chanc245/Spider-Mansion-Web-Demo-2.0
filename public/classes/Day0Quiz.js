class Day0Quiz {
  constructor() {
    // assets
    this.bg = null;
    this.notebookLog = null;
    this.notebookClues = null;
    this.userFont = null;

    // attic scroll tween
    this.yOffset = 0;
    this.scroll = new Tween({ from: 0, to: 576, dur: 700 });

    // notebook slide tween (0..1)
    this.nbT = 0;
    this.nbSlide = new Tween({ from: 0, to: 1, dur: 700 });

    // state
    this.quizState = true; // true = bottom

    // notebook placement
    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;

    // current page
    this.currentNotebook = null;

    // tag overlay animator (instantiated in setup after font)
    this.tag = null;

    // "log" button hit-rect (inside group)
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

    this.tag = new TagOverlayAnimator({
      baseX: 5,
      targetX: 105,
      y: 750,
      w: 100,
      h: 50,
      font: this.userFont,
      slideDur: 300,
      fadeDur: 200,
    });
  }

  update() {
    background(220);

    // attic scroll update
    this.yOffset = this.scroll.update();
    image(this.bg, 0, -this.yOffset, width, 1152);

    // notebook slide in/out based on bottom state
    const atBottom = Math.abs(this.yOffset - 576) < 0.5;
    const wanted = atBottom ? 1 : 0;
    if (
      (wanted === 1 && this.nbSlide.to !== 1) ||
      (wanted === 0 && this.nbSlide.to !== 0)
    ) {
      this.nbSlide.start(this.nbT, wanted);
    }
    this.nbT = this.nbSlide.update();

    // overlay tag animation update (only meaningful on Clues page when active)
    const status = this.tag.update();
    if (this.tag.overlayActive && status.done) {
      this.tag.overlayActive = false;
      // If we were coming back (Clues→Log), only switch AFTER the reverse anim completes
      // Switch happens outside by calling gotoLogPage() after we detect done,
      // but we do it here for simplicity:
      if (
        this.currentNotebook === this.notebookClues &&
        this._pendingSwitchToLog
      ) {
        this._pendingSwitchToLog = false;
        this.gotoLogPage();
      }
    }

    // render notebook group
    this.renderNotebookGroup();
  }

  renderNotebookGroup() {
    if (!(this.nbT > 0 || this.nbSlide.active)) return;
    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY);

    if (this.currentNotebook === this.notebookLog) {
      // LOG: draw clickable tag behind the book
      this.tag.drawClickable();
      image(
        this.notebookLog,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
    } else {
      // CLUES: draw overlay tag UNDER the book when active
      if (this.tag.overlayActive) this.tag.drawUnder();
      image(
        this.notebookClues,
        this.notebookX,
        this.notebookY,
        this.NOTEBOOK_W,
        this.NOTEBOOK_H
      );
      // draw "log" button on top
      this.drawLogButtonInGroup();
    }

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

  // outside visibility signal
  isNotebookShown() {
    return (
      this.nbT >= 0.999 &&
      !this.nbSlide.active &&
      this.quizState &&
      Math.abs(this.yOffset - 576) < 0.5
    );
  }

  // interactions
  keyPressed() {
    if (key === "q" || key === "Q") this.setQuizState(false);
    else if (key === "w" || key === "W") this.setQuizState(true);
    else if (key === "z" || key === "Z") this.gotoCluesPage();
    else if (key === "x" || key === "X") this.gotoLogPage();
  }

  mousePressed() {
    // LOG page: click "clues" → switch immediately; overlay slides L->R (no fade) under Clues
    if (this.currentNotebook === this.notebookLog) {
      const r = this.tag.screenRect;
      if (
        mouseX >= r.x &&
        mouseX <= r.x + r.w &&
        mouseY >= r.y &&
        mouseY <= r.y + r.h
      ) {
        this.tag.startLogToClues();
        this._pendingSwitchToLog = false;
        this.gotoCluesPage(); // switch NOW
        return;
      }
    }

    // CLUES page: click "log" → overlay slides R->L while fading IN, then switch to Log when done
    if (this.currentNotebook === this.notebookClues) {
      const { x, y, w, h } = this._logScreenRect;
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        this.tag.startCluesToLog();
        // flag to switch AFTER anim completes
        this._pendingSwitchToLog = true;
        return;
      }
    }
  }

  // page switches
  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
  }
  gotoLogPage() {
    this.currentNotebook = this.notebookLog;
  }

  // scroll target
  setQuizState(state) {
    this.quizState = state;
    const to = this.quizState ? 576 : 0;
    this.scroll.start(this.yOffset, to);
  }
}
window.Day0Quiz = Day0Quiz;
