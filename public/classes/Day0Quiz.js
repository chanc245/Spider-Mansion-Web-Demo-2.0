class Day0Quiz {
  constructor() {
    // assets
    this.bg = null;
    this.notebookLog = null;
    this.notebookClues = null;
    this.notebookRules = null;
    this.userFont = null;

    // scroll + notebook slide
    this.yOffset = 0;
    this.scroll = new Tween({ from: 0, to: 0, dur: 700 }); // to is set in setup()
    this.nbT = 0;
    this.nbSlide = new Tween({ from: 0, to: 1, dur: 700 });

    // state
    this.quizState = true; // at bottom
    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;
    this.currentNotebook = null;

    // tags
    this.tagClues = null;
    this.tagRules = null;
    this.tagLog = null;

    // page flags
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;

    // markers
    this._cluesLastPath = null;
    this._rulesLastPath = null;

    // return-to-log coordination
    this._returningToLog = false;
    this._pendingToLogCount = 0;
  }

  preload() {
    this.bg = loadImage("assets/bg_quiz_day0_attic.png");
    this.notebookLog = loadImage("assets/notebook_QuestionLog_1.png");
    this.notebookClues = loadImage("assets/notebook_Clues.png");
    this.notebookRules = loadImage("assets/notebook_Rules.png");
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    this.notebookX = (width - this.NOTEBOOK_W) / 2;
    this.notebookY = height - this.NOTEBOOK_H;
    this.currentNotebook = this.notebookLog;

    // initialize scroll target to bottom of attic
    this.scroll.start(0, height);

    // left-side tags
    this.tagClues = new TagOverlayAnimator({
      label: "clues",
      baseX: 5,
      y: 750,
      overlayStartX: 5,
      overlayEndX: 105,
      w: 100,
      h: 50,
      font: this.userFont,
      slideDur: 300,
      fadeDur: 200,
    });
    this.tagRules = new TagOverlayAnimator({
      label: "rules",
      baseX: 5,
      y: 680,
      overlayStartX: 5,
      overlayEndX: 105,
      w: 100,
      h: 50,
      font: this.userFont,
      slideDur: 300,
      fadeDur: 200,
    });

    // right-side log tag
    this.tagLog = new TagOverlayAnimator({
      label: "log",
      baseX: 919,
      y: 680,
      overlayStartX: 819,
      overlayEndX: 919,
      w: 100,
      h: 50,
      font: this.userFont,
      slideDur: 300,
      fadeDur: 200,
    });
  }

  update() {
    background(220);

    // scroll & attic
    this.yOffset = this.scroll.update();
    image(this.bg, 0, -this.yOffset, width, height * 2); // 1152 → 2*height

    // notebook slide at bottom
    const atBottom = Math.abs(this.yOffset - height) < 0.5;
    const want = atBottom ? 1 : 0;
    if (
      (want === 1 && this.nbSlide.to !== 1) ||
      (want === 0 && this.nbSlide.to !== 0)
    ) {
      this.nbSlide.start(this.nbT, want);
    }
    this.nbT = this.nbSlide.update();

    // run tag tweens
    const stClues = this.tagClues.update();
    const stRules = this.tagRules.update();
    const stLog = this.tagLog.update();

    // overlay finish: CLUES
    if (this.tagClues.overlayActive && stClues.done) {
      this.tagClues.overlayActive = false;
      if (this._cluesLastPath === "logToPage") this.cluesHiddenOnClues = true;
      else if (this._cluesLastPath === "pageToLog" && this._returningToLog)
        this._decToLogAndMaybeSwitch();
      this._cluesLastPath = null;
    }

    // overlay finish: RULES
    if (this.tagRules.overlayActive && stRules.done) {
      this.tagRules.overlayActive = false;
      if (this._rulesLastPath === "logToPage") this.rulesHiddenOnRules = true;
      else if (this._rulesLastPath === "pageToLog" && this._returningToLog)
        this._decToLogAndMaybeSwitch();
      this._rulesLastPath = null;
    }

    // overlay finish: LOG
    if (this.tagLog.overlayActive && stLog.done) {
      this.tagLog.overlayActive = false;
      if (this._returningToLog) this._decToLogAndMaybeSwitch();
    }

    this.renderNotebookGroup();
  }

  renderNotebookGroup() {
    if (!(this.nbT > 0 || this.nbSlide.active)) return;
    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY);

    // 1) stationary tags behind notebook
    if (this.currentNotebook === this.notebookLog) {
      if (!this.tagClues.overlayActive) this.tagClues.drawClickable();
      if (!this.tagRules.overlayActive) this.tagRules.drawClickable();
    } else if (this.currentNotebook === this.notebookClues) {
      if (!this.tagRules.overlayActive) this.tagRules.drawClickable();
      if (!this.tagClues.overlayActive && !this.cluesHiddenOnClues)
        this.tagClues.drawClickable();
      if (!this.tagLog.overlayActive) this.tagLog.drawClickable();
    } else if (this.currentNotebook === this.notebookRules) {
      if (!this.tagClues.overlayActive) this.tagClues.drawClickable();
      if (!this.tagRules.overlayActive && !this.rulesHiddenOnRules)
        this.tagRules.drawClickable();
      if (!this.tagLog.overlayActive) this.tagLog.drawClickable();
    }

    // 2) animated overlays
    if (this.tagClues.overlayActive) this.tagClues.drawUnder();
    if (this.tagRules.overlayActive) this.tagRules.drawUnder();
    if (this.tagLog.overlayActive) this.tagLog.drawUnder();

    // 3) notebook image
    let img = this.notebookLog;
    if (this.currentNotebook === this.notebookClues) img = this.notebookClues;
    else if (this.currentNotebook === this.notebookRules)
      img = this.notebookRules;

    image(
      img,
      this.notebookX,
      this.notebookY,
      this.NOTEBOOK_W,
      this.NOTEBOOK_H
    );
    pop();
  }

  // visible state for Day0QuizLog
  isNotebookShown() {
    return (
      this.nbT >= 0.999 &&
      !this.nbSlide.active &&
      this.quizState &&
      Math.abs(this.yOffset - height) < 0.5
    );
  }

  keyPressed() {
    if (key === "q" || key === "Q") this.setQuizState(false);
    else if (key === "w" || key === "W") this.setQuizState(true);
    else if (key === "z" || key === "Z") this.gotoCluesPage();
    else if (key === "x" || key === "X") this.gotoLogPage();
  }

  mousePressed() {
    // CLUES
    if (this._canClickClues() && this.tagClues.hit(mouseX, mouseY)) {
      const fromLog = this.currentNotebook === this.notebookLog;

      this.tagClues.startEntrance();
      this.tagClues.overlayActive = true;
      this._cluesLastPath = "logToPage";

      if (this.currentNotebook === this.notebookRules) {
        this.tagRules.startReverseWithFade();
        this.tagRules.overlayActive = true;
        this._rulesLastPath = "pageToBase";
      }

      this.gotoCluesPage();
      this.rulesHiddenOnRules = false;

      if (fromLog) this._playLogEntrance();
      return;
    }

    // RULES
    if (this._canClickRules() && this.tagRules.hit(mouseX, mouseY)) {
      const fromLog = this.currentNotebook === this.notebookLog;

      this.tagRules.startEntrance();
      this.tagRules.overlayActive = true;
      this._rulesLastPath = "logToPage";

      if (this.currentNotebook === this.notebookClues) {
        this.tagClues.startReverseWithFade();
        this.tagClues.overlayActive = true;
        this._cluesLastPath = "pageToBase";
      }

      this.gotoRulesPage();
      this.cluesHiddenOnClues = false;

      if (fromLog) this._playLogEntrance();
      return;
    }

    // LOG (on Clues/Rules)
    if (this._canClickLog() && this.tagLog.hit(mouseX, mouseY)) {
      this._returningToLog = true;
      this._pendingToLogCount = 0;

      this.tagLog.startReverseWithFade();
      this.tagLog.overlayActive = true;
      this._pendingToLogCount++;

      if (this.currentNotebook === this.notebookClues) {
        this.tagClues.startReverseWithFade();
        this.tagClues.overlayActive = true;
        this._cluesLastPath = "pageToLog";
        this._pendingToLogCount++;
      } else if (this.currentNotebook === this.notebookRules) {
        this.tagRules.startReverseWithFade();
        this.tagRules.overlayActive = true;
        this._rulesLastPath = "pageToLog";
        this._pendingToLogCount++;
      }
      return;
    }
  }

  _decToLogAndMaybeSwitch() {
    this._pendingToLogCount = Math.max(0, this._pendingToLogCount - 1);
    if (this._returningToLog && this._pendingToLogCount === 0) {
      this._returningToLog = false;
      this.gotoLogPage();
    }
  }

  _playLogEntrance() {
    this.tagLog.slide.value = 0;
    this.tagLog.fade.value = 255;
    this.tagLog.startEntrance();
    this.tagLog.overlayActive = true;
  }

  _canClickClues() {
    if (this.currentNotebook === this.notebookLog)
      return !this.tagClues.overlayActive;
    if (this.currentNotebook === this.notebookClues)
      return !this.cluesHiddenOnClues && !this.tagClues.overlayActive;
    if (this.currentNotebook === this.notebookRules)
      return !this.tagClues.overlayActive;
    return true;
  }
  _canClickRules() {
    if (this.currentNotebook === this.notebookLog)
      return !this.tagRules.overlayActive;
    if (this.currentNotebook === this.notebookRules)
      return !this.rulesHiddenOnRules && !this.tagRules.overlayActive;
    if (this.currentNotebook === this.notebookClues)
      return !this.tagRules.overlayActive;
    return true;
  }
  _canClickLog() {
    return (
      this.currentNotebook !== this.notebookLog && !this.tagLog.overlayActive
    );
  }

  // page switches
  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
  }
  gotoRulesPage() {
    this.currentNotebook = this.notebookRules;
  }
  gotoLogPage() {
    this.currentNotebook = this.notebookLog;
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;
  }

  setQuizState(state) {
    this.quizState = state;
    this.scroll.start(this.yOffset, this.quizState ? height : 0);
  }
}
window.Day0Quiz = Day0Quiz;
