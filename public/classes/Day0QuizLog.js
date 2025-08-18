class Day0QuizLog {
  constructor() {
    // Layout
    this.x1 = 135;
    this.y1 = 110;
    this.w1 = 345;
    this.h1 = 450; // left box
    this.x2 = 546;
    this.y2 = 110;
    this.w2 = 345;
    this.h2 = 450; // right box

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
    this.page = 0; // 0-based
    this.pageStarts = [0]; // start wrapped-line index per page
    this._maxLinesPerBox = 0;

    // Buttons (prev / next)
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 };
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 };

    // Background
    this.bg = null;
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
    this.bg = loadImage("assets/bg_quiz_day0_attic_bot.png");
  }

  setup() {
    this._maxLinesPerBox = Math.floor(this.h1 / this.leading);

    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input");

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

  update() {
    if (this.bg) image(this.bg, 0, 0, width, height);
    else background(220);

    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);
    fill(0);
    noStroke();

    const wrapped = this._wrapParagraphs(this.notebookContent, this.w1);
    const capPerPage = this._maxLinesPerBox * 2;

    if (!Number.isInteger(this.pageStarts[this.page])) {
      this.pageStarts[this.page] = wrapped.length;
    }

    const curStart = this.pageStarts[this.page];
    const linesFromCur = wrapped.slice(curStart);

    // If last page is full, start next page at the exact overflow point
    const isLastPage = this.page === this.pageStarts.length - 1;
    if (isLastPage && linesFromCur.length > capPerPage) {
      this.pageStarts.push(curStart + capPerPage);
      this.page = this.pageStarts.length - 1;
    }

    const thisStart = this.pageStarts[this.page];
    const nextStart =
      this.page + 1 < this.pageStarts.length
        ? this.pageStarts[this.page + 1]
        : wrapped.length;
    const curPageLines = wrapped.slice(thisStart, nextStart);

    this._drawColumns(curPageLines);

    if (this.page === this.pageStarts.length - 1) {
      this._positionInput(curPageLines.length);
    } else {
      this.input.hide();
    }

    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;
    if (hasPrev) this._drawNavButton(this.leftBtn, this.page - 1 + 1);
    if (hasNext) this._drawNavButton(this.rightBtn, this.page + 1 + 1);
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

  // --- Helpers ---

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
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      if (
        this.page === this.pageStarts.length - 1 &&
        this.questionCount < this.inputLimit
      ) {
        this.input.show();
      }
    }, 30);
  }

  _snapInput() {
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      if (
        this.page === this.pageStarts.length - 1 &&
        this.questionCount < this.inputLimit
      ) {
        this.input.show();
      }
    }, 30);
  }

  _drawColumns(lines) {
    const cap = this._maxLinesPerBox;
    this._drawLines(lines.slice(0, cap), this.x1, this.y1, this.w1, this.h1);
    this._drawLines(
      lines.slice(cap, cap * 2),
      this.x2,
      this.y2,
      this.w2,
      this.h2
    );
  }

  _drawLines(lines, x, y, w, h) {
    const max = Math.min(Math.floor(h / this.leading), lines.length);
    for (let i = 0; i < max; i++)
      text(lines[i], x, y + i * this.leading, w, this.leading);
  }

  _positionInput(usedLines) {
    if (this._justSubmitted || this.questionCount >= this.inputLimit) {
      this.input.hide();
      return;
    }

    const cap = this._maxLinesPerBox;
    if (usedLines >= cap * 2) {
      this.input.hide();
      return;
    }

    let boxX, boxY, boxW, row;
    if (usedLines < cap) {
      // left
      row = usedLines;
      boxX = this.x1;
      boxY = this.y1;
      boxW = this.w1;
    } else {
      // right
      row = usedLines - cap;
      boxX = this.x2;
      boxY = this.y2;
      boxW = this.w2;
    }

    const w = boxW - 2 * this.inputPaddingX;
    const y = boxY + row * this.leading + (this.leading - this.inputH) / 2;
    const x = boxX + this.inputPaddingX;

    this.input.show();
    this.input.position(x - 15, y - 20); // keep your visual offset
    this.input.size(w, this.inputH);
  }

  _drawNavButton(btn, label1Based) {
    push();
    noStroke();
    fill(255, 255, 255, 230);
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    stroke(0);
    strokeWeight(2);
    noFill();
    rect(btn.x, btn.y, btn.w, btn.h, 8);
    noStroke();
    fill(0);
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
        if (textWidth(test) <= maxWidth) {
          line = test;
        } else {
          if (line) out.push(line);
          if (textWidth(word) > maxWidth) {
            for (const chunk of this._hardBreakWord(word, maxWidth))
              out.push(chunk);
            line = out.pop(); // last chunk continues
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
}
