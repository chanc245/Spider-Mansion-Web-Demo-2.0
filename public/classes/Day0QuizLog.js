class Day0QuizLog {
  constructor() {
    // Background
    this.bg = null;

    // Left & Right boxes
    this.x1 = 135;
    this.y1 = 110;
    this.w1 = 345;
    this.h1 = 450;
    this.x2 = 546;
    this.y2 = 110;
    this.w2 = 345;
    this.h2 = 450;

    // Content (persisted)
    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];

    // Text style
    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // Input (DOM) — positioned on the next available line of the current page
    this.input = null;
    this.inputPaddingX = 5;
    this.inputH = 26;
    this.placeholderBase = "write whatever you want to ask....";

    // Qn counters / flags
    this.questionCount = 0; // how many user Qn's added (limit 20)
    this.inputLimit = 20; // hard cap
    this._justSubmitted = false;

    // Pagination: page 0 is original; we add page starts as content grows
    this.page = 0; // current page index (0-based)
    this.pageStarts = [0]; // wrapped-line start index for each page
    this._maxLinesPerBox = 0; // computed in setup

    // Nav buttons (left = prev/smaller, right = next/bigger)
    this.leftBtn = { x: 105, y: 527, w: 50, h: 50 }; // previous page
    this.rightBtn = { x: 870, y: 527, w: 50, h: 50 }; // next page
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
    this.bg = loadImage("assets/bg_quiz_day0_attic_bot.png");
  }

  setup() {
    // capacity in lines per box
    this._maxLinesPerBox = Math.floor(this.h1 / this.leading);

    // Create input (single-line input; CSS styles via .notebook-input)
    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input");

    // Enter to submit
    this.input.elt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = this.input.value().trim();
        if (val.length > 0) {
          this.addLine(val);
          this.input.value("");

          this._justSubmitted = true;
          this.input.hide();
          setTimeout(() => {
            this._justSubmitted = false;
            if (this.questionCount < this.inputLimit) this.input.show();
          }, 30);
        }
      }
    });
  }

  // Add a new Qn line (respects 20-question limit)
  addLine(text) {
    if (this.questionCount >= this.inputLimit) {
      this.input.attribute("placeholder", "Q limit reached (20).");
      this.input.value("");
      this.input.hide();
      return;
    }
    this.questionCount++;
    const line = `Q${this.questionCount}: ${text}`;
    this.notebookContent.push(line);
    this.input.attribute("placeholder", this._placeholderText());
  }

  update() {
    // Background
    if (this.bg) image(this.bg, 0, 0, width, height);
    else background(220);

    // Draw style
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);
    fill(0);
    noStroke();

    // Wrap ALL content into lines (using left-box width)
    const wrappedLines = this._wrapParagraphs(this.notebookContent, this.w1);
    const pageCapacity = this._maxLinesPerBox * 2;

    // Ensure current page start exists
    if (!Number.isInteger(this.pageStarts[this.page])) {
      this.pageStarts[this.page] = wrappedLines.length;
    }

    // Only create a new page if we're on the LAST page and it's full (>=)
    const isLastPage = this.page === this.pageStarts.length - 1;
    const currentStartIdx = this.pageStarts[this.page];
    const pageLinesFromCurrentStart = wrappedLines.slice(currentStartIdx);
    if (isLastPage && pageLinesFromCurrentStart.length >= pageCapacity) {
      // Start a brand new page that begins after all current lines
      this.pageStarts.push(wrappedLines.length);
      this.page = this.pageStarts.length - 1; // jump to new, clean page
    }

    // Compute lines belonging to the active page (bounded by next page start)
    const curStart = this.pageStarts[this.page];
    const nextStart =
      this.page + 1 < this.pageStarts.length
        ? this.pageStarts[this.page + 1]
        : wrappedLines.length;
    const curPageLines = wrappedLines.slice(curStart, nextStart);

    // Draw page columns (clean page draws nothing until new inputs)
    this._drawColumns(curPageLines);

    // Input positioning / visibility:
    // show input ONLY on the last page (earlier pages are read-only)
    if (this.page === this.pageStarts.length - 1) {
      this._positionInputForCurrentPage(curPageLines.length);
    } else {
      this.input.hide();
    }

    // ---- Navigation buttons (1-based labels) ----
    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;

    // Left button = previous (smaller page number)
    if (hasPrev) {
      this._drawNavButton(
        this.leftBtn.x,
        this.leftBtn.y,
        this.leftBtn.w,
        this.leftBtn.h,
        this.page - 1 + 1 // 1-based label
      );
    }
    // Right button = next (bigger page number)
    if (hasNext) {
      this._drawNavButton(
        this.rightBtn.x,
        this.rightBtn.y,
        this.rightBtn.w,
        this.rightBtn.h,
        this.page + 1 + 1 // 1-based label
      );
    }
  }

  // Handle clicks for nav buttons
  mousePressed() {
    const hasPrev = this.page - 1 >= 0;
    const hasNext = this.page + 1 < this.pageStarts.length;

    // Left button → previous page
    if (
      hasPrev &&
      this._pointInRect(
        mouseX,
        mouseY,
        this.leftBtn.x,
        this.leftBtn.y,
        this.leftBtn.w,
        this.leftBtn.h
      )
    ) {
      this.page -= 1;
      this._snapInput();
      return;
    }

    // Right button → next page
    if (
      hasNext &&
      this._pointInRect(
        mouseX,
        mouseY,
        this.rightBtn.x,
        this.rightBtn.y,
        this.rightBtn.w,
        this.rightBtn.h
      )
    ) {
      this.page += 1;
      this._snapInput();
      return;
    }
  }

  // Small helper to hide/show input so its position updates cleanly
  _snapInput() {
    this._justSubmitted = true;
    this.input.hide();
    setTimeout(() => {
      this._justSubmitted = false;
      // only show if we're on the last page and under the limit
      if (
        this.page === this.pageStarts.length - 1 &&
        this.questionCount < this.inputLimit
      ) {
        this.input.show();
      }
    }, 30);
  }

  // ----- Draw two columns for current page -----
  _drawColumns(linesOnPage) {
    const col1 = linesOnPage.slice(0, this._maxLinesPerBox);
    const col2 = linesOnPage.slice(
      this._maxLinesPerBox,
      this._maxLinesPerBox * 2
    );

    this._drawLines(col1, this.x1, this.y1, this.w1, this.h1);
    this._drawLines(col2, this.x2, this.y2, this.w2, this.h2);
  }

  _drawLines(lines, x, y, w, h) {
    const cap = Math.floor(h / this.leading);
    const drawCount = Math.min(cap, lines.length);
    for (let i = 0; i < drawCount; i++) {
      const ly = y + i * this.leading;
      text(lines[i], x, ly, w, this.leading);
    }
  }

  // ----- Input positioning (left → right for the last page) -----
  _positionInputForCurrentPage(usedLinesOnPage) {
    if (this._justSubmitted) return;

    if (this.questionCount >= this.inputLimit) {
      this.input.hide();
      return;
    }

    const cap = this._maxLinesPerBox;
    if (usedLinesOnPage >= cap * 2) {
      // full (pagination creation handled above), hide as safeguard
      this.input.hide();
      return;
    }

    let boxX, boxY, boxW, row;
    if (usedLinesOnPage < cap) {
      // Left
      row = usedLinesOnPage;
      boxX = this.x1;
      boxY = this.y1;
      boxW = this.w1;
    } else {
      // Right
      row = usedLinesOnPage - cap;
      boxX = this.x2;
      boxY = this.y2;
      boxW = this.w2;
    }

    const colPad = this.inputPaddingX;
    const w = boxW - 2 * colPad;
    const y = boxY + row * this.leading + (this.leading - this.inputH) / 2;
    const x = boxX + colPad;

    this.input.show();
    this.input.position(x - 15, y - 20); // keep your visual offsets
    this.input.size(w, this.inputH);
  }

  // ----- Buttons -----
  _drawNavButton(x, y, w, h, label1Based) {
    push();
    noStroke();
    fill(255, 255, 255, 230);
    rect(x, y, w, h, 8);

    stroke(0);
    strokeWeight(2);
    noFill();
    rect(x, y, w, h, 8);

    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(label1Based, x + w / 2, y + h / 2 + 1);
    pop();
  }

  // ----- Text wrap helpers -----
  _wrapParagraphs(paragraphs, maxWidth) {
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);

    const lines = [];
    paragraphs.forEach((para) => {
      const words = para.split(/\s+/);
      let line = "";

      words.forEach((word) => {
        const test = line.length ? line + " " + word : word;
        if (textWidth(test) <= maxWidth) {
          line = test;
        } else {
          if (line.length) lines.push(line);
          if (textWidth(word) > maxWidth) {
            const pieces = this._hardBreakWord(word, maxWidth);
            pieces.forEach((p, i) => {
              if (i < pieces.length - 1) lines.push(p);
              else line = p;
            });
          } else {
            line = word;
          }
        }
      });

      if (line.length) lines.push(line);
    });

    return lines;
  }

  _hardBreakWord(word, maxWidth) {
    const chars = Array.from(word);
    let chunk = "";
    const out = [];
    chars.forEach((ch) => {
      const test = chunk + ch;
      if (textWidth(test) <= maxWidth) {
        chunk = test;
      } else {
        if (chunk.length) out.push(chunk);
        chunk = ch;
      }
    });
    if (chunk.length) out.push(chunk);
    return out;
  }

  // ----- Utils -----
  _pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  _placeholderText() {
    const next = Math.min(this.questionCount + 1, this.inputLimit);
    return `Q${next}: ${this.placeholderBase}`;
  }
}
