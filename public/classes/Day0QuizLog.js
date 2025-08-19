class Day0QuizLog {
  constructor() {
    // Boxes (with your offsets)
    this.x1 = 135 - 95;
    this.y1 = 110 - 75;
    this.w1 = 345;
    this.h1 = 450;
    this.x2 = 546 - 95;
    this.y2 = 110 - 75;
    this.w2 = 345;
    this.h2 = 450;

    // Content & style
    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];
    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // Input
    this.input = null;
    this.inputH = 26;
    this.inputPaddingX = 5;
    this.placeholderBase = "write whatever you want to ask....";
    this.questionCount = 0;
    this.inputLimit = 20;
    this._justSubmitted = false;

    // Paging
    this.page = 0;
    this.pageStarts = [0];
    this._maxLinesPerBox = 0;

    // Buttons in SCREEN SPACE
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 };
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 };

    // Embedded mode
    this._origin = { x: 0, y: 0 };

    // Fade state
    this._wantActive = false;
    this._alpha = 0; // 0..255
    this._aFrom = 0;
    this._aTo = 0;
    this._aStartMs = 0;
    this._aDurationInMs = 200; // fade-in speed
    this._aDurationOutMs = 100; // fade-out speed (faster)
    this._aDurationMs = this._aDurationInMs;
    this._aAnimating = false;
  }

  setActive(on) {
    const want = !!on;
    if (want === this._wantActive) return;
    this._wantActive = want;
    this._startFade(want ? 255 : 0);
    if (!want && this.input) this.input.hide();
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
  }

  setup() {
    this._maxLinesPerBox = Math.floor(this.h1 / this.leading);

    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input");
    this.input.hide();

    this.input.elt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = this.input.value().trim();
        if (!v) return;
        this._addQuestion(v);
        this.input.value("");
        this._snapInputSoon();
      }
    });
  }

  render(originX = 0, originY = 0) {
    this._origin.x = originX;
    this._origin.y = originY;

    // Animate fade
    if (this._aAnimating) {
      const t = constrain(
        (millis() - this._aStartMs) / this._aDurationMs,
        0,
        1
      );
      const eased = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      this._alpha = lerp(this._aFrom, this._aTo, eased);
      if (t >= 1) this._aAnimating = false;
    }

    // Skip drawing if fully hidden and not animating
    if (!this._aAnimating && this._alpha <= 0.5) {
      this.input.hide();
      return;
    }

    // Text style
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);

    // Wrap + paginate
    const wrapped = this._wrapParagraphs(this.notebookContent, this.w1);
    const capPerPage = this._maxLinesPerBox * 2;
    if (!Number.isInteger(this.pageStarts[this.page])) {
      this.pageStarts[this.page] = wrapped.length;
    }

    const curStart = this.pageStarts[this.page];
    const linesFromCur = wrapped.slice(curStart);
    const isLastPage = this.page === this.pageStarts.length - 1;

    // Auto-create next page when needed
    if (isLastPage && linesFromCur.length > capPerPage) {
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

    // 1) Draw text
    push();
    translate(originX, originY);
    this._drawColumnsAlpha(curPageLines, this._alpha);
    pop();

    // 2) Input (only shows on last page, late in fade-in)
    if (
      this.page === this.pageStarts.length - 1 &&
      this._alpha > 230 &&
      !this._justSubmitted
    ) {
      this._positionInputScreen(curPageLines.length);
      this.input.show();
    } else {
      this.input.hide();
    }

    // 3) Navigation buttons with fade
    this._drawNavsScreenAlpha(this._alpha);
  }

  mousePressed() {
    if (this._alpha < 32) return;

    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;

    if (hasPrev && this._inRect(mouseX, mouseY, this.leftBtn)) {
      this.page--;
      this._snapInput();
      return;
    }
    if (hasNext && this._inRect(mouseX, mouseY, this.rightBtn)) {
      this.page++;
      this._snapInput();
      return;
    }
  }

  // ----- helpers -----
  _startFade(targetAlpha) {
    this._aFrom = this._alpha;
    this._aTo = constrain(targetAlpha, 0, 255);
    this._aDurationMs =
      this._aTo > this._aFrom ? this._aDurationInMs : this._aDurationOutMs;
    this._aStartMs = millis();
    this._aAnimating = true;
  }

  _addQuestion(text) {
    if (this.questionCount >= this.inputLimit) {
      this.input.attribute("placeholder", "Q limit reached (20).");
      this.input.hide();
      return;
    }
    this.questionCount++;
    this.notebookContent.push(`Q${this.questionCount}: ${text}`);
    this.input.attribute("placeholder", this._placeholderText());
  }

  _snapInputSoon() {
    this._snapInput();
  }
  _snapInput() {
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
    }, 30);
  }

  _drawColumnsAlpha(lines, alpha) {
    const cap = this._maxLinesPerBox;
    this._drawLinesAlpha(
      lines.slice(0, cap),
      this.x1,
      this.y1,
      this.w1,
      this.h1,
      alpha
    );
    this._drawLinesAlpha(
      lines.slice(cap, cap * 2),
      this.x2,
      this.y2,
      this.w2,
      this.h2,
      alpha
    );
  }

  _drawLinesAlpha(lines, x, y, w, h, a) {
    const max = Math.min(Math.floor(h / this.leading), lines.length);
    push();
    noStroke();
    fill(0, 0, 0, a);
    textAlign(LEFT, TOP);
    for (let i = 0; i < max; i++)
      text(lines[i], x, y + i * this.leading, w, this.leading);
    pop();
  }

  _drawNavsScreenAlpha(a) {
    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;
    if (hasPrev)
      this._drawNavButtonScreenAlpha(this.leftBtn, this.page - 1 + 1, a);
    if (hasNext)
      this._drawNavButtonScreenAlpha(this.rightBtn, this.page + 1 + 1, a);
  }

  _drawNavButtonScreenAlpha(btn, label1Based, a) {
    push();
    noStroke();
    fill(255, 255, 255, 0.9 * a);
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    stroke(0, a);
    strokeWeight(2);
    noFill();
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    noStroke();
    fill(0, 0, 0, a);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(label1Based, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    pop();
  }

  _positionInputScreen(usedLines) {
    const cap = this._maxLinesPerBox;
    if (usedLines >= cap * 2) {
      this.input.hide();
      return;
    }

    let boxX, boxY, boxW, row;
    if (usedLines < cap) {
      row = usedLines;
      boxX = this.x1;
      boxY = this.y1;
      boxW = this.w1;
    } else {
      row = usedLines - cap;
      boxX = this.x2;
      boxY = this.y2;
      boxW = this.w2;
    }

    const w = boxW - 2 * this.inputPaddingX;
    const yLocal = boxY + row * this.leading + (this.leading - this.inputH) / 2;
    const xLocal = boxX + this.inputPaddingX;
    const sx = this._origin.x + xLocal;
    const sy = this._origin.y + yLocal;

    this.input.position(sx - 15, sy);
    this.input.size(w, this.inputH);
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

  _inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
  _placeholderText() {
    const n = Math.min(this.questionCount + 1, this.inputLimit);
    return `Q${n}: ${this.placeholderBase}`;
  }
}
