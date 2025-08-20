class Day0QuizLog {
  constructor() {
    // positions RELATIVE to the notebook top-left (your adjusted offsets)
    this.x1 = 135 - 95;
    this.y1 = 110 - 65;
    this.w1 = 345;
    this.h1 = 450;
    this.x2 = 546 - 95;
    this.y2 = 110 - 65;
    this.w2 = 345;
    this.h2 = 450;

    // notebook anchor set by render()
    this.anchorX = 0;
    this.anchorY = 0;

    // content & style
    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];
    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // input flow
    this.input = null;
    this.inputH = 26;
    this.inputPaddingX = 5;
    this.placeholderBase = "write whatever you want to ask....";
    this.questionCount = 0;
    this.inputLimit = 20;
    this._justSubmitted = false;
    this.waitingForAI = false;

    // paging
    this.paginator = null; // created in setup
    this.layouter = null; // created in setup

    // nav buttons (screen space)
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 };
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 };

    // Eva
    this.eva = null;

    // fade
    this.active = false;
    this.alpha = 0;
    this.fadeIn = new Tween({ from: 0, to: 255, dur: 220 });
    this.fadeOut = new Tween({ from: 255, to: 0, dur: 140 });
    this.fadingOut = false;
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    const linesPerBox = Math.floor(this.h1 / this.leading);
    this.paginator = new Paginator(linesPerBox, 2);
    this.layouter = new TextLayouter({
      font: this.userFont,
      fontSize: this.fontSize,
      leading: this.leading,
    });

    // Eva puzzle
    const setupText =
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner. Who am I?";
    const solutionText =
      "I am a spider, and the house is my web. The guests were bugs that got caught in the web because they couldn’t see the transparent threads while flying.";
    this.eva = new Day0Eva(setupText, solutionText, {
      prefix: "Eva",
      icon: "--",
    });

    // input
    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input");

    // enter handler
    this.input.elt.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      const v = this.input.value().trim();
      if (!v) return;

      if (this.questionCount >= this.inputLimit) {
        this.input.attribute("placeholder", "Q limit reached (20).");
        this.input.value("");
        this.input.hide();
        return;
      }

      // Add user's question
      this.questionCount++;
      this.notebookContent.push(`Q${this.questionCount}: ${v}`);
      this.input.value("");
      this.input.attribute("placeholder", this._placeholderText());

      // Hide input and wait for AI
      this.waitingForAI = true;
      this._justSubmitted = true;
      this.input.hide();

      // "thinking…" placeholder → replaced by reply
      const idx =
        this.notebookContent.push(`${this.eva.icon}${this.eva.prefix}: (…)`) -
        1;

      try {
        const reply = await this.eva.ask(v);
        this.notebookContent[
          idx
        ] = `${this.eva.icon}${this.eva.prefix}: ${reply}`;
        // add a visible blank line (NBSP) after Eva's reply
        this.notebookContent.push("***");
      } catch (err) {
        this.notebookContent[idx] = `${this.eva.icon}${
          this.eva.prefix
        }: (error) ${err.message || err}`;
      } finally {
        // allow input to reappear on the next available line
        this.waitingForAI = false;
        setTimeout(() => {
          this._justSubmitted = false;
          if (this._canShowInputThisPage()) this.input.show();
        }, 30);
      }
    });

    // start hidden
    this._applyInputOpacity();
    this.input.hide();
  }

  setActive(shouldBeActive) {
    if (shouldBeActive === this.active) return;
    this.active = shouldBeActive;
    if (shouldBeActive) {
      this.fadingOut = false;
      this.fadeIn.start(this.alpha, 255);
    } else {
      this.fadingOut = true;
      this.fadeOut.start(this.alpha, 0);
      this.input.hide();
    }
  }

  render(notebookX = 0, notebookY = 0) {
    this.anchorX = notebookX;
    this.anchorY = notebookY;

    // update fade
    if (this.fadingOut) this.alpha = this.fadeOut.update();
    else this.alpha = this.fadeIn.update();
    this._applyInputOpacity();

    // layout & draw
    this._updateAndDraw();
  }

  mousePressed() {
    if (this.paginator.hasPrev() && this._hit(this.leftBtn)) {
      this.paginator.goPrev();
      this._snapInput();
      return;
    }
    if (this.paginator.hasNext() && this._hit(this.rightBtn)) {
      this.paginator.goNext();
      this._snapInput();
      return;
    }
  }

  // internal
  _updateAndDraw() {
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);

    const wrapped = this.layouter.wrap(this.notebookContent, this.w1);

    this.paginator.ensureCurrentPageIndex(wrapped.length);
    const curStart = this.paginator.pageStarts[this.paginator.page];
    this.paginator.maybeAddPage(curStart, wrapped.length);

    const lines = this.paginator.currentSlice(wrapped);

    // draw columns with alpha
    this._drawColumns(lines, this.alpha);

    // input
    if (this._canShowInputThisPage()) this._positionInput(lines.length);
    else this.input.hide();

    // nav buttons
    if (this.alpha > 1) {
      if (this.paginator.hasPrev())
        this._drawNavButton(
          this.leftBtn,
          this.paginator.page - 1 + 1,
          this.alpha
        );
      if (this.paginator.hasNext())
        this._drawNavButton(
          this.rightBtn,
          this.paginator.page + 1 + 1,
          this.alpha
        );
    }
  }

  _canShowInputThisPage() {
    const onLastPage =
      this.paginator.page === this.paginator.pageStarts.length - 1;
    return (
      this.alpha >= 200 &&
      onLastPage &&
      this.questionCount < this.inputLimit &&
      !this._justSubmitted &&
      !this.waitingForAI
    );
  }

  _applyInputOpacity() {
    if (!this.input) return;
    const op = (this.alpha / 255).toFixed(3);
    this.input.style("opacity", op);
    this.input.style("pointer-events", this.alpha > 200 ? "auto" : "none");
  }

  _snapInput() {
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      if (this._canShowInputThisPage()) this.input.show();
    }, 30);
  }

  _drawColumns(lines, alpha) {
    const cap = this.paginator.linesPerBox;
    this._drawLines(
      lines.slice(0, cap),
      this.anchorX + this.x1,
      this.anchorY + this.y1,
      this.w1,
      this.h1,
      alpha
    );
    this._drawLines(
      lines.slice(cap, cap * 2),
      this.anchorX + this.x2,
      this.anchorY + this.y2,
      this.w2,
      this.h2,
      alpha
    );
  }

  _drawLines(lines, x, y, w, h, alpha) {
    const max = Math.min(Math.floor(h / this.leading), lines.length);
    push();
    noStroke();
    fill(0, 0, 0, alpha);
    for (let i = 0; i < max; i++)
      text(lines[i], x, y + i * this.leading, w, this.leading);
    pop();
  }

  _positionInput(usedLinesOnPage) {
    const cap = this.paginator.linesPerBox;
    if (usedLinesOnPage >= cap * 2) {
      this.input.hide();
      return;
    }

    let boxX, boxY, boxW, row;
    if (usedLinesOnPage < cap) {
      // left column
      row = usedLinesOnPage;
      boxX = this.anchorX + this.x1;
      boxY = this.anchorY + this.y1;
      boxW = this.w1;
    } else {
      // right column
      row = usedLinesOnPage - cap;
      boxX = this.anchorX + this.x2;
      boxY = this.anchorY + this.y2;
      boxW = this.w2;
    }
    const w = boxW - 2 * this.inputPaddingX;
    const y = boxY + row * this.leading + (this.leading - this.inputH) / 2;
    const x = boxX + this.inputPaddingX;

    this.input.show();
    this.input.position(x - 15, y - 20);
    this.input.size(w, this.inputH);
  }

  _drawNavButton(btn, label1Based, alpha) {
    push();
    noStroke();
    fill(255, 255, 255, 230 * (alpha / 255));
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    stroke(0, 0, 0, alpha);
    strokeWeight(2);
    noFill();
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    noStroke();
    fill(0, 0, 0, alpha);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(label1Based, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    pop();
  }

  _hit(btn) {
    return this._inRect(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h);
  }
  _inRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
  _placeholderText() {
    const n = Math.min(this.questionCount + 1, this.inputLimit);
    return `Q${n}: ${this.placeholderBase}`;
  }
}
window.Day0QuizLog = Day0QuizLog;
