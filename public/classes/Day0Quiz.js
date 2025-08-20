// public/classes/Day0Quiz.js
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
    this.scroll = new Tween({ from: 0, to: 576, dur: 700 });
    this.nbT = 0;
    this.nbSlide = new Tween({ from: 0, to: 1, dur: 700 });

    // state
    this.quizState = true; // bottom
    this.NOTEBOOK_W = 815;
    this.NOTEBOOK_H = 510;
    this.notebookX = 0;
    this.notebookY = 0;
    this.currentNotebook = null; // this.notebookLog / this.notebookClues / this.notebookRules

    // tags (overlay animators)
    this.tagClues = null; // left-side 5→105
    this.tagRules = null; // left-side 5→105
    this.tagLog = null; // right-side stationary at 919, entrance 819→919, reverse 919→819

    // per-page hidden flags (after entrance finishes)
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;

    // last path markers
    this._cluesLastPath = null; // 'logToPage' | 'pageToLog' | 'pageToBase' | null
    this._rulesLastPath = null;

    // coordination when returning to Log by clicking the Log tag
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

    textFont(this.userFont);
    textSize(32);
    fill(255);
    stroke(0);
    strokeWeight(3);

    // left-side tags
    this.tagClues = new TagOverlayAnimator({
      label: "clues",
      baseX: 5,
      y: 750,
      overlayStartX: 5, // L→R entrance path
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
      overlayStartX: 5, // L→R entrance path
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
      baseX: 919, // stationary/clickable spot
      y: 680, // image-space (screen y ≈ 104)
      overlayStartX: 819, // entrance start (left)
      overlayEndX: 919, // entrance end (right)
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
    image(this.bg, 0, -this.yOffset, width, 1152);

    // notebook slide at bottom
    const atBottom = Math.abs(this.yOffset - 576) < 0.5;
    const want = atBottom ? 1 : 0;
    if (
      (want === 1 && this.nbSlide.to !== 1) ||
      (want === 0 && this.nbSlide.to !== 0)
    )
      this.nbSlide.start(this.nbT, want);
    this.nbT = this.nbSlide.update();

    // run tag tweens
    const stClues = this.tagClues.update();
    const stRules = this.tagRules.update();
    const stLog = this.tagLog.update();

    // finish overlays: CLUES
    if (this.tagClues.overlayActive && stClues.done) {
      this.tagClues.overlayActive = false;
      if (this._cluesLastPath === "logToPage") {
        this.cluesHiddenOnClues = true; // stays hidden while on Clues page
      } else if (this._cluesLastPath === "pageToLog") {
        // part of "return to log" via Log tag — count down
        if (this._returningToLog) this._decToLogAndMaybeSwitch();
      }
      this._cluesLastPath = null;
    }

    // finish overlays: RULES
    if (this.tagRules.overlayActive && stRules.done) {
      this.tagRules.overlayActive = false;
      if (this._rulesLastPath === "logToPage") {
        this.rulesHiddenOnRules = true;
      } else if (this._rulesLastPath === "pageToLog") {
        if (this._returningToLog) this._decToLogAndMaybeSwitch();
      }
      this._rulesLastPath = null;
    }

    // finish overlays: LOG (reverse back left)
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
      // log hidden on Log page
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

    // 2) animated overlays under the notebook
    if (this.tagClues.overlayActive) this.tagClues.drawUnder();
    if (this.tagRules.overlayActive) this.tagRules.drawUnder();
    if (this.tagLog.overlayActive) this.tagLog.drawUnder();

    // 3) notebook on top
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
      Math.abs(this.yOffset - 576) < 0.5
    );
  }

  keyPressed() {
    if (key === "q" || key === "Q") this.setQuizState(false);
    else if (key === "w" || key === "W") this.setQuizState(true);
    else if (key === "z" || key === "Z") this.gotoCluesPage();
    else if (key === "x" || key === "X") this.gotoLogPage();
  }

  mousePressed() {
    // --- CLUES tag click (allowed anywhere it's visible)
    if (this._canClickClues() && this.tagClues.hit(mouseX, mouseY)) {
      const fromLog = this.currentNotebook === this.notebookLog;

      this.tagClues.startEntrance(); // L→R overlay
      this.tagClues.overlayActive = true;
      this._cluesLastPath = "logToPage";

      // if coming from RULES, make RULES re-appear to base (no log anim)
      if (this.currentNotebook === this.notebookRules) {
        this.tagRules.startReverseWithFade(); // R→L to base
        this.tagRules.overlayActive = true;
        this._rulesLastPath = "pageToBase";
      }

      this.gotoCluesPage();
      this.rulesHiddenOnRules = false;

      // Only animate the Log tag entrance when coming FROM LOG
      if (fromLog) this._playLogEntrance();

      return;
    }

    // --- RULES tag click
    if (this._canClickRules() && this.tagRules.hit(mouseX, mouseY)) {
      const fromLog = this.currentNotebook === this.notebookLog;

      this.tagRules.startEntrance(); // L→R overlay
      this.tagRules.overlayActive = true;
      this._rulesLastPath = "logToPage";

      // if coming from CLUES, make CLUES re-appear to base (no log anim)
      if (this.currentNotebook === this.notebookClues) {
        this.tagClues.startReverseWithFade(); // R→L to base
        this.tagClues.overlayActive = true;
        this._cluesLastPath = "pageToBase";
      }

      this.gotoRulesPage();
      this.cluesHiddenOnClues = false;

      // Only animate the Log tag entrance when coming FROM LOG
      if (fromLog) this._playLogEntrance();

      return;
    }

    // --- LOG tag click (on Clues/Rules): reverse BOTH current page's tag and the Log tag, then switch to Log
    if (this._canClickLog() && this.tagLog.hit(mouseX, mouseY)) {
      // we’re coordinating two reverse animations: log tag + current page tag
      this._returningToLog = true;
      this._pendingToLogCount = 0;

      // 1) reverse the log tag (R→L, fade in)
      this.tagLog.startReverseWithFade(); // 919 → 819
      this.tagLog.overlayActive = true;
      this._pendingToLogCount++;

      // 2) reverse the page-specific tag so it re-appears R→L as we return
      if (this.currentNotebook === this.notebookClues) {
        this.tagClues.startReverseWithFade(); // target → base (R→L)
        this.tagClues.overlayActive = true;
        this._cluesLastPath = "pageToLog";
        this._pendingToLogCount++;
      } else if (this.currentNotebook === this.notebookRules) {
        this.tagRules.startReverseWithFade(); // target → base (R→L)
        this.tagRules.overlayActive = true;
        this._rulesLastPath = "pageToLog";
        this._pendingToLogCount++;
      }
      return;
    }
  }

  // decrement and switch to log when both reverse animations finish
  _decToLogAndMaybeSwitch() {
    this._pendingToLogCount = Math.max(0, this._pendingToLogCount - 1);
    if (this._returningToLog && this._pendingToLogCount === 0) {
      this._returningToLog = false;
      this.gotoLogPage();
    }
  }

  // animate Log tag entrance (only when coming from Log → Clues/Rules)
  _playLogEntrance() {
    this.tagLog.slide.value = 0;
    this.tagLog.fade.value = 255;
    this.tagLog.startEntrance(); // 819 → 919
    this.tagLog.overlayActive = true;
  }

  // clickability guards
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
    // restore both left-side tags for future use
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;
  }

  setQuizState(state) {
    this.quizState = state;
    this.scroll.start(this.yOffset, this.quizState ? 576 : 0);
  }
}

window.Day0Quiz = Day0Quiz;
