// public/classes/Day0QuizLog.js
class Day0QuizLog {
  constructor() {
    // Positions RELATIVE to the notebook top-left (keeping your offsets)
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
    this.waitingForAI = false; // <-- NEW: hold input until reply

    // Paging
    this.page = 0;
    this.pageStarts = [0];
    this._maxLinesPerBox = 0;

    // Nav buttons (screen coords)
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 };
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 };

    // Eva
    this.eva = null;

    // Fade
    this.active = false;
    this.alpha = 0;
    this.fadeFrom = 0;
    this.fadeTo = 0;
    this.fadeStart = 0;
    this.fadeDurIn = 220;
    this.fadeDurOut = 140;
    this.fading = false;
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    this._maxLinesPerBox = Math.floor(this.h1 / this.leading);

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

    // Enter handler → add Q, then ask Eva (keep input hidden until reply)
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

      // Add user's question line
      this.questionCount++;
      this.notebookContent.push(`Q${this.questionCount}: ${v}`);
      this.input.value("");
      this.input.attribute("placeholder", this._placeholderText());

      // Hide input immediately and wait for AI
      this.waitingForAI = true;
      this._justSubmitted = true;
      this.input.hide();

      // placeholder to replace with Eva's reply
      const idx =
        this.notebookContent.push(
          `${this.eva.icon}${this.eva.prefix}: (thinking…)`
        ) - 1;

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
        // allow input to reappear (positioned on next available line)
        this.waitingForAI = false;
        // tiny defer to avoid flicker with the new line measurement
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

  setActive(shouldBeActive) {
    if (shouldBeActive === this.active) return;
    this.active = shouldBeActive;
    this.fadeFrom = this.alpha;
    this.fadeTo = shouldBeActive ? 255 : 0;
    this.fadeStart = millis();
    this.fading = true;
    if (!shouldBeActive) this.input.hide();
  }

  render(notebookX = 0, notebookY = 0) {
    this.anchorX = notebookX;
    this.anchorY = notebookY;

    if (this.fading) {
      const dur =
        this.fadeTo > this.fadeFrom ? this.fadeDurIn : this.fadeDurOut;
      const t = (millis() - this.fadeStart) / dur;
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
    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;

    if (hasPrev && this._hit(this.leftBtn)) {
      this.page--;
      this._snapInput();
      return;
    }
    if (hasNext && this._hit(this.rightBtn)) {
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

    const wrapped = this._wrapParagraphs(this.notebookContent, this.w1);
    const capPerPage = this._maxLinesPerBox * 2;

    if (!Number.isInteger(this.pageStarts[this.page])) {
      this.pageStarts[this.page] = wrapped.length;
    }

    const curStart = this.pageStarts[this.page];
    const linesFromCur = wrapped.slice(curStart);

    // auto paginate exactly at overflow point
    if (
      this.page === this.pageStarts.length - 1 &&
      linesFromCur.length > capPerPage
    ) {
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
        : wrapped.length;
    const curPageLines = wrapped.slice(thisStart, nextStart);

    // draw columns with alpha
    this._drawColumns(curPageLines, this.alpha);

    // input positioning (only when allowed)
    if (this._canShowInputThisPage()) this._positionInput(curPageLines.length);
    else this.input.hide();

    // nav buttons
    if (this.alpha > 1) {
      const hasPrev = this.page - 1 >= 0;
      const hasNext = this.page + 1 < this.pageStarts.length;
      if (hasPrev)
        this._drawNavButton(this.leftBtn, this.page - 1 + 1, this.alpha);
      if (hasNext)
        this._drawNavButton(this.rightBtn, this.page + 1 + 1, this.alpha);
    }
  }

  _canShowInputThisPage() {
    return (
      this.alpha >= 200 &&
      this.page === this.pageStarts.length - 1 &&
      this.questionCount < this.inputLimit &&
      !this._justSubmitted &&
      !this.waitingForAI // <-- NEW: hold until reply arrives
    );
  }

  _applyInputOpacity() {
    if (!this.input) return;
    const op = (this.alpha / 255).toFixed(3);
    this.input.style("opacity", op);
    this.input.style("pointer-events", this.alpha > 200 ? "auto" : "none");
  }

  _snapInput() {
    // used on page flip
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      if (this._canShowInputThisPage()) this.input.show();
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
          } else {
            line = word;
          }
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
