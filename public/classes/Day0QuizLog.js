class Day0QuizLog {
  constructor() {
    // Notebook-relative placements
    this.x1 = 135 - 95;
    this.y1 = 110 - 65;
    this.w1 = 345;
    this.h1 = 450;
    this.x2 = 546 - 95;
    this.y2 = 110 - 65;
    this.w2 = 345;
    this.h2 = 450;

    this.anchorX = 0;
    this.anchorY = 0;

    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];
    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // Input / flow
    this.input = null;
    this.inputH = 26;
    this.inputPaddingX = 5;
    this.placeholderBase = "write whatever you want to ask....";
    this.questionCount = 0;
    this.inputLimit = 20;
    this._justSubmitted = false;
    this.waitingForAI = false;

    // Paging
    this.page = 0;
    this.pageStarts = [0];
    this._maxLinesPerBox = 0;

    // Nav buttons (screen coords)
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 };
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 };

    // Eva
    this.eva = null;

    // Fade state
    this.active = false;
    this.alpha = 0;
    this.fadeFrom = 0;
    this.fadeTo = 0;
    this.fadeStart = 0;
    this.fading = false;

    this.fadeDurPageIn = 220;
    this.fadeDurPageOut = 0;
    this.fadeDurMoveIn = 350;
    this.fadeDurMoveOut = 170;
    this._fadeProfile = "page";

    // Wrap cache
    this._wrapped = [];
    this._wrapVersion = -1; // tracks notebookContent.length
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    this._maxLinesPerBox = Math.floor(this.h1 / this.leading);

    // Eva init
    const setupText =
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner. Who am I?";
    const solutionText =
      "I am a spider, and the house is my web. The guests were bugs that got caught in the web because they couldn’t see the transparent threads while flying.";
    this.eva = new Day0Eva(setupText, solutionText, {
      prefix: "Eva",
      icon: "--",
    });

    // Input
    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input");

    // Enter handler
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

      // user line
      this.questionCount++;
      this.notebookContent.push(`Q${this.questionCount}: ${v}`);
      this._invalidateWrap();
      this.input.value("");
      this.input.attribute("placeholder", this._placeholderText());

      // AI placeholder
      this.waitingForAI = true;
      this._justSubmitted = true;
      this.input.hide();
      const idx =
        this.notebookContent.push(
          `${this.eva.icon}${this.eva.prefix}: (thinking…)`
        ) - 1;
      this._invalidateWrap();

      try {
        const reply = await this.eva.ask(v);
        this.notebookContent[
          idx
        ] = `${this.eva.icon}${this.eva.prefix}: ${reply}`;
        this.notebookContent.push("***");
      } catch (err) {
        this.notebookContent[idx] = `${this.eva.icon}${
          this.eva.prefix
        }: (error) ${err.message || err}`;
      } finally {
        this._invalidateWrap();
        this.waitingForAI = false;
        setTimeout(() => {
          this._justSubmitted = false;
          if (this._canShowInputThisPage()) this.input.show();
        }, 16);
      }
    });

    // start hidden
    this._applyInputOpacity();
    this.input.hide();
  }

  setActive(shouldBeActive, profile = null) {
    if (profile) this._fadeProfile = profile;
    if (shouldBeActive === this.active && !profile) return;

    const wasActive = this.active;
    this.active = shouldBeActive;

    const goingIn = shouldBeActive && !wasActive;
    const dur =
      this._fadeProfile === "move"
        ? goingIn
          ? this.fadeDurMoveIn
          : this.fadeDurMoveOut
        : goingIn
        ? this.fadeDurPageIn
        : this.fadeDurPageOut;

    this.fadeFrom = this.alpha;
    this.fadeTo = shouldBeActive ? 255 : 0;
    this.fadeStart = millis();
    this.fadeDurCurrent = max(1, dur);
    this.fading = true;

    if (!shouldBeActive) this.input.hide();
  }

  render(notebookX = 0, notebookY = 0) {
    this.anchorX = notebookX;
    this.anchorY = notebookY;

    if (this.fading) {
      const t = (millis() - this.fadeStart) / this.fadeDurCurrent;
      const clamped = constrain(t, 0, 1);
      const eased = this._easeInOutCubic(clamped);
      this.alpha = lerp(this.fadeFrom, this.fadeTo, eased);
      if (clamped >= 1) {
        this.fading = false;
        this.alpha = this.fadeTo;
        if (this.alpha >= 254 && this._canShowInputThisPage())
          this.input.show();
      }
      this._applyInputOpacity();
    }

    this._updateAndDraw();
  }

  mousePressed() {
    if (this._hasPrev() && this._hit(this.leftBtn)) {
      this.page--;
      this._snapInput();
      return;
    }
    if (this._hasNext() && this._hit(this.rightBtn)) {
      this.page++;
      this._snapInput();
      return;
    }
  }

  // ---------- internal ----------

  _updateAndDraw() {
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);

    // wrap cache
    if (this._wrapVersion !== this.notebookContent.length) {
      this._wrapped = this._wrapParagraphs(this.notebookContent, this.w1);
      this._wrapVersion = this.notebookContent.length;
    }

    const capPerPage = this._maxLinesPerBox * 2;
    if (!Number.isInteger(this.pageStarts[this.page])) {
      this.pageStarts[this.page] = this._wrapped.length;
    }

    const curStart = this.pageStarts[this.page];
    const linesFromCur = this._wrapped.length - curStart;

    // auto paginate exactly at overflow point
    if (this.page === this.pageStarts.length - 1 && linesFromCur > capPerPage) {
      const overflowStart = curStart + capPerPage;
      if (this.pageStarts[this.pageStarts.length - 1] !== overflowStart) {
        this.pageStarts.push(overflowStart);
      }
      this.page = this.pageStarts.length - 1;
    }

    const thisStart = this.pageStarts[this.page];
    const nextStart =
      this.page + 1 < this.pageStarts.length
        ? this.pageStarts[this.page + 1]
        : this._wrapped.length;
    const curPageLines = this._wrapped.slice(thisStart, nextStart);

    // draw columns
    this._drawColumns(curPageLines, this.alpha);

    // input position
    if (this._canShowInputThisPage()) this._positionInput(curPageLines.length);
    else this.input.hide();

    // nav buttons
    if (this.alpha > 1) {
      if (this._hasPrev())
        this._drawNavButton(this.leftBtn, this.page - 1 + 1, this.alpha);
      if (this._hasNext())
        this._drawNavButton(this.rightBtn, this.page + 1 + 1, this.alpha);
    }
  }

  _invalidateWrap() {
    this._wrapVersion = -1;
  }

  _hasPrev() {
    return this.page > 0;
  }
  _hasNext() {
    return this.page + 1 < this.pageStarts.length;
  }

  _canShowInputThisPage() {
    return (
      this.alpha >= 200 &&
      this.page === this.pageStarts.length - 1 &&
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
    this.input.style("z-index", "10");
  }

  _snapInput() {
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      if (this._canShowInputThisPage()) {
        this.input.show();
        this.input.elt.focus();
      }
    }, 30);
  }

  _drawColumns(lines, alpha) {
    const cap = this._maxLinesPerBox;
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
    for (let i = 0; i < max; i++) {
      text(lines[i], x, y + i * this.leading, w, this.leading);
    }
    pop();
  }

  _positionInput(usedLines) {
    const cap = this._maxLinesPerBox;
    if (usedLines >= cap * 2) {
      this.input.hide();
      return;
    }

    let boxX, boxY, boxW, row;
    if (usedLines < cap) {
      row = usedLines;
      boxX = this.anchorX + this.x1;
      boxY = this.anchorY + this.y1;
      boxW = this.w1;
    } else {
      row = usedLines - cap;
      boxX = this.anchorX + this.x2;
      boxY = this.anchorY + this.y2;
      boxW = this.w2;
    }

    const w = boxW - 2 * this.inputPaddingX + 15;
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

  _wrapParagraphs(paragraphs, maxWidth) {
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    const out = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (textWidth(test) <= maxWidth) line = test;
        else {
          if (line) out.push(line);
          if (textWidth(word) > maxWidth) {
            for (const chunk of this._hardBreakWord(word, maxWidth))
              out.push(chunk);
            line = out.pop();
          } else line = word;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  _hardBreakWord(word, maxWidth) {
    const parts = [];
    let chunk = "";
    for (const ch of Array.from(word)) {
      const test = chunk + ch;
      if (textWidth(test) <= maxWidth) chunk = test;
      else {
        if (chunk) parts.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
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

  _easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}
window.Day0QuizLog = Day0QuizLog;
