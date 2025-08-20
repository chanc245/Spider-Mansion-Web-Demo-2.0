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
    this.tagClues = null;
    this.tagRules = null;

    // per-page “stay hidden after anim” flags
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;

    // last path markers
    this._cluesLastPath = null; // 'logToPage' | 'pageToLog' | null
    this._rulesLastPath = null;

    // log button (inside group)
    this.logBtnX = 870;
    this.logBtnY = 527;
    this.logBtnW = 50;
    this.logBtnH = 50;
    this._logScreenRect = { x: -9999, y: -9999, w: 0, h: 0 };

    // pending switch after reverse anim finishes
    this._pendingSwitchToLogFrom = null; // "clues" | "rules" | null
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

    // stationary tags + overlay anim (under book) when active
    this.tagClues = new TagOverlayAnimator({
      label: "clues",
      baseX: 5,
      targetX: 105,
      y: 750,
      w: 100,
      h: 50,
      font: this.userFont,
      slideDur: 300,
      fadeDur: 200,
    });
    this.tagRules = new TagOverlayAnimator({
      label: "rules",
      baseX: 5,
      targetX: 105,
      y: 680,
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

    // slide notebook at bottom
    const atBottom = Math.abs(this.yOffset - 576) < 0.5;
    const want = atBottom ? 1 : 0;
    if (
      (want === 1 && this.nbSlide.to !== 1) ||
      (want === 0 && this.nbSlide.to !== 0)
    )
      this.nbSlide.start(this.nbT, want);
    this.nbT = this.nbSlide.update();

    // tag anims
    const stClues = this.tagClues.update();
    const stRules = this.tagRules.update();

    // finish overlays
    if (this.tagClues.overlayActive && stClues.done) {
      this.tagClues.overlayActive = false;
      if (this._cluesLastPath === "logToPage") {
        this.cluesHiddenOnClues = true; // keep hidden on Clues after entrance
      } else if (this._cluesLastPath === "pageToLog") {
        if (this._pendingSwitchToLogFrom === "clues") {
          this._pendingSwitchToLogFrom = null;
          this.gotoLogPage();
        }
      }
      // NEW: do nothing special for pageToBase
      this._cluesLastPath = null;
    }

    if (this.tagRules.overlayActive && stRules.done) {
      this.tagRules.overlayActive = false;
      if (this._rulesLastPath === "logToPage") {
        this.rulesHiddenOnRules = true; // keep hidden on Rules after entrance
      } else if (this._rulesLastPath === "pageToLog") {
        if (this._pendingSwitchToLogFrom === "rules") {
          this._pendingSwitchToLogFrom = null;
          this.gotoLogPage();
        }
      }
      // NEW: do nothing special for pageToBase
      this._rulesLastPath = null;
    }

    this.renderNotebookGroup();
  }

  renderNotebookGroup() {
    if (!(this.nbT > 0 || this.nbSlide.active)) return;
    const ySlide = lerp(height, this.notebookY, this.nbT);

    push();
    translate(0, ySlide - this.notebookY);

    // 1) stationary tags behind the book
    // On Log → both visible (ignore hidden flags)
    if (this.currentNotebook === this.notebookLog) {
      if (!this.tagClues.overlayActive) this.tagClues.drawClickable();
      if (!this.tagRules.overlayActive) this.tagRules.drawClickable();
    } else if (this.currentNotebook === this.notebookClues) {
      // Rules visible; Clues visible only if not overlaying and not hidden
      if (!this.tagRules.overlayActive) this.tagRules.drawClickable();
      if (!this.tagClues.overlayActive && !this.cluesHiddenOnClues)
        this.tagClues.drawClickable();
    } else if (this.currentNotebook === this.notebookRules) {
      // Clues visible; Rules visible only if not overlaying and not hidden
      if (!this.tagClues.overlayActive) this.tagClues.drawClickable();
      if (!this.tagRules.overlayActive && !this.rulesHiddenOnRules)
        this.tagRules.drawClickable();
    }

    // 2) active overlay(s) under the book (only current page’s tag animates)
    if (this.tagClues.overlayActive) this.tagClues.drawUnder();
    if (this.tagRules.overlayActive) this.tagRules.drawUnder();

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

    // 4) log button when on Clues/Rules
    if (this.currentNotebook !== this.notebookLog) this.drawLogButtonInGroup();

    pop();
  }

  drawLogButtonInGroup() {
    const { x, y, w, h } = {
      x: this.logBtnX,
      y: this.logBtnY,
      w: this.logBtnW,
      h: this.logBtnH,
    };
    this._logScreenRect = { x, y, w, h };
    push();
    noStroke();
    fill(0, 0, 0, 120);
    rect(x + 3, y + 3, w, h);
    fill(255);
    rect(x, y, w, h);
    textFont(this.userFont);
    textSize(24);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text("log", x + w / 2, y + h / 2);
    pop();
  }

  // visibility for Day0QuizLog
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
    // CLUES tag click (allowed on any page it’s visible)
    if (this._canClickClues() && this.tagClues.hit(mouseX, mouseY)) {
      // Always start overlays BEFORE switching:
      // 1) Clicked tag: entrance L→R (no fade)
      this.tagClues.startLogToPage();
      this.tagClues.overlayActive = true;
      this._cluesLastPath = "logToPage";
      this._pendingSwitchToLogFrom = null;

      // 2) If we were on RULES page, also reverse the RULES tag so it "appears" properly
      if (this.currentNotebook === this.notebookRules) {
        this.tagRules.startPageToBase(); // R→L + fade-in
        this.tagRules.overlayActive = true;
        this._rulesLastPath = "pageToBase"; // <-- NEW path
      }

      // Switch now; the overlays render under the new page
      this.gotoCluesPage();
      // since we left Rules, allow it to be visible on its page next time
      this.rulesHiddenOnRules = false;
      return;
    }

    // RULES tag click (allowed on any page it’s visible)
    if (this._canClickRules() && this.tagRules.hit(mouseX, mouseY)) {
      // 1) Clicked tag: entrance L→R (no fade)
      this.tagRules.startLogToPage();
      this.tagRules.overlayActive = true;
      this._rulesLastPath = "logToPage";
      this._pendingSwitchToLogFrom = null;

      // 2) If we were on CLUES page, also reverse the CLUES tag so it "appears" properly
      if (this.currentNotebook === this.notebookClues) {
        this.tagClues.startPageToBase(); // R→L + fade-in
        this.tagClues.overlayActive = true;
        this._cluesLastPath = "pageToBase"; // <-- NEW path
      }

      // Switch now
      this.gotoRulesPage();
      this.cluesHiddenOnClues = false;
      return;
    }

    // On Clues/Rules → click "log": reverse only that page’s tag, then switch.
    if (this.currentNotebook !== this.notebookLog) {
      const { x, y, w, h } = this._logScreenRect;
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        if (this.currentNotebook === this.notebookClues) {
          this.tagClues.startPageToLog(); // R→L + fade-in
          this.tagClues.overlayActive = true;
          this._cluesLastPath = "pageToLog";
          this._pendingSwitchToLogFrom = "clues";
        } else if (this.currentNotebook === this.notebookRules) {
          this.tagRules.startPageToLog(); // R→L + fade-in
          this.tagRules.overlayActive = true;
          this._rulesLastPath = "pageToLog";
          this._pendingSwitchToLogFrom = "rules";
        }
      }
    }
  }

  // clickability helpers (respect per-page hidden flags)
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

  // page switches
  gotoCluesPage() {
    this.currentNotebook = this.notebookClues;
  }
  gotoRulesPage() {
    this.currentNotebook = this.notebookRules;
  }
  gotoLogPage() {
    this.currentNotebook = this.notebookLog;
    // returning to Log restores both tags
    this.cluesHiddenOnClues = false;
    this.rulesHiddenOnRules = false;
  }

  setQuizState(state) {
    this.quizState = state;
    this.scroll.start(this.yOffset, this.quizState ? 576 : 0);
  }
}
window.Day0Quiz = Day0Quiz;
